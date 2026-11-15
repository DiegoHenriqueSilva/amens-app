param([string]$RollbackRelease = '')
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
Push-Location $workspace
try {
    if ($RollbackRelease) {
        & node scripts/prepare-production.mjs --rollback $RollbackRelease
    } else {
        & node scripts/check-android-backend.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Production backend verification failed.' }
        & node scripts/prepare-production.mjs
    }
    if ($LASTEXITCODE -ne 0) { throw 'Signed production release preparation failed.' }
    & npx.cmd --yes vercel@65.1.0 deploy --prebuilt --prod --yes --scope diegohenriquesilvas-projects
    if ($LASTEXITCODE -ne 0) { throw 'Production deployment failed.' }
    & node scripts/verify-production.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Production deployment verification failed.' }
} finally { Pop-Location }
