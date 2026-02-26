@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>nul

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

echo  This script will guide you through the build process.
echo  Press ENTER to use default values shown in [brackets].
echo.
echo  ----------------------------------------
echo.

:: Hasło dla graczy
set "PASSWORD="
set /p "PASSWORD=Player password [2137]: "
if "%PASSWORD%"=="" set "PASSWORD=2137"

:: Hasło dla MG
set "GM_PASSWORD="
set /p "GM_PASSWORD=Game Master password [admin]: "
if "%GM_PASSWORD%"=="" set "GM_PASSWORD=admin"

:: Ścieżka bazowa
set "BASE_PATH="
set /p "BASE_PATH=Base path [/vtt/room1/]: "
if "%BASE_PATH%"=="" set "BASE_PATH=/vtt/room1/"

:: Język
:ask_language
set "LANGUAGE="
set /p "LANGUAGE=Language (en/pl) [en]: "
if "%LANGUAGE%"=="" set "LANGUAGE=en"
if /i not "%LANGUAGE%"=="en" if /i not "%LANGUAGE%"=="pl" (
    echo   Invalid option. Please enter 'en' or 'pl'.
    goto ask_language
)

:: L5R
:ask_l5r
set "ENABLE_L5R="
set /p "ENABLE_L5R=Enable L5R dice? (true/false) [false]: "
if "%ENABLE_L5R%"=="" set "ENABLE_L5R=false"
if /i not "%ENABLE_L5R%"=="true" if /i not "%ENABLE_L5R%"=="false" (
    echo   Invalid option. Please enter 'true' or 'false'.
    goto ask_l5r
)

:: Allowed origins
set "ALLOWED_ORIGINS="
set /p "ALLOWED_ORIGINS=Allowed origins [*]: "
if "%ALLOWED_ORIGINS%"=="" set "ALLOWED_ORIGINS=*"

echo.
echo  ----------------------------------------
echo.
echo  Configuration summary:
echo    Player password:  %PASSWORD%
echo    GM password:      %GM_PASSWORD%
echo    Base path:        %BASE_PATH%
echo    Language:         %LANGUAGE%
echo    Enable L5R:       %ENABLE_L5R%
echo    Allowed origins:  %ALLOWED_ORIGINS%
echo.
echo  ----------------------------------------
echo.

set "CONFIRM="
set /p "CONFIRM=Proceed with build? (Y/n): "
if /i "%CONFIRM%"=="n" (
    echo.
    echo  Build cancelled.
    pause
    exit /b 0
)

echo.

:: Ustaw teksty na podstawie języka
if /i "%LANGUAGE%"=="pl" (
    set "LOGIN_TITLE=Simple VTT"
    set "LOGIN_SUBTITLE=Wprowadz haslo aby kontynuowac"
    set "LOGIN_PLACEHOLDER=Haslo..."
    set "LOGIN_SUBMIT=Wejdz do gry"
    set "LOGIN_ERROR=Nieprawidlowe haslo!"
    set "LOGIN_GM_CHECKBOX=Jestem Mistrzem Gry"
    set "LOGOUT=Wyloguj"
    set "APP_TITLE=Simple VTT"
) else (
    set "LOGIN_TITLE=Simple VTT"
    set "LOGIN_SUBTITLE=Enter password to continue"
    set "LOGIN_PLACEHOLDER=Password..."
    set "LOGIN_SUBMIT=Enter game"
    set "LOGIN_ERROR=Invalid password!"
    set "LOGIN_GM_CHECKBOX=I'm Game Master"
    set "LOGOUT=Logout"
    set "APP_TITLE=Simple VTT"
)

echo [1/5] Creating build folder...
if exist "build" rmdir /s /q "build"
mkdir "build"
mkdir "build\backend"
mkdir "build\backend\data"
mkdir "build\backend\assets"
mkdir "build\backend\assets\map"
mkdir "build\backend\assets\tokens"
mkdir "build\backend\assets\backgrounds"
mkdir "build\backend\assets\papers"
mkdir "build\assets"

