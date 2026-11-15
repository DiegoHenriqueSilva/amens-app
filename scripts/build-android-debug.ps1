param([switch]$UsePreparedWebBuild)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $workspace 'tmp/android-tools'
$jdkRoot = Join-Path $toolsRoot 'jdk'
if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath $jdkRoot)) {
    $env:JAVA_HOME = (Get-ChildItem -LiteralPath $jdkRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'bin/java.exe') } | Select-Object -First 1).FullName
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath (Join-Path $toolsRoot 'sdk'))) {
    $env:ANDROID_HOME = Join-Path $toolsRoot 'sdk'
}
if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) { throw 'Install Android tools first with scripts/setup-android.ps1 or configure JAVA_HOME and ANDROID_HOME.' }
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
$env:GRADLE_USER_HOME = Join-Path $toolsRoot 'gradle-cache'
Push-Location $workspace
try {
    # Avoid registering Firebase before this Android installation is configured.
    $firebaseConfig = Join-Path $workspace 'android/app/google-services.json'
    $env:VITE_ANDROID_PUSH_ENABLED = 'false'
    if (Test-Path -LiteralPath $firebaseConfig) {
        $firebase = Get-Content -LiteralPath $firebaseConfig -Raw | ConvertFrom-Json
        $matchingClient = $firebase.client | Where-Object { $_.client_info.android_client_info.package_name -eq 'com.amens.app' }
        if (-not $firebase.project_info.project_id -or -not $matchingClient) { throw 'Firebase configuration does not contain the Android app com.amens.app.' }
        $env:VITE_ANDROID_PUSH_ENABLED = 'true'
    }
    if ($UsePreparedWebBuild) {
        if (-not (Test-Path -LiteralPath 'dist/index.html') -or -not (Test-Path -LiteralPath 'tmp/ota/prepared.json')) { throw 'Prepare the signed production release first.' }
        & node scripts/check-prepared-web.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Prepared web release verification failed.' }
    } else {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    }
    & "$workspace/node_modules/.bin/cap.cmd" sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
    # The update ZIP is hosted separately and must not be duplicated inside the APK.
    $copiedUpdates = Join-Path $workspace 'android/app/src/main/assets/public/app-updates'
    if (Test-Path -LiteralPath $copiedUpdates) {
        $resolvedUpdates = (Resolve-Path -LiteralPath $copiedUpdates).Path
        $expectedUpdates = [System.IO.Path]::GetFullPath($copiedUpdates)
        if ($resolvedUpdates -ne $expectedUpdates -or -not $resolvedUpdates.StartsWith([System.IO.Path]::GetFullPath($workspace) + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe generated update directory.' }
        if ((Get-Item -LiteralPath $resolvedUpdates).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Unexpected symlink in generated update directory.' }
        Remove-Item -LiteralPath $resolvedUpdates -Recurse -Force
    }
    Push-Location (Join-Path $workspace 'android')
    try {
        & './gradlew.bat' assembleDebug --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    } finally { Pop-Location }
    Write-Output "APK: $workspace/android/app/build/outputs/apk/debug/app-debug.apk"
} finally { Pop-Location }
