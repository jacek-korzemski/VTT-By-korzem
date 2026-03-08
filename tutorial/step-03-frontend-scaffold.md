# Krok 3: Frontend – scaffold Vite + React

## Cel

Postawienie minimalnego frontendu:
- projekt Vite z pluginem React,
- jedna strona HTML z kontenerem `#root`,
- punkt wejścia `main.jsx` montujący komponent `App` do `#root`,
- konfiguracja ścieżek (BASE_PATH, API_BASE) z zmiennych środowiskowych (`.env`),
- możliwość uruchomienia w trybie deweloperskim (`npm run dev`) i zbudowania (`npm run build`).

Dzięki temu po tym kroku możesz otworzyć aplikację w przeglądarce i zobaczyć np. tytuł; w kolejnych krokach dodasz wywołanie API i UI.

---

## Pliki do utworzenia

- `frontend/package.json` – zależności (react, react-dom, vite, @vitejs/plugin-react).
- `frontend/vite.config.js` – base path, plugin React, opcjonalnie proxy do API.
- `frontend/index.html` – w katalogu frontend (Vite wymaga index.html w root projektu frontendu).
- `frontend/src/main.jsx` – wejście aplikacji, montowanie React do `#root`.
- `frontend/src/App.jsx` – główny komponent (na razie prosty div z tytułem).
- `frontend/config.js` – eksport BASE_PATH i API_BASE z `import.meta.env`.
- `frontend/.env.example` – przykładowe zmienne (VITE_BASE_PATH, VITE_API_PATH itd.).

---

## 1. package.json

```json
{
  "name": "vtt-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

- `type: "module"` – ESM w Node i w bundlu.
- `scripts.dev` – uruchamia serwer deweloperski Vite (domyślnie port 5173).
- `scripts.build` – produkcyjny build do katalogu `dist`.

---

## 2. vite.config.js

`base` musi być zgodny z tym, pod jaką ścieżką aplikacja będzie serwowana na serwerze (np. `/vtt/room1/`). W dev Vite serwuje assety pod tym base.

```javascript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // loadEnv ładuje .env / .env.local itd. – zmienne muszą mieć prefix VITE_
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    // Ścieżka bazowa – np. /vtt/room1/ gdy aplikacja nie jest w root domeny
    base: env.VITE_BASE_PATH || '/vtt/room1/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    // Opcjonalnie: proxy requestów do backendu (gdy API na innym porcie)
    server: {
      proxy: {
        '/vtt/room1/backend': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/vtt\/room1\/backend/, '/backend'),
        },
      },
    },
  }
})
```

---

## 3. index.html

Musi znajdować się w katalogu `frontend/`. Skrypt wejścia to `/src/main.jsx` – Vite obsłuży go jako moduł.

```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>FreeRoll VTT</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

---

## 4. main.jsx

Montuje drzewo React do elementu `#root`. W produkcji build Vite wygeneruje link do skompilowanego `assets/index.js` (w index.php już jest odniesienie do `{{BASE_PATH}}assets/index.js`).

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// W kolejnych krokach: import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## 5. config.js – ścieżki i API

Wszystkie zmienne dostępne w kodzie frontendu muszą mieć prefix `VITE_` (Vite wstrzykuje tylko takie z pliku `.env`). Łączymy BASE_PATH z API_PATH, żeby każdy `fetch` szedł pod ten sam adres API (z tym samym originem lub z CORS + credentials).

```javascript
// Konfiguracja aplikacji – wartości z .env (wstrzykiwane przy build/dev)

// Ścieżka bazowa pod którą hostowana jest aplikacja, np. /vtt/room1/
export const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/vtt/room1/'

// Ścieżka do skryptu API względem base (lub pełny URL)
export const API_PATH = import.meta.env.VITE_API_PATH || 'backend/api.php'

// Pełny URL bazowy do API – używany we wszystkich fetch(API_BASE + '?action=...')
// credentials: 'include' jest wymagane, żeby przeglądarka wysyłała ciasteczko sesji
export const API_BASE = `${BASE_PATH}${API_PATH}`
```

---

## 6. App.jsx (minimalny)

Na razie tylko wyświetlenie tytułu – w kolejnych krokach dodasz stan i wywołanie `fetch(API_BASE + '?action=auth', { credentials: 'include' })`.

```jsx
import { API_BASE } from '../config'

function App() {
  return (
    <div className="app">
      <h1>FreeRoll VTT</h1>
      <p>API base: {API_BASE}</p>
    </div>
  )
}

export default App
```

W prawdziwej aplikacji `API_BASE` nie wyświetlasz użytkownikowi – służy tylko do requestów. Tu pokazanie go ułatwia weryfikację, że `.env` jest poprawnie wczytane.

---

## 7. .env.example

Plik do skopiowania jako `.env` (nie commituj `.env` – może zawierać lokalne ścieżki lub originy). Build.bat w kolejnych krokach będzie nadpisywał `.env` przy buildzie.

```env
# Ścieżka bazowa – jeśli VTT w root domeny, ustaw "/"
VITE_BASE_PATH=/vtt/room1/

# Ścieżka do API (względem base path)
VITE_API_PATH=backend/api.php

# Język interfejsu (en / pl) – wykorzystywany w późniejszych krokach
VITE_LANGUAGE=pl
```

---

## Jak sprawdzić

1. W katalogu `frontend/` utwórz plik `.env` (skopiuj z `.env.example` lub ustaw ręcznie):
   - `VITE_BASE_PATH=/vtt/room1/`
   - `VITE_API_PATH=backend/api.php`

2. Zainstaluj zależności:  
   `cd frontend && npm install`

3. Uruchom dev server:  
   `npm run dev`  
   Otwórz w przeglądarce adres podany przez Vite (np. `http://localhost:5173/`).  
   - Powinna być widoczna strona z nagłówkiem "FreeRoll VTT" i tekstem "API base: /vtt/room1/backend/api.php" (lub z pełnym URL, jeśli base jest inny).

4. Sprawdź build:  
   `npm run build`  
   W katalogu `frontend/dist/` powinny pojawić się pliki (np. `assets/index.js`, `assets/index-[hash].js`, `index.html`). Otwarcie `dist/index.html` w przeglądarce może nie działać poprawnie ze względu na base path – normalnie `index.html` serwuje się z serwera WWW pod ścieżką BASE_PATH.

5. (Opcjonalnie) Jeśli masz uruchomione API z Kroku 2 pod `http://localhost:8080/backend/api.php`, ustaw w backendzie `.env` np. `ALLOWED_ORIGINS=http://localhost:5173`. W `App.jsx` możesz dodać na próbę:
   `fetch(API_BASE + '?action=auth', { credentials: 'include' }).then(r => r.json()).then(console.log)`
   (pamiętaj, że API_BASE w dev to względna ścieżka – przeglądarka wyśle request na localhost:5173/vtt/room1/backend/api.php; jeśli masz proxy w vite.config.js, request zostanie przekierowany na localhost:8080/backend/api.php).