echo [2/5] Configuring frontend...
set "ROOT=%~dp0"
if "!ROOT:~-1!"=="\" set "ROOT=!ROOT:~0,-1!"
if exist "!ROOT!\frontend\.env" (
    ren "!ROOT!\frontend\.env" ".env.devbackup"
)
(
    echo VITE_BASE_PATH=%BASE_PATH%
    echo VITE_API_PATH=backend/api.php
    echo VITE_LANGUAGE=%LANGUAGE%
    echo VITE_ENABLE_L5R=%ENABLE_L5R%
) > "!ROOT!\frontend\.env"

echo [3/5] Building frontend (this may take a while)...
cd /d "!ROOT!\frontend"

if not exist "node_modules" (
    echo [INFO] Installing npm dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed!
        cd /d "!ROOT!"
        call :restore_frontend_env
        pause
        exit /b 1
    )
)

call npm run build
if !errorlevel! neq 0 (
    echo [ERROR] Frontend build failed!
    cd /d "!ROOT!"
    call :restore_frontend_env
    pause
    exit /b 1
)

cd /d "!ROOT!"
call :restore_frontend_env

echo [4/5] Copying files...

:: Kopiuj zbudowane assety (zawierają już L5R jeśli włączone)
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

powershell -Command "'' | Out-File -FilePath 'build\backend\assets\map\.gitkeep' -Encoding ASCII"
powershell -Command "'' | Out-File -FilePath 'build\backend\assets\tokens\.gitkeep' -Encoding ASCII"
powershell -Command "'' | Out-File -FilePath 'build\backend\assets\backgrounds\.gitkeep' -Encoding ASCII"
powershell -Command "'' | Out-File -FilePath 'build\backend\assets\papers\.gitkeep' -Encoding ASCII"
powershell -Command "'' | Out-File -FilePath 'build\backend\data\.gitkeep' -Encoding ASCII"

echo [5/5] Generating index.php...

powershell -ExecutionPolicy Bypass -File "build-helper.ps1" -TemplatePath "index.php.template" -OutputPath "build\index.php" -Password "%PASSWORD%" -GmPassword "%GM_PASSWORD%" -BasePath "%BASE_PATH%" -Lang "%LANGUAGE%" -LoginTitle "%LOGIN_TITLE%" -LoginSubtitle "%LOGIN_SUBTITLE%" -LoginPlaceholder "%LOGIN_PLACEHOLDER%" -LoginSubmit "%LOGIN_SUBMIT%" -LoginError "%LOGIN_ERROR%" -LoginGmCheckbox "%LOGIN_GM_CHECKBOX%" -Logout "%LOGOUT%" -AppTitle "%APP_TITLE%"

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
echo   Configuration used:
echo     Player password: %PASSWORD%
echo     GM password:     %GM_PASSWORD%
echo     Base path:      %BASE_PATH%
echo     Language:       %LANGUAGE%
echo     L5R enabled:    %ENABLE_L5R%
echo.
echo   Next steps:
echo   1. Upload contents of 'build' folder to server
echo      at location: %BASE_PATH%
echo   2. Add images to:
echo      - backend/assets/map/
echo      - backend/assets/tokens/
echo      - backend/assets/backgrounds/
echo      - backend/assets/papers/
echo   3. Ensure backend/data/ folder is writable
echo   4. Open the page and login with your password
echo.
echo  ========================================
echo.

pause
exit /b 0

:restore_frontend_env
set "ROOT=%~dp0"
if "!ROOT:~-1!"=="\" set "ROOT=!ROOT:~0,-1!"
if exist "!ROOT!\frontend\.env.devbackup" (
    del "!ROOT!\frontend\.env" >nul 2>nul
    ren "!ROOT!\frontend\.env.devbackup" ".env"
)
goto :eof