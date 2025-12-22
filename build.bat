@echo off
setlocal enabledelayedexpansion

:: ============================================
:: Simple VTT - Build Script
:: ============================================

echo.
echo  ========================================
echo   Simple VTT - Build Script
echo  ========================================
echo.

:: Sprawdź czy Node.js jest zainstalowany
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Parametry
set "PASSWORD=%~1"
set "BASE_PATH=%~2"
set "LANGUAGE=%~3"
set "ALLOWED_ORIGINS=%~4"

:: Domyślne wartości
if "%PASSWORD%"=="" set "PASSWORD=2137"
if "%BASE_PATH%"=="" set "BASE_PATH=/vtt/room1/"
if "%LANGUAGE%"=="" set "LANGUAGE=en"
if "%ALLOWED_ORIGINS%"=="" set "ALLOWED_ORIGINS=*"

echo [INFO] Password: %PASSWORD%
echo [INFO] Base path: %BASE_PATH%
echo [INFO] Language: %LANGUAGE%
echo [INFO] Allowed origins: %ALLOWED_ORIGINS%

:: Ustaw teksty na podstawie języka
if "%LANGUAGE%"=="pl" (
    set "LOGIN_TITLE=Simple VTT"
    set "LOGIN_SUBTITLE=Wprowadz haslo aby kontynuowac"
    set "LOGIN_PLACEHOLDER=Haslo..."
    set "LOGIN_SUBMIT=Wejdz do gry"
    set "LOGIN_ERROR=Nieprawidlowe haslo!"
    set "LOGOUT=Wyloguj"
    set "APP_TITLE=Simple VTT"
) else (
    set "LOGIN_TITLE=Simple VTT"
    set "LOGIN_SUBTITLE=Enter password to continue"
    set "LOGIN_PLACEHOLDER=Password..."
    set "LOGIN_SUBMIT=Enter game"
    set "LOGIN_ERROR=Invalid password!"
    set "LOGOUT=Logout"
    set "APP_TITLE=Simple VTT"
)

echo.
echo [1/5] Creating build folder...
if exist "build" rmdir /s /q "build"
mkdir "build"
mkdir "build\backend"
mkdir "build\backend\data"
mkdir "build\backend\assets"
mkdir "build\backend\assets\map"
mkdir "build\backend\assets\tokens"
mkdir "build\backend\assets\backgrounds"
mkdir "build\assets"

echo [2/5] Configuring frontend...
(
    echo VITE_BASE_PATH=%BASE_PATH%
    echo VITE_API_PATH=backend/api.php
    echo VITE_LANGUAGE=%LANGUAGE%
) > "frontend\.env"

echo [3/5] Building frontend (this may take a while)...
cd frontend

if not exist "node_modules" (
    echo [INFO] Installing npm dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed!
        cd ..
        pause
        exit /b 1
    )
)

call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    cd ..
    pause
    exit /b 1
)

cd ..

echo [4/5] Copying files...

xcopy /s /y "frontend\dist\assets\*" "build\assets\" >nul 2>nul

copy /y "backend\api.php" "build\backend\" >nul

(
    echo ^<FilesMatch "^\.env"^>
    echo     Order Allow,Deny
    echo     Deny from all
    echo ^</FilesMatch^>
    echo.
    echo ^<FilesMatch "state\.json$^|rolls\.json$"^>
    echo     Order Allow,Deny
    echo     Deny from all
    echo ^</FilesMatch^>
    echo.
    echo Options -Indexes
) > "build\backend\.htaccess"

(
    echo Order Allow,Deny
    echo Deny from all
) > "build\backend\data\.htaccess"

(
    echo ALLOWED_ORIGINS=%ALLOWED_ORIGINS%
) > "build\backend\.env"

echo. > "build\backend\assets\map\.gitkeep"
echo. > "build\backend\assets\tokens\.gitkeep"
echo. > "build\backend\assets\backgrounds\.gitkeep"
echo. > "build\backend\data\.gitkeep"

echo [5/5] Generating index.php...

:: Wywołaj skrypt PowerShell z parametrami
powershell -ExecutionPolicy Bypass -File "build-helper.ps1" -TemplatePath "index.php.template" -OutputPath "build\index.php" -Password "%PASSWORD%" -BasePath "%BASE_PATH%" -Lang "%LANGUAGE%" -LoginTitle "%LOGIN_TITLE%" -LoginSubtitle "%LOGIN_SUBTITLE%" -LoginPlaceholder "%LOGIN_PLACEHOLDER%" -LoginSubmit "%LOGIN_SUBMIT%" -LoginError "%LOGIN_ERROR%" -Logout "%LOGOUT%" -AppTitle "%APP_TITLE%"

if %errorlevel% neq 0 (
    echo [ERROR] Generating index.php failed!
    pause
    exit /b 1
)

(
    echo Options -Indexes
) > "build\.htaccess"

echo.
echo  ========================================
echo   BUILD COMPLETE!
echo  ========================================
echo.
echo   The 'build' folder contains the package.
echo.
echo   Usage:
echo   1. Upload contents of 'build' folder to server
echo      at location: %BASE_PATH%
echo   2. Add images to:
echo      - backend/assets/map/ (map elements)
echo      - backend/assets/tokens/ (tokens)
echo      - backend/assets/backgrounds/ (map backgrounds)
echo   3. Make sure backend/data/ folder is writable
echo   4. Open the page and login with: %PASSWORD%
echo.
echo  ========================================
echo.

pause