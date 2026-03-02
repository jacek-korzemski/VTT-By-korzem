@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>nul

echo.
echo  ========================================
echo   FreeRoll VTT - Skrypt budowania (PL)
echo  ========================================
echo.

:: Sprawdzenie czy Node.js jest zainstalowany
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [BLAD] Node.js nie jest zainstalowany!
    echo Pobierz z: https://nodejs.org/
    pause
    exit /b 1
)

echo  Ten skrypt przeprowadzi Cię przez proces budowania paczki.
echo  Nacisnij ENTER aby uzyc wartosci domyslnych podanych w [nawiasach].
echo.
echo  ----------------------------------------
echo.

:: Haslo dla graczy
set "PASSWORD="
set /p "PASSWORD=Haslo gracza [2137]: "
if "%PASSWORD%"=="" set "PASSWORD=2137"

:: Haslo dla MG
set "GM_PASSWORD="
set /p "GM_PASSWORD=Haslo Mistrza Gry [admin]: "
if "%GM_PASSWORD%"=="" set "GM_PASSWORD=admin"

:: Sciezka bazowa
set "BASE_PATH="
set /p "BASE_PATH=Sciezka bazowa [/vtt/room1/]: "
if "%BASE_PATH%"=="" set "BASE_PATH=/vtt/room1/"

:: Jezyk interfejsu
:ask_language
set "LANGUAGE="
set /p "LANGUAGE=Jezyk interfejsu (en/pl) [pl]: "
if "%LANGUAGE%"=="" set "LANGUAGE=pl"
if /i not "%LANGUAGE%"=="en" if /i not "%LANGUAGE%"=="pl" (
    echo   Nieprawidlowa opcja. Wpisz 'en' lub 'pl'.
    goto ask_language
)

:: Modol L5R
:ask_l5r
set "ENABLE_L5R="
set /p "ENABLE_L5R=Wlaczyc kostki L5R? (true/false) [false]: "
if "%ENABLE_L5R%"=="" set "ENABLE_L5R=false"
if /i not "%ENABLE_L5R%"=="true" if /i not "%ENABLE_L5R%"=="false" (
    echo   Nieprawidlowa opcja. Wpisz 'true' lub 'false'.
    goto ask_l5r
)

:: Dozwolone zrodla (CORS)
set "ALLOWED_ORIGINS="
set /p "ALLOWED_ORIGINS=Dozwolone originy (CORS) [*]: "
if "%ALLOWED_ORIGINS%"=="" set "ALLOWED_ORIGINS=*"

echo.
echo  ----------------------------------------
echo.
echo  Podsumowanie konfiguracji:
echo    Haslo gracza:        %PASSWORD%
echo    Haslo Mistrza Gry:   %GM_PASSWORD%
echo    Sciezka bazowa:      %BASE_PATH%
echo    Jezyk interfejsu:    %LANGUAGE%
echo    Kostki L5R wlaczone: %ENABLE_L5R%
echo    Dozwolone originy:   %ALLOWED_ORIGINS%
echo.
echo  ----------------------------------------
echo.

set "CONFIRM="
set /p "CONFIRM=Kontynuowac budowanie? (T/n): "
if /i "%CONFIRM%"=="n" (
    echo.
    echo  Budowanie przerwane.
    pause
    exit /b 0
)

echo.

:: Teksty logowania w zaleznosci od jezyka
if /i "%LANGUAGE%"=="pl" (
    set "LOGIN_TITLE=FreeRoll VTT"
    set "LOGIN_SUBTITLE=Wprowadz haslo aby kontynuowac"
    set "LOGIN_PLACEHOLDER=Haslo..."
    set "LOGIN_SUBMIT=Wejdz do gry"
    set "LOGIN_ERROR=Nieprawidlowe haslo!"
    set "LOGIN_GM_CHECKBOX=Jestem Mistrzem Gry"
    set "LOGOUT=Wyloguj"
    set "APP_TITLE=FreeRoll VTT"
) else (
    set "LOGIN_TITLE=FreeRoll VTT"
    set "LOGIN_SUBTITLE=Enter password to continue"
    set "LOGIN_PLACEHOLDER=Password..."
    set "LOGIN_SUBMIT=Enter game"
    set "LOGIN_ERROR=Invalid password!"
    set "LOGIN_GM_CHECKBOX=I'm Game Master"
    set "LOGOUT=Logout"
    set "APP_TITLE=FreeRoll VTT"
)

