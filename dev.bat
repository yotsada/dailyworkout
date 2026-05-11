@echo off
echo Starting Daily Workout Dev Server...
start "Backend :3000" cmd /k "cd /d %~dp0backend && npm run start:dev"
start "Frontend :3001" cmd /k "cd /d %~dp0frontend && npm run dev -- -p 3001"
echo.
echo Backend  : http://localhost:3000
echo Frontend : http://localhost:3001
