$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspace = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $workspace 'node_modules/.bin/supabase.cmd'
$queryFile = Join-Path $workspace 'tmp/push-deployment/check.sql'
New-Item -ItemType Directory -Force (Split-Path -Parent $queryFile) | Out-Null
Push-Location $workspace
try {
    $projectRef = (& node -e "import('vite').then(({loadEnv})=>console.log(new URL(loadEnv('production',process.cwd(),'VITE_').VITE_SUPABASE_URL).hostname.split('.')[0]))").Trim()
    if ($LASTEXITCODE -ne 0 -or $projectRef -notmatch '^[a-z]{20}$') { throw 'Invalid Supabase project reference.' }
    function Query([string]$Sql) {
        [System.IO.File]::WriteAllText($queryFile, $Sql, (New-Object System.Text.UTF8Encoding($false)))
        $result = & $cli db query --linked --project-ref $projectRef --output json --file $queryFile
        if ($LASTEXITCODE -ne 0) { throw 'Database verification failed.' }
        return (($result -join "`n") | ConvertFrom-Json).rows
    }
    $probeSql = @'
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'amens_push_function_url'),
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-webhook-secret',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'amens_push_webhook_secret')),
  body := '{"action":"check_configuration"}'::jsonb,
  timeout_milliseconds := 30000
) AS request_id;
'@
    $probe = Query $probeSql
    $id = [long]$probe.request_id
    $response = $null
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        $response = Query "select status_code, timed_out, content from net._http_response where id = $id;"
        if ($response) { break }
        Start-Sleep -Seconds 1
    }
    if (-not $response) { throw 'The asynchronous database request did not return in time.' }
    if ($response.timed_out) { throw 'The asynchronous function request timed out.' }
    $body = $response.content | ConvertFrom-Json
    if ($response.status_code -ne 200) {
        # This endpoint returns configuration status only, never credentials.
        Write-Output ($body | ConvertTo-Json -Compress)
        throw "Configuration check returned HTTP $($response.status_code)."
    }
    $firebase = Get-Content -LiteralPath 'android/app/google-services.json' -Raw | ConvertFrom-Json
    if (-not $body.configured -or -not $body.database_ready -or -not $body.fcm_api_ready -or $body.firebase_project -ne $firebase.project_info.project_id) {
        throw 'The deployed function is not ready for this Firebase project.'
    }
    Write-Output 'Database HTTP queue -> authenticated Edge Function -> Firebase validation-only API: OK'
    $unauthorizedStatus = 0
    try {
        $null = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "https://$projectRef.supabase.co/functions/v1/send-native-push" -ContentType 'application/json' -Body '{}' -TimeoutSec 20
    } catch {
        if ($_.Exception.Response) { $unauthorizedStatus = [int]$_.Exception.Response.StatusCode }
    }
    if ($unauthorizedStatus -ne 401) { throw 'The function did not reject an unauthenticated request as expected.' }
    Write-Output 'Unauthenticated request rejected with HTTP 401: OK'
    $state = Query "select c.relrowsecurity as devices_rls, (select count(*) from public.push_devices)::int as registered_devices, exists(select 1 from pg_trigger where tgname='amens_native_push_on_insert' and tgrelid='public.notifications'::regclass and tgenabled='O') as trigger_enabled from pg_class c where c.oid='public.push_devices'::regclass;"
    if (-not $state.devices_rls -or -not $state.trigger_enabled) { throw 'Device privacy policy or notification trigger is disabled.' }
    Write-Output "Device privacy policy and trigger: OK. Registered Android devices: $($state.registered_devices)."
} finally {
    if (Test-Path -LiteralPath $queryFile) { Remove-Item -LiteralPath $queryFile -Force }
    Pop-Location
}
