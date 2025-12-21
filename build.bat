@echo off
setlocal enabledelayedexpansion

:: ============================================
:: Simple VTT - Build Script
:: ============================================

echo.
echo  ========================================
echo   Simple VTT - Skrypt budowania
echo  ========================================
echo.

:: Sprawdź czy Node.js jest zainstalowany
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [BLAD] Node.js nie jest zainstalowany!
    echo Pobierz z: https://nodejs.org/
    pause
    exit /b 1
)

:: Pobierz hasło z parametru lub użyj domyślnego
set "PASSWORD=%~1"
if "%PASSWORD%"=="" (
    set "PASSWORD=2137"
    echo [INFO] Nie podano hasla - uzywam domyslnego: 2137
) else (
    echo [INFO] Haslo ustawione na: %PASSWORD%
)

:: Pobierz ścieżkę bazową (opcjonalnie jako drugi parametr)
set "BASE_PATH=%~2"
if "%BASE_PATH%"=="" (
    set "BASE_PATH=/vtt/room1/"
    echo [INFO] Nie podano sciezki - uzywam domyslnej: /vtt/room1/
) else (
    echo [INFO] Sciezka bazowa: %BASE_PATH%
)

:: Pobierz allowed origins (opcjonalnie jako trzeci parametr)
set "ALLOWED_ORIGINS=%~3"
if "%ALLOWED_ORIGINS%"=="" (
    set "ALLOWED_ORIGINS=*"
    echo [INFO] Allowed origins: * (wszystkie)
) else (
    echo [INFO] Allowed origins: %ALLOWED_ORIGINS%
)

echo.
echo [1/5] Tworzenie folderu build...
if exist "build" rmdir /s /q "build"
mkdir "build"
mkdir "build\backend"
mkdir "build\backend\data"
mkdir "build\backend\assets"
mkdir "build\backend\assets\map"
mkdir "build\backend\assets\tokens"
mkdir "build\backend\assets\backgrounds"

echo [2/5] Konfiguracja frontendu...
:: Utwórz .env dla frontendu
(
    echo VITE_BASE_PATH=%BASE_PATH%
    echo VITE_API_PATH=backend/api.php
) > "frontend\.env"

echo [3/5] Budowanie frontendu (moze chwile potrwac)...
cd frontend

:: Sprawdź czy node_modules istnieje
if not exist "node_modules" (
    echo [INFO] Instalowanie zaleznosci npm...
    call npm install
    if %errorlevel% neq 0 (
        echo [BLAD] npm install nie powiodl sie!
        cd ..
        pause
        exit /b 1
    )
)

:: Buduj
call npm run build
if %errorlevel% neq 0 (
    echo [BLAD] Build frontendu nie powiodl sie!
    cd ..
    pause
    exit /b 1
)

cd ..

echo [4/5] Kopiowanie plikow...

:: Kopiuj zbudowane assety
xcopy /s /y "frontend\dist\assets\*" "build\assets\" >nul 2>nul

:: Kopiuj backend
copy /y "backend\api.php" "build\backend\" >nul

:: Utwórz .htaccess dla backendu
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

:: Utwórz .htaccess dla data
(
    echo Order Allow,Deny
    echo Deny from all
) > "build\backend\data\.htaccess"

:: Utwórz .env dla backendu
(
    echo # Konfiguracja VTT
    echo ALLOWED_ORIGINS=%ALLOWED_ORIGINS%
) > "build\backend\.env"

:: Utwórz puste pliki placeholder (poprawiona metoda)
echo. > "build\backend\assets\map\.gitkeep"
echo. > "build\backend\assets\tokens\.gitkeep"
echo. > "build\backend\assets\backgrounds\.gitkeep"
echo. > "build\backend\data\.gitkeep"

echo [5/5] Generowanie index.php...

:: Wczytaj szablon i zamień placeholdery
powershell -Command ^
    "$content = Get-Content 'index.php.template' -Raw -Encoding UTF8; $content = $content -replace '\{\{PASSWORD\}\}', '%PASSWORD%' -replace '\{\{BASE_PATH\}\}', '%BASE_PATH%'; [System.IO.File]::WriteAllText('build\index.php', $content, [System.Text.Encoding]::UTF8)"

if %errorlevel% neq 0 (
    echo [BLAD] Generowanie index.php nie powiodlo sie!
    pause
    exit /b 1
)

:: Utwórz główny .htaccess
(
    echo Options -Indexes
) > "build\.htaccess"

echo.
echo  ========================================
echo   BUILD UKONCZONY!
echo  ========================================
echo.
echo   Folder 'build' zawiera gotowa paczke.
echo.
echo   Instrukcja:
echo   1. Wgraj zawartosc folderu 'build' na serwer
echo      do lokalizacji: %BASE_PATH%
echo   2. Wrzuc obrazki do:
echo      - backend/assets/map/ (elementy mapy)
echo      - backend/assets/tokens/ (tokeny)  
echo      - backend/assets/backgrounds/ (tla map)
echo   3. Upewnij sie ze folder backend/data/
echo      ma uprawnienia do zapisu
echo   4. Otworz strone i zaloguj sie haslem: %PASSWORD%
echo.
echo  ========================================
echo.

pause