echo [1/5] Tworzenie folderu build...
if exist "build" rmdir /s /q "build"
mkdir "build"
mkdir "build\backend"
mkdir "build\backend\data"
mkdir "build\backend\assets"
mkdir "build\backend\assets\map"
mkdir "build\backend\assets\tokens"
mkdir "build\backend\assets\backgrounds"
mkdir "build\backend\assets\papers"
mkdir "build\backend\assets\templates"
mkdir "build\assets"

echo [2/5] Konfiguracja frontendu...
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

echo [3/5] Budowanie frontendu (to moze chwile potrwac)...
cd /d "!ROOT!\frontend"

if not exist "node_modules" (
    echo [INFO] Instalowanie zaleznosci npm...
    call npm install
    if !errorlevel! neq 0 (
        echo [BLAD] npm install zakonczyl sie niepowodzeniem!
        cd /d "!ROOT!"
        call :restore_frontend_env
        pause
        exit /b 1
    )
)

call npm run build
if !errorlevel! neq 0 (
    echo [BLAD] Budowanie frontendu nie powiodlo sie!
    cd /d "!ROOT!"
    call :restore_frontend_env
    pause
    exit /b 1
)

cd /d "!ROOT!"
call :restore_frontend_env

echo [4/5] Kopiowanie plikow...

:: Zbudowane assety (zawieraja juz opcjonalny modul L5R)
xcopy /s /y "frontend\dist\assets\*" "build\assets\" >nul 2>nul

copy /y "backend\api.php" "build\backend\" >nul

:: Szablony HTML
if exist "backend\assets\templates\*.html" (
    xcopy /y "backend\assets\templates\*.html" "build\backend\assets\templates\" >nul 2>nul
)

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

echo [5/5] Generowanie index.php...

powershell -ExecutionPolicy Bypass -File "build-helper.ps1" -TemplatePath "index.php.template" -OutputPath "build\index.php" -Password "%PASSWORD%" -GmPassword "%GM_PASSWORD%" -BasePath "%BASE_PATH%" -Lang "%LANGUAGE%" -LoginTitle "%LOGIN_TITLE%" -LoginSubtitle "%LOGIN_SUBTITLE%" -LoginPlaceholder "%LOGIN_PLACEHOLDER%" -LoginSubmit "%LOGIN_SUBMIT%" -LoginError "%LOGIN_ERROR%" -LoginGmCheckbox "%LOGIN_GM_CHECKBOX%" -Logout "%LOGOUT%" -AppTitle "%APP_TITLE%"

if %errorlevel% neq 0 (
    echo [BLAD] Generowanie index.php nie powiodlo sie!
    pause
    exit /b 1
)

(
    echo Options -Indexes
    echo.
    echo ^<IfModule mod_mime.c^>
    echo     AddType application/javascript .js
    echo     AddType application/javascript .mjs
    echo ^</IfModule^>
) > "build\.htaccess"

echo.
echo  ========================================
echo   BUDOWANIE ZAKONCZONE POWODZENIEM!
echo  ========================================
echo.
echo   Folder 'build' zawiera gotowa paczke.
echo.
echo   Uzyta konfiguracja:
echo     Haslo gracza:   %PASSWORD%
echo     Haslo MG:       %GM_PASSWORD%
echo     Sciezka bazowa: %BASE_PATH%
echo     Jezyk:          %LANGUAGE%
echo     L5R wlaczone:   %ENABLE_L5R%
echo.
echo   Dalsze kroki:
echo   1. Wgraj zawartosc folderu 'build' na serwer
echo      w lokalizacji: %BASE_PATH%
echo   2. Dodaj grafiki do katalogow na serwerze:
echo      - backend/assets/map/
echo      - backend/assets/tokens/
echo      - backend/assets/backgrounds/
echo      - backend/assets/papers/
echo   3. Upewnij sie, ze folder backend/data/ jest zapisywalny
echo   4. Otworz strone w przegladarce i zaloguj sie haslem
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

