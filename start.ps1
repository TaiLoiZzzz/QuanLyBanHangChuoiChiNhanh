Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   KHOI CHAY TOAN BO DU AN DBMS RETAIL ENTERPRISE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Start Docker SQL Server
Write-Host "`n[1/3] Khoi dong Microsoft SQL Server 2022..." -ForegroundColor Yellow
docker compose up -d

# 2. Check ports
Start-Sleep -Seconds 2

# 3. Start Backend
Write-Host "`n[2/3] Khoi dong Backend Express API (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; node src/server.js"

# 4. Start Frontend React
Write-Host "`n[3/3] Khoi dong Frontend React Vite (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:ComSpec='C:\Windows\System32\cmd.exe'; cd frontend; npm run dev"

Write-Host "`n>>> KHOI CHAY THANH CONG TOAN BO HE THONG! <<<" -ForegroundColor Green
Write-Host "1. Frontend React Dev : http://localhost:5173" -ForegroundColor White
Write-Host "2. Backend Web & API  : http://localhost:5000" -ForegroundColor White
Write-Host "3. SQL Server 2022    : localhost,11433" -ForegroundColor White
