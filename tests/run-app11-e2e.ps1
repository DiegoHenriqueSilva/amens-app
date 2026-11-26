$ErrorActionPreference = "Stop"
Set-Location "C:\projeto\amens-app - Copia"

$process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx vite preview --port 8081" -WorkingDirectory "C:\projeto\amens-app - Copia" -PassThru
try {
    Start-Sleep -Seconds 4
    node tests/app11-final.e2e.mjs
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        # Kill any lingering node preview processes
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}
