@echo off
echo ============================================
echo  Employee Record System - Starting Up
echo ============================================
echo.

echo [1/3] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo.
echo [2/3] Installing dependencies...
pip install flask flask-cors pymongo python-dotenv --quiet
if %errorlevel% neq 0 (
    echo ERROR: Failed to install packages.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Flask server...
echo.
echo ============================================
echo  App running at: http://127.0.0.1:5000
echo  Press CTRL+C to stop
echo ============================================
echo.
python app.py
pause
