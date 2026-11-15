$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspace = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $workspace 'tmp/android-tools'
$sdkRoot = Join-Path $toolsRoot 'sdk'
$jdkRoot = Join-Path $toolsRoot 'jdk'
New-Item -ItemType Directory -Force $toolsRoot, $sdkRoot, $jdkRoot | Out-Null

function Get-VerifiedArchive($Uri, $Destination, $Checksum) {
    if (Test-Path -LiteralPath $Destination) {
        if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -eq $Checksum) { return }
    }
    Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $Destination
    if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -ne $Checksum) {
        throw "Checksum mismatch: $Destination"
    }
}

if (-not (Get-ChildItem -LiteralPath $jdkRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'bin/java.exe') })) {
    Write-Output 'Downloading verified Temurin JDK 21 from Adoptium...'
    $releases = Invoke-RestMethod -Uri 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    $package = $releases[0].binary.package
    $jdkArchive = Join-Path $toolsRoot 'jdk-21.zip'
    Get-VerifiedArchive $package.link $jdkArchive $package.checksum
    Expand-Archive -LiteralPath $jdkArchive -DestinationPath $jdkRoot -Force
}
$env:JAVA_HOME = (Get-ChildItem -LiteralPath $jdkRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'bin/java.exe') } | Select-Object -First 1).FullName
$env:ANDROID_HOME = $sdkRoot
$env:PATH = "$env:JAVA_HOME/bin;$sdkRoot/platform-tools;$env:PATH"
$sdkManager = Join-Path $sdkRoot 'cmdline-tools/19.0/bin/sdkmanager.bat'
if (-not (Test-Path -LiteralPath $sdkManager)) {
    Write-Output 'Downloading verified Android command-line tools from Google...'
    [xml]$repository = (Invoke-WebRequest -UseBasicParsing -Uri 'https://dl.google.com/android/repository/repository2-1.xml').Content
    $commandTools = $repository.SelectSingleNode("//*[local-name()='remotePackage' and @path='cmdline-tools;19.0']")
    $archive = $commandTools.SelectSingleNode(".//*[local-name()='archive'][*[local-name()='host-os']='windows']/*[local-name()='complete']")
    $url = $archive.SelectSingleNode("*[local-name()='url']").InnerText
    $checksum = $archive.SelectSingleNode("*[local-name()='checksum']")
    $toolsArchive = Join-Path $toolsRoot 'command-line-tools.zip'
    Invoke-WebRequest -UseBasicParsing -Uri "https://dl.google.com/android/repository/$url" -OutFile $toolsArchive
    $algorithm = if ($checksum.GetAttribute('type') -eq 'sha256') { 'SHA256' } else { 'SHA1' }
    if ((Get-FileHash -LiteralPath $toolsArchive -Algorithm $algorithm).Hash -ne $checksum.InnerText) { throw 'Android tools checksum mismatch.' }
    $extracted = Join-Path $toolsRoot 'command-line-extracted'
    Expand-Archive -LiteralPath $toolsArchive -DestinationPath $extracted -Force
    $latest = Join-Path $sdkRoot 'cmdline-tools/19.0'
    New-Item -ItemType Directory -Force $latest | Out-Null
    Copy-Item -Path "$extracted/cmdline-tools/*" -Destination $latest -Recurse -Force
}
Write-Output 'Accepting Android SDK licenses and installing API 36, build tools, and adb...'
(1..100 | ForEach-Object { 'y' }) | & $sdkManager "--sdk_root=$sdkRoot" --licenses
if ($LASTEXITCODE -ne 0) { throw 'Android SDK license setup failed.' }
& $sdkManager "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;35.0.0'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK installation failed.' }
foreach ($requiredFile in @('platforms/android-36/android.jar', 'build-tools/35.0.0/aapt2.exe', 'platform-tools/adb.exe')) {
    if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot $requiredFile))) { throw "Missing Android SDK component: $requiredFile" }
}
$sdkProperty = $sdkRoot.Replace('\', '/')
[System.IO.File]::WriteAllText((Join-Path $workspace 'android/local.properties'), "sdk.dir=$sdkProperty`n")
Write-Output "Android tools ready in $toolsRoot"
