@echo off
echo ========================================
echo AI Attendance Verification System
echo Starting Development Servers
echo ========================================
echo.

REM Start AI Service in new window
echo Starting Python AI Service...
start "AI Service" cmd /k "cd ai-service && venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait for AI service to start
timeout /t 5 /nobreak > nul

REM Start Next.js in new window
echo Starting Next.js Application...
start "Next.js App" cmd /k "npm run dev"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo AI Service:  http://localhost:8000
echo Next.js App: http://localhost:3000
echo API Docs:    http://localhost:8000/docs
echo.
echo Press any key to stop all services...
pause > nul

REM Kill all processes
taskkill /FI "WINDOWTITLE eq AI Service*" /F
taskkill /FI "WINDOWTITLE eq Next.js App*" /F

echo.
echo All services stopped.
pause
