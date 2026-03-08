# Krok 1: Serwer PHP i strona logowania

## Cel

Stworzenie strony wejściowej VTT, która:
- wymaga logowania hasłem (osobne hasło dla gracza i dla Mistrza Gry),
- zapisuje w sesji PHP informację, czy użytkownik jest zalogowany i czy jest MG,
- po zalogowaniu pokazuje szkielet strony z placeholderm na aplikację (później dołączy się frontend),
- udostępnia wylogowanie.

Hasła **nie** są nigdy wysyłane do przeglądarki w formie jawnej – trafiają do aplikacji tylko w momencie builda (wstrzyknięcie do wygenerowanego pliku `index.php`). Logowanie odbywa się przez formularz POST do tego samego dokumentu.

---

## Pliki do utworzenia

- `index.php.template` – szablon strony (z placeholderami `{{PASSWORD}}`, `{{GM_PASSWORD}}`, `{{LANG}}`, `{{LOGIN_TITLE}}` itd.), używany przez skrypt builda do wygenerowania finalnego `index.php`.
- Opcjonalnie: skopiowany jako `index.php` w katalogu głównym z ręcznie wpisanymi hasłami do testów (bez builda).

---

## 1. Szablon index.php.template – logika PHP (z komentarzami)

```php
<?php
// Rozpoczęcie sesji – konieczne, żeby przechować informację o zalogowaniu
// między requestami (przeglądarka dostanie ciasteczko PHPSESSID).
session_start();

// Stałe z hasłami – w finalnym buildzie placeholdery {{PASSWORD}} i {{GM_PASSWORD}}
// zostaną zastąpione wartościami podanymi przy uruchomieniu build.bat.
// W szablonie NIE wpisujemy prawdziwych haseł – tylko placeholdery.
define('VTT_PASSWORD', '{{PASSWORD}}');
define('VTT_GM_PASSWORD', '{{GM_PASSWORD}}');

$error = '';

// --- Wylogowanie ---
// Jeśli użytkownik kliknął "Wyloguj", czyścimy sesję i przekierowujemy
// na tę samą stronę (bez parametru ?logout=1), co pokaże formularz logowania.
if (isset($_GET['logout'])) {
    unset($_SESSION['vtt_authenticated']);
    unset($_SESSION['vtt_is_gm']);
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

// --- Przetwarzanie formularza logowania (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    // Checkbox "Jestem Mistrzem Gry" – jeśli zaznaczony, sprawdzamy hasło MG.
    $isGm = isset($_POST['is_gm']) && $_POST['is_gm'] === '1';
    $password = $_POST['password'];

    if ($isGm) {
        // Weryfikacja hasła Mistrza Gry
        if ($password === VTT_GM_PASSWORD) {
            $_SESSION['vtt_authenticated'] = true;
            $_SESSION['vtt_is_gm'] = true;
            header('Location: ' . $_SERVER['REQUEST_URI']);
            exit;
        } else {
            $error = '{{LOGIN_ERROR}}';  // placeholder na komunikat błędu (np. "Nieprawidłowe hasło!")
        }
    } else {
        // Weryfikacja hasła gracza
        if ($password === VTT_PASSWORD) {
            $_SESSION['vtt_authenticated'] = true;
            $_SESSION['vtt_is_gm'] = false;
            header('Location: ' . $_SERVER['REQUEST_URI']);
            exit;
        } else {
            $error = '{{LOGIN_ERROR}}';
        }
    }
}

// --- Wyświetlenie formularza logowania, jeśli użytkownik NIE jest zalogowany ---
if (!isset($_SESSION['vtt_authenticated']) || $_SESSION['vtt_authenticated'] !== true):
?>
```

---

## 2. HTML formularza logowania (w szablonie)

W tej samej pliku, zaraz po powyższym `if` – fragment HTML z formularzem. Placeholdery `{{LOGIN_TITLE}}`, `{{LOGIN_SUBTITLE}}` itd. zostaną podmienione przy buildzie (np. na teksty PL/EN).

```html
<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{LOGIN_TITLE}}</title>
    <style>
        /* Style dla strony logowania – ciemny motyw, wyśrodkowany kontener */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .login-container {
            background: rgba(255, 255, 255, 0.05);
            padding: 2rem 3rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
        }
        h1 { margin-bottom: 0.5rem; color: #e94560; font-size: 2rem; }
        .subtitle { color: #888; margin-bottom: 2rem; font-size: 0.9rem; }
        .error {
            background: rgba(233, 69, 96, 0.2);
            border: 1px solid #e94560;
            color: #ff6b6b;
            padding: 0.75rem;
            border-radius: 6px;
            margin-bottom: 1rem;
        }
        form { display: flex; flex-direction: column; gap: 1rem; }
        input[type="password"] {
            padding: 0.875rem 1rem;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            font-size: 1rem;
        }
        input[type="password"]:focus { outline: none; border-color: #e94560; }
        .gm-checkbox {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
        }
        .gm-checkbox input[type="checkbox"] { width: 1.2rem; height: 1.2rem; accent-color: #e94560; }
        button {
            padding: 0.875rem;
            background: #e94560;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover { background: #ff6b6b; }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>{{LOGIN_TITLE}}</h1>
        <p class="subtitle">{{LOGIN_SUBTITLE}}</p>
        <?php if ($error): ?>
            <div class="error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <form method="POST">
            <input type="password" name="password" placeholder="{{LOGIN_PLACEHOLDER}}" required autofocus>
            <div class="gm-checkbox">
                <input type="checkbox" id="is_gm" name="is_gm" value="1">
                <label for="is_gm">{{LOGIN_GM_CHECKBOX}}</label>
            </div>
            <button type="submit">{{LOGIN_SUBMIT}}</button>
        </form>
    </div>
</body>
</html>
<?php
exit;  // Koniec – nie pokazujemy dalszej części (strony aplikacji).
endif;
?>
```

