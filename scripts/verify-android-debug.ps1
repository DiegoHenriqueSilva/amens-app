param([ValidatePattern('^[A-Za-z0-9_.-]+\.apk$')][string]$OutputName = 'Amens-teste.apk')
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $workspace 'tmp/android-tools'
$jdkRoot = Join-Path $toolsRoot 'jdk'
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = (Get-ChildItem -LiteralPath $jdkRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'bin/java.exe') } | Select-Object -First 1).FullName
}
$apk = Join-Path $workspace 'android/app/build/outputs/apk/debug/app-debug.apk'
$buildTools = Join-Path $toolsRoot 'sdk/build-tools/35.0.0'
& "$buildTools/apksigner.bat" verify --verbose $apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
$badging = & "$buildTools/aapt2.exe" dump badging $apk
if ($LASTEXITCODE -ne 0) { throw 'APK metadata inspection failed.' }
if (-not ($badging | Select-String "package: name='com.amens.app'")) { throw 'Unexpected APK application ID.' }
$manifest = & "$buildTools/aapt2.exe" dump xmltree $apk --file AndroidManifest.xml
if ($LASTEXITCODE -ne 0) { throw 'APK manifest inspection failed.' }
foreach ($value in @('com.amens.app', '/callback', 'BROWSABLE')) {
    if (-not ($manifest | Select-String -SimpleMatch $value)) { throw "Missing authentication intent value: $value" }
}
$output = Join-Path $workspace "tmp/$OutputName"
$previousApk = Join-Path $workspace 'tmp/Amens-teste.apk'
if ($OutputName -ne 'Amens-teste.apk' -and (Test-Path -LiteralPath $previousApk)) {
    $currentCertificate = (& "$buildTools/apksigner.bat" verify --print-certs $apk) | Select-String '^Signer #1 certificate SHA-256 digest:'
    if ($LASTEXITCODE -ne 0 -or -not $currentCertificate) { throw 'Could not read the new APK signing certificate.' }
    $previousCertificate = (& "$buildTools/apksigner.bat" verify --print-certs $previousApk) | Select-String '^Signer #1 certificate SHA-256 digest:'
    if ($LASTEXITCODE -ne 0 -or -not $previousCertificate -or $currentCertificate.Line -ne $previousCertificate.Line) { throw 'APK signing certificates differ; an in-place update is not verified.' }
    Write-Output 'Signing certificate matches the original test APK: in-place update supported.'
}
Copy-Item -LiteralPath $apk -Destination $output -Force
$badging | Select-String "^package:|^sdkVersion:|^targetSdkVersion:|^application-label:"
Get-Item -LiteralPath $output | Select-Object FullName, Length
Get-FileHash -LiteralPath $output -Algorithm SHA256
