# Krok 13: Build i wdrożenie

## Cel

- **build.bat** zbiera konfigurację (hasło gracza, hasło MG, ścieżka bazowa, język, L5R, dozwolone originy), tworzy katalog build, ustawia plik .env frontendu, buduje frontend (npm run build), kopiuje pliki backendu i zbudowane assety, generuje index.php z wstrzykniętymi hasłami i tekstami logowania za pomocą skryptu PowerShell (build-helper.ps1), tworzy pliki .htaccess. Hasła **nigdy** nie trafiają do kodu frontendu ani do repozytorium – tylko do wygenerowanego pliku index.php na serwerze.
- **Wdrożenie:** Upload zawartości folderu build na serwer WWW pod wybraną ścieżką (BASE_PATH), ustawienie uprawnień zapisu na backend/data/, opcjonalnie dodanie obrazków do assets. Po wdrożeniu użytkownik wchodzi na stronę, loguje się hasłem gracza lub MG i korzysta z aplikacji.

---

## 1. Przepływ build.bat (krok po kroku)

1. **Sprawdzenie Node.js** – bez niego nie uruchomisz Vite (npm run build).
2. **Pobranie konfiguracji od użytkownika** (domyślnie Enter = wartości w nawiasach):
   - **PASSWORD** – hasło dla graczy (domyślnie 2137).
   - **GM_PASSWORD** – hasło dla Mistrza Gry (domyślnie admin).
   - **BASE_PATH** – ścieżka, pod którą aplikacja będzie hostowana (np. /vtt/room1/).
   - **LANGUAGE** – en lub pl (teksty logowania i ewentualnie VITE_LANGUAGE).
   - **ENABLE_L5R** – true/false (moduł kości L5R w frontendzie).
   - **ALLOWED_ORIGINS** – lista originów CORS dla API (np. * lub konkretna domena).
3. **Podsumowanie i potwierdzenie** – użytkownik wpisuje Y lub n (anulowanie).
4. **Ustawienie tekstów logowania** (LOGIN_TITLE, LOGIN_SUBTITLE, LOGIN_PLACEHOLDER, LOGIN_SUBMIT, LOGIN_ERROR, LOGIN_GM_CHECKBOX, LOGOUT, APP_TITLE) w zależności od LANGUAGE.
5. **[1/5] Tworzenie struktury build** – usunięcie starego build (jeśli jest), mkdir build, build\backend, build\backend\data, build\backend\assets (map, tokens, backgrounds, papers, templates), build\assets.
6. **[2/5] Konfiguracja frontendu** – zapis pliku frontend\.env z zawartością:
   - VITE_BASE_PATH=%BASE_PATH%
   - VITE_API_PATH=backend/api.php
   - VITE_LANGUAGE=%LANGUAGE%
   - VITE_ENABLE_L5R=%ENABLE_L5R%
   Istniejący frontend\.env jest wcześniej backupowany do .env.devbackup, żeby nie nadpisać ustawień deweloperskich na stałe.
7. **[3/5] Budowanie frontendu** – cd frontend, npm install (jeśli brak node_modules), npm run build. Przy błędzie przywrócenie .env z .env.devbackup i wyjście.
8. **[4/5] Kopiowanie plików:**
   - frontend\dist\assets\* → build\assets\
   - backend\api.php → build\backend\
   - backend\assets\templates\*.html → build\backend\assets\templates\
   - Generowanie build\backend\.htaccess (ochrona .env, state.json, rolls.json, Deny dla data/).
   - Zapis build\backend\.env z ALLOWED_ORIGINS.
   - Puste pliki .gitkeep w katalogach assets i data (żeby katalogi istniały w repozytorium).
9. **[5/5] Generowanie index.php** – wywołanie PowerShell:
   `powershell -ExecutionPolicy Bypass -File "build-helper.ps1" -TemplatePath "index.php.template" -OutputPath "build\index.php" -Password "%PASSWORD%" -GmPassword "%GM_PASSWORD%" -BasePath "%BASE_PATH%" -Lang "%LANGUAGE%" -LoginTitle "%LOGIN_TITLE%" ... (wszystkie placeholdery)`
   build-helper.ps1 wczytuje index.php.template i zamienia każdy placeholder ({{PASSWORD}}, {{GM_PASSWORD}}, {{BASE_PATH}}, {{LANG}}, {{LOGIN_TITLE}}, itd.) na wartość z parametru, po czym zapisuje wynik do build\index.php.
10. **Generowanie build\.htaccess** – Options -Indexes, AddType dla .js/.mjs (poprawne MIME).
11. **Przywrócenie frontend\.env** – jeśli był backup .env.devbackup, przywróć go jako .env (funkcja :restore_frontend_env).

---

## 2. build-helper.ps1 – wstrzykiwanie haseł i tekstów

Skrypt przyjmuje parametry (TemplatePath, OutputPath, Password, GmPassword, BasePath, Lang, LoginTitle, LoginSubtitle, LoginPlaceholder, LoginSubmit, LoginError, LoginGmCheckbox, Logout, AppTitle). Odczytuje szablon jako surowy tekst (UTF-8), wykonuje replace dla każdego placeholder:

```powershell
$content = Get-Content $TemplatePath -Raw -Encoding UTF8
$content = $content -replace '\{\{PASSWORD\}\}', $Password
$content = $content -replace '\{\{GM_PASSWORD\}\}', $GmPassword
$content = $content -replace '\{\{BASE_PATH\}\}', $BasePath
# ... pozostałe placeholdery ...
[System.IO.File]::WriteAllText($OutputPath, $content, [System.Text.Encoding]::UTF8)
```

W wygenerowanym build\index.php pojawią się literalne wartości haseł (np. define('VTT_PASSWORD', '2137');). Ten plik **nie** powinien trafiać do repozytorium z prawdziwymi hasłami – albo build/ jest w .gitignore, albo na serwer wgrywasz build ręcznie i nie commitujesz go.

---

## 3. Zawartość build po zakończeniu

- **build/index.php** – strona wejściowa z logowaniem i wstawką aplikacji (script/link do assets/index.js i index.css). Zawiera stałe PHP z hasłami.
- **build/assets/** – index.js, index.css, chunk-y (frontend zbudowany przez Vite z base = BASE_PATH).
- **build/backend/api.php** – jeden plik API.
- **build/backend/.env** – tylko ALLOWED_ORIGINS (hasła są w index.php, nie w backendzie).
- **build/backend/data/** – katalog na state.json i rolls.json (musi być zapisywalny).
- **build/backend/assets/map|tokens|backgrounds|papers|templates/** – puste lub z plikami (np. .gitkeep). Po wdrożeniu możesz dodać obrazy/PDF/szablony.
- **build/.htaccess** – indeksowanie wyłączone, typy MIME dla JS.

---

## 4. .htaccess – ochrona wrażliwych plików

W build\backend\.htaccess:

- Blokada dostępu do plików .env (FilesMatch).
- Blokada bezpośredniego dostępu do state.json i rolls.json (żeby nikt nie czytał stanu przez URL).
- Options -Indexes – brak listowania katalogów.

W build\backend\data\.htaccess:

- Deny from all – katalog data/ nie jest serwowany bezpośrednio; API czyta/zapisuje pliki z dysku, ale przeglądarka nie może pobrać state.json po URL.

---

## 5. Wdrożenie na serwer

1. Skopiuj **całą zawartość** folderu build (np. przez FTP/SFTP) do katalogu docelowego na serwerze, odpowiadającego BASE_PATH. Np. jeśli BASE_PATH=/vtt/room1/, to index.php i podkatalogi (assets, backend) muszą być dostępne pod https://twoja-domena.pl/vtt/room1/.
2. Ustaw uprawnienia: katalog backend/data/ (i ewentualnie backend/assets/ i podkatalogi) muszą być zapisywalne przez użytkownika serwera WWW (chmod 755 lub 775, w zależności od konfiguracji).
3. Serwer musi obsługiwać PHP (np. Apache z mod_php lub PHP-FPM) oraz rozszerzenie PHP do sesji i JSON. Nie jest wymagana baza danych.
4. (Opcjonalnie) Dodaj obrazy do backend/assets/map, backend/assets/tokens, backend/assets/backgrounds; PDF do backend/assets/papers; szablony HTML do backend/assets/templates.
5. W przeglądarce otwórz adres strony (np. https://twoja-domena.pl/vtt/room1/). Powinna pojawić się strona logowania. Zaloguj się hasłem gracza lub hasłem MG (z checkboxem „Jestem Mistrzem Gry”). Po zalogowaniu ładuje się aplikacja (index.js), która odwołuje się do backend/api.php pod tym samym BASE_PATH; ciasteczko sesji jest wysyłane z credentials: 'include'.

---

## 6. ALLOWED_ORIGINS po wdrożeniu

Jeśli frontend i backend są serwowane z tej samej domeny i ścieżki (np. wszystko pod /vtt/room1/), requesty do API mają ten sam origin – CORS może nie być konieczny. Jeśli jednak np. front jest na CDN lub innej domenie, ustaw w build\backend\.env ALLOWED_ORIGINS na konkretny origin (np. https://twoja-domena.pl). Wartość * przy credentials: true może być ignorowana przez przeglądarki – bezpieczniej podać jawny origin.

---

## Jak sprawdzić

1. Uruchom build.bat. Podaj hasła (lub Enter dla domyślnych), BASE_PATH (np. /vtt/room1/), język, potwierdź build. Sprawdź, że folder build zawiera index.php, assets/, backend/ z api.php i .env.

2. Otwórz wygenerowany build\index.php w edytorze – w definicjach VTT_PASSWORD i VTT_GM_PASSWORD powinny być wpisane wybrane przy buildzie wartości (nie placeholdery {{...}}).

3. Skopiuj build na lokalny serwer PHP (np. XAMPP, WAMP) pod ścieżką zgodną z BASE_PATH. Ustaw zapisywalność backend/data/. Wejdź na stronę w przeglądarce – formularz logowania, logowanie hasłem gracza i hasłem MG, wejście do aplikacji i działanie API (np. stan, tło, kości).

4. Po wdrożeniu na serwer produkcyjny sprawdź logowanie, przełączanie scen, rzuty kości i upload (jako MG) – wszystko z zachowaniem credentials: 'include' i bez ujawniania haseł w kodzie frontendu.