---

## 3. Strona po zalogowaniu (szkielet pod frontend)

Jeśli użytkownik jest zalogowany, zamiast formularza pokazujemy dokument z linkiem do wylogowania i kontenerem `#root` (tu później React zamontuje aplikację). Skrypty i style frontendu będą dołączane z `{{BASE_PATH}}assets/` – BASE_PATH też jest podmieniany przy buildzie (np. `/vtt/room1/`).

```html
<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{APP_TITLE}}</title>
    <script type="module" crossorigin src="{{BASE_PATH}}assets/index.js"></script>
    <link rel="stylesheet" crossorigin href="{{BASE_PATH}}assets/index.css">
    <style>
        .logout-btn {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            padding: 0.5rem 1rem;
            background: rgba(233, 69, 96, 0.8);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75rem;
            text-decoration: none;
        }
        .logout-btn:hover { background: #e94560; }
    </style>
</head>
<body>
    <a href="?logout=1" class="logout-btn">🚪 {{LOGOUT}}</a>
    <div id="root"></div>
</body>
</html>
```

---

## 4. Generowanie index.php przy buildzie (build-helper.ps1)

Skrypt PowerShell wczytywany przez `build.bat` odczytuje szablon i zamienia placeholdery na wartości podane w parametrach. Dzięki temu **hasła nigdy nie trafiają do repozytorium** – są wpisywane przy uruchomieniu builda.

```powershell
# build-helper.ps1 – parametry z build.bat
param(
    [string]$TemplatePath,
    [string]$OutputPath,
    [string]$Password,
    [string]$GmPassword,
    [string]$BasePath,
    [string]$Lang,
    [string]$LoginTitle,
    [string]$LoginSubtitle,
    [string]$LoginPlaceholder,
    [string]$LoginSubmit,
    [string]$LoginError,
    [string]$LoginGmCheckbox,
    [string]$Logout,
    [string]$AppTitle
)

$content = Get-Content $TemplatePath -Raw -Encoding UTF8

# Podmiana placeholders – w tym haseł (tylko w wygenerowanym pliku na serwerze)
$content = $content -replace '\{\{PASSWORD\}\}', $Password
$content = $content -replace '\{\{GM_PASSWORD\}\}', $GmPassword
$content = $content -replace '\{\{BASE_PATH\}\}', $BasePath
$content = $content -replace '\{\{LANG\}\}', $Lang
$content = $content -replace '\{\{LOGIN_TITLE\}\}', $LoginTitle
# ... pozostałe LOGIN_*, LOGOUT, APP_TITLE ...

[System.IO.File]::WriteAllText($OutputPath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Generated: $OutputPath"
```

---

## Jak sprawdzić

1. **Test z ręcznie wpisanymi hasłami (bez builda)**  
   - Skopiuj `index.php.template` do `index.php` w katalogu, który serwuje PHP.  
   - W `index.php` zamień placeholdery na konkretne wartości, np.:  
     - `{{PASSWORD}}` → `2137`  
     - `{{GM_PASSWORD}}` → `admin`  
     - `{{LANG}}` → `pl`  
     - `{{LOGIN_TITLE}}` → `FreeRoll VTT`  
     - `{{LOGIN_SUBTITLE}}` → `Wprowadź hasło`  
     - `{{LOGIN_PLACEHOLDER}}` → `Hasło...`  
     - `{{LOGIN_SUBMIT}}` → `Wejdź`  
     - `{{LOGIN_ERROR}}` → `Nieprawidłowe hasło!`  
     - `{{LOGIN_GM_CHECKBOX}}` → `Jestem Mistrzem Gry`  
     - `{{LOGOUT}}` → `Wyloguj`  
     - `{{APP_TITLE}}` → `FreeRoll VTT`  
     - `{{BASE_PATH}}` → `/` (jeśli aplikacja w root) lub np. `/vtt/room1/`

2. Uruchom serwer PHP (np. `php -S localhost:8080` w katalogu z `index.php`).

3. Otwórz w przeglądarce `http://localhost:8080/`.  
   - Powinien pojawić się formularz logowania.

4. Wpisz hasło gracza (np. `2137`), **nie** zaznaczaj "Jestem Mistrzem Gry", kliknij "Wejdź".  
   - Powinno nastąpić przekierowanie i wyświetlenie strony z przyciskiem "Wyloguj" i pustym `#root` (skrypty assets jeszcze nie istnieją – 404 jest OK).

5. Kliknij "Wyloguj".  
   - Powinien wrócić formularz logowania.

6. Zaloguj się z hasłem MG (np. `admin`) **z zaznaczonym** "Jestem Mistrzem Gry".  
   - Strona po logowaniu wygląda tak samo; różnica (gracz vs MG) będzie używana przez API w kolejnych krokach.
