# Krok 2: Backend API – jeden plik, CORS, autoryzacja, endpoint auth

## Cel

Utworzenie jednego pliku `api.php`, który:
- uruchamia sesję PHP (ta sama sesja co przy logowaniu w index.php),
- ładuje konfigurację z pliku `.env` (m.in. dozwolone originy CORS),
- ustawia nagłówki CORS tak, aby frontend z innego portu/domeny mógł wysyłać requesty z ciasteczkami (`credentials: 'include'`),
- rozróżnia tryb deweloperski (localhost) od produkcyjnego (sprawdzenie sesji),
- udostępnia endpoint GET `action=auth`, zwracający informację, czy użytkownik jest zalogowany i czy jest Mistrzem Gry.

Wszystkie odpowiedzi API są w formacie JSON.

---

## Pliki do utworzenia

- `backend/api.php` – punkt wejścia dla wszystkich wywołań API (na razie tylko `action=auth`).
- `backend/.env` (lub `.env.example`) – np. `ALLOWED_ORIGINS=http://localhost:5173` (Vite dev server).

---

## 1. Sesja i funkcje autoryzacji

Na początku pliku uruchamiamy sesję – w ten sposób api.php ma dostęp do tej samej sesji co index.php (ciasteczko PHPSESSID wysyłane przez przeglądarkę z `credentials: 'include'`).

```php
<?php
session_start();

// ============================================
// Sprawdzanie autoryzacji
// ============================================

/**
 * Tryb deweloperski – gdy frontend działa na localhost (np. Vite na :5173),
 * a API na innym porcie (np. PHP na :8080), nie mamy wspólnej domeny,
 * więc sesja z index.php może nie być dostępna. W dev pomijamy wymóg logowania
 * i pozwalamy na testy bez uruchamianego index.php.
 */
function isDevMode() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $serverName = $_SERVER['SERVER_NAME'] ?? '';

    if (strpos($origin, 'http://localhost:') === 0 ||
        strpos($origin, 'http://127.0.0.1:') === 0 ||
        strpos($host, 'localhost') !== false ||
        strpos($host, '127.0.0.1') !== false ||
        strpos($serverName, 'localhost') !== false ||
        strpos($serverName, '127.0.0.1') !== false) {
        return true;
    }
    return false;
}

/**
 * Czy użytkownik jest zalogowany?
 * W trybie dev: zawsze true (ułatwia testy).
 * W trybie prod: sprawdzamy sesję ustawioną przez index.php.
 */
function isAuthenticated() {
    if (isDevMode()) {
        return true;
    }
    return isset($_SESSION['vtt_authenticated']) && $_SESSION['vtt_authenticated'] === true;
}

/**
 * Czy użytkownik jest Mistrzem Gry?
 * W trybie dev: true tylko gdy ?gm=1 w URL lub cookie dev_gm=1 (do testów).
 * W trybie prod: z sesji (index.php ustawia $_SESSION['vtt_is_gm']).
 */
function isGameMaster() {
    if (isDevMode()) {
        if (isset($_GET['gm']) && $_GET['gm'] === '1') {
            return true;
        }
        if (isset($_COOKIE['dev_gm']) && $_COOKIE['dev_gm'] === '1') {
            return true;
        }
        return false;
    }
    return isAuthenticated() && isset($_SESSION['vtt_is_gm']) && $_SESSION['vtt_is_gm'] === true;
}
```

---

## 2. Ładowanie .env i CORS

API musi przyjmować requesty z innej domeny/portu (frontend Vite). Przeglądarka wysyła nagłówek `Origin`; serwer musi odpowiedzieć `Access-Control-Allow-Origin` (i innymi CORS) oraz **Access-Control-Allow-Credentials: true**, żeby ciasteczka sesji były wysyłane.

```php
// ============================================
// Ładowanie konfiguracji z .env
// ============================================
function loadEnv($path) {
    if (!file_exists($path)) return [];

    $env = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === '#') continue;

        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $value = trim($parts[1]);
            $value = trim($value, '"\'');
            $env[$key] = $value;
        }
    }
    return $env;
}

$envFile = __DIR__ . '/.env';
$env = loadEnv($envFile);

// ============================================
// CORS – wymagane przy frontendzie na innym porcie/domenie
// ============================================
header('Content-Type: application/json');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOriginsStr = $env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));

// Zwracamy Origin w nagłówku tylko jeśli jest na liście (lub zezwalamy wszystkim przez *)
if (in_array($origin, $allowedOrigins) || in_array('*', $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
// Krytyczne: bez tego przeglądarka nie wyśle ciasteczek przy fetch(..., { credentials: 'include' })
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
```

---

## 3. Routing i endpoint GET auth

Wszystkie wywołania idą do tego samego pliku z parametrem `action`. Na razie obsługujemy tylko GET i akcję `auth`.

```php
// ============================================
// API – routing po metodzie i action
// ============================================
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    // Endpoint auth nie wymaga wcześniejszego logowania – służy do sprawdzenia roli.
    if ($action !== 'auth' && !isAuthenticated()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }

    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'auth':
                    // Zwraca: czy użytkownik jest zalogowany oraz czy jest MG.
                    // Frontend używa tego przy starcie, żeby ustawić stan (np. ukryć panel MG dla gracza).
                    $authenticated = isDevMode() ? true : isAuthenticated();
                    $isGM = isGameMaster();

                    echo json_encode([
                        'success' => true,
                        'authenticated' => $authenticated,
                        'isGameMaster' => $isGM
                    ]);
                    break;

                default:
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Unknown action']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
```

---

## Przykład backend/.env

```
# Dopuszczalne originy (przeglądarka sprawdza nagłówek Origin)
# W dev: adres Vite, np. http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## Jak sprawdzić

1. Upewnij się, że w katalogu `backend/` jest plik `.env` z `ALLOWED_ORIGINS=http://localhost:5173` (lub adresem, z którego będziesz odpalać frontend).

2. Uruchom serwer PHP w katalogu zawierającym `backend/` tak, aby `api.php` był dostępny pod ścieżką zawierającą `backend`, np.:  
   - z głównego katalogu projektu: `php -S localhost:8080`  
   - wtedy API: `http://localhost:8080/backend/api.php`

3. W przeglądarce lub przez curl (bez ciasteczka sesji, w trybie dev):
   - `http://localhost:8080/backend/api.php?action=auth`  
   Oczekiwana odpowiedź JSON: `{"success":true,"authenticated":true,"isGameMaster":false}`

4. Z parametrem GM (tylko w trybie dev):
   - `http://localhost:8080/backend/api.php?action=auth&gm=1`  
   Oczekiwana odpowiedź: `"isGameMaster": true`.

5. (Opcjonalnie) Z poziomu strony zalogowanej przez index.php (ta sama domena/port co API): wywołaj `fetch('/backend/api.php?action=auth', { credentials: 'include' })` – w odpowiedzi `authenticated` i `isGameMaster` powinny odpowiadać sesji (gracz vs MG).
