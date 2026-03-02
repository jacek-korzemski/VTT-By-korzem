## FreeRoll VTT – prosty, samodzielny wirtualny stół

FreeRoll VTT to **lekki Virtual TableTop**, który budujesz raz, a potem hostujesz na **zwykłym serwerze PHP/Apache (lub nginx)** – bez baz danych, Dockera czy działającego non‑stop Node’a.

### Najważniejsze funkcje

- **Sceny i zarządzanie mapą**
  - wiele scen z **dodawaniem / zmianą nazwy / duplikowaniem / usuwaniem**
  - natychmiastowe **przełączanie sceny** dla wszystkich podłączonych graczy
  - stan przechowywany per scena: tło, mgła wojny, elementy mapy, tokeny

- **Tła map**
  - obrazy tła przygotowane pod **siatkę 64×64 px**
  - tła wrzucasz do `backend/assets/backgrounds`
  - w locie możesz **przesuwać, skalować i resetować** tło (pozycja i zoom)

- **Elementy mapy i tokeny**
  - osobne przeglądarki dla **elementów mapy** (`backend/assets/map`) i **tokenów** (`backend/assets/tokens`)
  - przeciąganie i upuszczanie na siatkę z przyciąganiem do pól
  - **sprawdzanie kolizji**, żeby przypadkiem nie ułożyć kilku tokenów/elementów na jednym polu
  - **gumka elementów**, która szybko usuwa obiekty z mapy

- **Mgła wojny (oparta o siatkę)**
  - mgła wojny trzymana jako bitmapa, w podziale na pola siatki
  - **tryb edycji tylko dla Mistrza Gry**, pędzel kołowy z regulowanym rozmiarem
  - tryby **odkrywania / zakrywania**, plus akcje **Odkryj wszystko** i **Zakryj wszystko**
  - opcjonalny **podgląd dla MG z przezroczystością 50%**, żeby widzieć jednocześnie mapę i mgłę

- **Rzuty kośćmi**
  - standardowe kości: **d4, d6, d8, d10, d12, d20, d100**, dowolna liczba kości
  - **nazwa gracza** zapisywana w przeglądarce
  - modyfikator do rzutu oraz **czytelna historia rzutów** (współdzielona przez backend)
  - opcjonalny moduł **Legend of the Five Rings (L5R)** z poprawnymi kośćmi pierścienia/umiejętności, eksplodującymi wynikami oraz podsumowaniem (sukces / okazja / stres)

- **Notatniki i szablony**
  - do **3 równoczesnych notatników WYSIWYG** na użytkownika
  - możliwość **zapisu/odczytu danych jako JSON** i eksportu do HTML
  - wsparcie dla **szablonów HTML z serwera** (`backend/assets/templates/*.html`) – idealne na karty postaci
  - centralny **kontekst szablonów notatek**, z którego mogą korzystać makra (odczyt pól)

- **Edytor makr**
  - wizualny edytor **makr do rzutów**, z wyrażeniami typu `2d6+@str`
  - makra potrafią czytać wartości z **nazwanych pól w szablonach notatek** (np. statystyki z karty postaci)
  - sortowanie, edycja, import/eksport makr oraz odpalanie ich prosto do historii rzutów

- **Panel czytnika PDF**
  - lista i otwieranie PDF‑ów z serwera z katalogu `backend/assets/papers`
  - dodatkowo **lokalne PDF‑y w przeglądarce**, przechowywane tylko po stronie klienta
  - leniwe ładowanie kolejnych stron dla dobrej wydajności przy dużych podręcznikach

- **Narzędzie ping (przywołanie uwagi)**
  - Mistrz Gry może **wysłać pinga w wybrane pole siatki**; widok wszystkich graczy przewinie się w to miejsce z animacją
  - opcja **wyczyszczenia pinga**, żeby nowi gracze nie byli przekierowywani do starego znacznika

- **Upload materiałów z poziomu aplikacji**
  - panel uploadu dla MG, który pozwala wysłać **tokeny, elementy mapy, tła, szablony HTML i pliki PDF** bezpośrednio na serwer
  - podstawowa walidacja typów plików i rozmiarów, komunikaty o błędach

