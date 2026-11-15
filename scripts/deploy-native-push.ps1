$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspace = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $workspace 'node_modules/.bin/supabase.cmd'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$tempRoot = Join-Path $workspace 'tmp/push-deployment'
New-Item -ItemType Directory -Force $tempRoot | Out-Null
$secretFile = Join-Path $tempRoot 'webhook.env'
$sqlFile = Join-Path $tempRoot 'vault-setup.sql'

function Run-Supabase([string[]]$Arguments) {
    $result = & $cli @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Supabase operation failed; review the command status above.' }
    return ($result -join "`n")
}
function Query([string]$Sql) {
    $result = Run-Supabase @('db','query','--linked','--project-ref',$projectRef,'--output','json',$Sql)
    return ($result | ConvertFrom-Json).rows
}

Push-Location $workspace
try {
    $projectRef = (& node -e "import('vite').then(({loadEnv})=>console.log(new URL(loadEnv('production',process.cwd(),'VITE_').VITE_SUPABASE_URL).hostname.split('.')[0]))").Trim()
    if ($LASTEXITCODE -ne 0 -or $projectRef -notmatch '^[a-z]{20}$') { throw 'Invalid Supabase project in the production build configuration.' }
    $firebase = Get-Content -LiteralPath (Join-Path $workspace 'android/app/google-services.json') -Raw | ConvertFrom-Json
    if (-not ($firebase.client | Where-Object { $_.client_info.android_client_info.package_name -eq 'com.amens.app' })) { throw 'Firebase Android package mismatch.' }
    $secrets = (Run-Supabase @('secrets','list','--project-ref',$projectRef,'--output','json')) | ConvertFrom-Json
    if (-not ($secrets | Where-Object name -eq 'FIREBASE_SERVICE_ACCOUNT')) { throw 'Set FIREBASE_SERVICE_ACCOUNT in the target project first.' }
    Write-Output "Preparing native push in Supabase project $projectRef"
    $state = Query "select to_regclass('public.push_devices') is not null as devices_exists;"
    if (-not $state.devices_exists) {
        $null = Run-Supabase @('db','query','--linked','--project-ref',$projectRef,'--file',(Join-Path $workspace 'supabase/migrations/20261106000000_native_push_devices.sql'),'--output','json')
    }
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    $webhookSecret = [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
    [System.IO.File]::WriteAllText($secretFile, "PUSH_WEBHOOK_SECRET=$webhookSecret`n", $utf8)
    $null = Run-Supabase @('secrets','set','--project-ref',$projectRef,'--env-file',$secretFile)
    Write-Output 'Publishing the native push function...'
    $null = Run-Supabase @('functions','deploy','send-native-push','--project-ref',$projectRef,'--use-api','--no-verify-jwt')

    $functionUrl = "https://$projectRef.supabase.co/functions/v1/send-native-push"
    $headers = @{ 'x-push-webhook-secret' = $webhookSecret }
    $check = Invoke-RestMethod -Method Post -Uri $functionUrl -Headers $headers -ContentType 'application/json' -Body '{"action":"check_configuration"}' -TimeoutSec 45
    if (-not $check.configured -or -not $check.database_ready -or -not $check.fcm_api_ready -or $check.firebase_project -ne $firebase.project_info.project_id) {
        throw 'Firebase or Supabase configuration check failed; the trigger was not enabled.'
    }
    Write-Output 'Firebase credential and database access verified without sending messages.'
    # Secret values are encrypted in Vault, not embedded in the trigger definition.
    $vaultSql = @'
DO $setup$
DECLARE secret_id uuid;
BEGIN
  SELECT id INTO secret_id FROM vault.secrets WHERE name = 'amens_push_webhook_secret';
  IF secret_id IS NULL THEN
    PERFORM vault.create_secret('__WEBHOOK_SECRET__', 'amens_push_webhook_secret');
  ELSE
    PERFORM vault.update_secret(secret_id, '__WEBHOOK_SECRET__');
  END IF;
  SELECT id INTO secret_id FROM vault.secrets WHERE name = 'amens_push_function_url';
  IF secret_id IS NULL THEN
    PERFORM vault.create_secret('__FUNCTION_URL__', 'amens_push_function_url');
  ELSE
    PERFORM vault.update_secret(secret_id, '__FUNCTION_URL__');
  END IF;
END;
$setup$;
'@
    $vaultSql = $vaultSql.Replace('__WEBHOOK_SECRET__', $webhookSecret).Replace('__FUNCTION_URL__', $functionUrl)
    [System.IO.File]::WriteAllText($sqlFile, $vaultSql, $utf8)
    # Capture failures without echoing SQL that contains the shared secret.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $null = & $cli db query --linked --project-ref $projectRef --file $sqlFile --output json 2>&1
    $vaultExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference
    if ($vaultExitCode -ne 0) { throw 'Vault setup failed. The secret SQL was suppressed from output.' }
    $null = Run-Supabase @('db','query','--linked','--project-ref',$projectRef,'--file',(Join-Path $workspace 'supabase/migrations/20261106010000_native_push_trigger.sql'),'--output','json')
    $state = Query "select c.relrowsecurity as devices_rls, exists(select 1 from pg_trigger where tgname='amens_native_push_on_insert' and tgrelid='public.notifications'::regclass and tgenabled='O') as trigger_enabled from pg_class c where c.oid='public.push_devices'::regclass;"
    if (-not $state.devices_rls -or -not $state.trigger_enabled) { throw 'Push database verification failed.' }
    Write-Output 'Native push deployed: function healthy, device RLS enabled, notification trigger enabled.'
} finally {
    # Remove only these known temporary files; retain no webhook credential locally.
    if (Test-Path -LiteralPath $secretFile) { Remove-Item -LiteralPath $secretFile -Force }
    if (Test-Path -LiteralPath $sqlFile) { Remove-Item -LiteralPath $sqlFile -Force }
    Pop-Location
}
