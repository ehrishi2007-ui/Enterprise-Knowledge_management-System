@echo off
title EKMS Backend Server
echo ===================================================
echo Starting EKMS Backend Server on http://127.0.0.1:8008
echo ===================================================
cd /d "%~dp0backend"
if exist "..\.venv\Scripts\uvicorn.exe" (
    "..\.venv\Scripts\uvicorn.exe" app.main:app --host 127.0.0.1 --port 8008 --reload
) else (
    uvicorn app.main:app --host 127.0.0.1 --port 8008 --reload
)
pause
