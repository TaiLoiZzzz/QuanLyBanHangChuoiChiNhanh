$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path 'backend/.env')) { throw 'Copy backend/.env.example to backend/.env and set your passwords first.' }
& docker compose --env-file backend/.env up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'SQL Server did not become healthy. Check docker compose logs.' }
& node scripts/database.cjs migrate
if ($LASTEXITCODE -ne 0) { throw 'Migration failed or DB is not initialized. For a NEW DB run npm run db:init; check the error before retrying.' }
& npm run frontend:build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
Write-Host 'Starting web and API on http://localhost:5000 (Ctrl+C to stop)'
& node backend/src/server.js
if ($LASTEXITCODE -ne 0) { throw 'Backend failed to start. Check backend/.env and ports.' }
