@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   TUS Classroom Plus Web App (Next.js + Firestore Backend)
echo   กำลังเปิดเซิร์ฟเวอร์ที่ http://localhost:3000 ...
echo ============================================================
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
npm run dev
pause