- **Prosta autoryzacja i tryb MG**
  - **hasło gracza** i **hasło MG**, definiowane na etapie budowania
  - strona logowania generowana z `index.php.template`, z tekstami zależnymi od języka
  - backend rozróżnia **MG vs gracz** i ogranicza wrażliwe akcje (upload, edycja mgły, zmiany scen itp.)

- **Wielojęzyczny interfejs (en / pl)**
  - wszystkie teksty trzymane w `frontend/src/lang/translations.json`
  - język wybierany na etapie builda (`en` lub `pl`) i wstrzykiwany przez `VITE_LANGUAGE`

---

## Wymagania

### Do zbudowania aplikacji

- **Node.js 18+** (`https://nodejs.org/`)
- **Windows** (jeśli chcesz używać dostarczonych skryptów `build.bat` / `build_pl.bat`)

### Serwer do uruchomienia paczki

- **PHP 7.4+**
- Serwer WWW z obsługą:
  - plików `.htaccess` (Apache) **lub**
  - równoważnej konfiguracji w nginx (przepisywanie adresów + ochrona `.env` i plików danych)

Wygenerowany katalog `build` to statyczne assety + mały backend PHP, więc działa na większości tanich hostingów PHP.

---

## Szybki start na Windows

### 1. Zbuduj paczkę

W katalogu głównym projektu uruchom **jeden** z poniższych skryptów:

- `build.bat` – interaktywne budowanie (komunikaty po angielsku, domyślny język UI: **en**)
- `build_pl.bat` – interaktywne budowanie (komunikaty po polsku, domyślny język UI: **pl**)

Skrypt zapyta Cię o:

- **hasło gracza** i **hasło MG**
- **bazową ścieżkę** (np. `/vtt/room1/` – adres, pod którym aplikacja będzie widoczna na serwerze)
- **język interfejsu** (`en` / `pl`)
- czy **włączyć moduł kości L5R**
- dozwolone źródła HTTP dla API (`ALLOWED_ORIGINS` w `.env` backendu)

Następnie skrypt:

- przygotuje nowe `frontend/.env` dla wskazanej konfiguracji
- uruchomi `npm install` (tylko jeśli potrzeba) oraz `npm run build`
- złoży katalog `build` zawierający:
  - `index.php` wygenerowany z `index.php.template`
  - `assets/` z paczką frontendu
  - `backend/` z `api.php`, `.env`, `.htaccess`, `data/`, `assets/…`
  - puste pliki `.gitkeep` w katalogach na assety (żeby istniały od razu na serwerze)

### 2. Wgraj paczkę na serwer

Po udanym buildzie pojawi się katalog `build` w głównym folderze projektu.

- **Wgraj zawartość katalogu `build/`** (nie sam folder) do docelowego katalogu na serwerze, który odpowiada wybranej bazowej ścieżce.
- Na serwerze umieść własne materiały w:
  - `backend/assets/map/` – elementy mapy
  - `backend/assets/tokens/` – tokeny
  - `backend/assets/backgrounds/` – tła map
  - `backend/assets/papers/` – pliki PDF dla czytnika
  - `backend/assets/templates/` – szablony HTML dla notatników / kart postaci
- Upewnij się, że katalog `backend/data/` jest **zapisywalny** przez użytkownika serwera WWW, np. na Linuksie:
  - `chmod 755 backend/data/` (lub bardziej liberalnie – zależnie od hostingu)

Następnie otwórz w przeglądarce skonfigurowany adres (np. `https://twojadomena.pl/vtt/room1/`) i zaloguj się wybranym hasłem gracza / MG.

---

## Dla deweloperów

### Backend w trybie deweloperskim (bez logowania, CORS dla localhost)

```bash
cd backend
php -S localhost:8080
```

Uruchamia to wbudowany serwer PHP pod `http://localhost:8080` i włącza skróty deweloperskie w `api.php` (pominięcie logowania, możliwość wymuszenia roli MG przez `?gm=1` lub cookie `dev_gm`).

### Frontend z serwerem deweloperskim Vite

```bash
cd frontend
npm install
npm run dev
```

Domyślnie frontend działa pod adresem `http://localhost:5173` i łączy się z backendem pod `http://localhost:8080/backend/api.php`. W razie potrzeby możesz to zmienić w lokalnej konfiguracji (`.env` / `config`).

