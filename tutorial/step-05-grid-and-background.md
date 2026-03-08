# Krok 5: Siatka (Grid) i tło mapy

## Cel

- **Backend:** Endpoint GET `action=assets` – lista obrazków z `backend/assets/backgrounds/` (id, name, src, width, height, opcjonalnie gridWidth/gridHeight w komórkach 64×64).
- **Backend:** POST `action=set-background` – ustawienie tła aktywnej sceny (src, name, width, height, opcjonalnie offsetX, offsetY, scale).
- **Backend:** POST `action=remove-background` – usunięcie tła z aktywnej sceny.
- **Frontend:** Komponent Grid – przewijana obszar (siatka komórek 64×64), wyświetlanie tła z przesunięciem i skalą.
- **Frontend:** Panel boczny (Sidebar) z listą tła z API i przyciskiem „Ustaw tło”; opcjonalnie „Usuń tło”. Po wyborze tła wysyłamy POST set-background i aktualizujemy stan (oraz wersję).

Po tym kroku użytkownik może wybrać tło z listy, zobaczyć je na siatce i usunąć.

---

## 1. Backend – GET assets (lista tła)

W api.php, w bloku GET:

```php
case 'assets':
    $backgroundAssets = [];
    $bgDir = __DIR__ . '/assets/backgrounds';

    if (is_dir($bgDir)) {
        foreach (glob($bgDir . '/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE) as $file) {
            $filename = basename($file);
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $imageInfo = @getimagesize($file);
            $width = $imageInfo[0] ?? 0;
            $height = $imageInfo[1] ?? 0;

            $backgroundAssets[] = [
                'id' => $name,
                'filename' => $filename,
                'name' => ucfirst(str_replace(['_', '-'], ' ', $name)),
                // src względem base URL aplikacji – frontend dopasuje BASE_PATH
                'src' => 'backend/assets/backgrounds/' . $filename,
                'width' => $width,
                'height' => $height,
                'gridWidth' => floor($width / 64),
                'gridHeight' => floor($height / 64)
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'backgroundAssets' => $backgroundAssets
    ]);
    break;
```

---

## 2. Backend – POST set-background i remove-background

Potrzebna jest funkcja `updateActiveScene(&$state, $updatedScene)` – aktualizuje w tablicy `$state['scenes']` element o id równym `activeSceneId` na `$updatedScene`.

```php
function updateActiveScene(&$state, $updatedScene) {
    foreach ($state['scenes'] as $idx => $scene) {
        if ($scene['id'] === $state['activeSceneId']) {
            $state['scenes'][$idx] = $updatedScene;
            return;
        }
    }
}
```

W bloku POST:

```php
case 'set-background':
    $state = getState();
    $activeScene = getActiveScene($state);

    $background = [
        'src' => $input['src'],
        'name' => $input['name'] ?? '',
        'width' => intval($input['width'] ?? 0),
        'height' => intval($input['height'] ?? 0),
        'offsetX' => intval($input['offsetX'] ?? $activeScene['background']['offsetX'] ?? 0),
        'offsetY' => intval($input['offsetY'] ?? $activeScene['background']['offsetY'] ?? 0),
        'scale' => isset($input['scale']) ? floatval($input['scale']) : (isset($activeScene['background']['scale']) ? floatval($activeScene['background']['scale']) : 1.0),
    ];

    $activeScene['background'] = $background;
    updateActiveScene($state, $activeScene);
    $state = saveState($state);
    echo json_encode([
        'success' => true,
        'background' => $activeScene['background'],
        'version' => $state['version']
    ]);
    break;

case 'remove-background':
    $state = getState();
    $activeScene = getActiveScene($state);
    $activeScene['background'] = null;
    updateActiveScene($state, $activeScene);
    $state = saveState($state);
    echo json_encode(['success' => true, 'version' => $state['version']]);
    break;
```

---

## 3. Frontend – konfiguracja siatki

W `config.js` (lub obok):

```javascript
export const GRID_SIZE = 128   // liczba komórek w każdym wymiarze
export const CELL_SIZE = 64    // piksele na komórkę
```

---

## 4. Frontend – komponent Grid (uproszczony)

Grid to przewijany kontener o rozmiarze `GRID_SIZE * CELL_SIZE` px. Na wstępie wyświetlamy tylko tło (obrazek z pozycją i skalą). W kolejnych krokach dodasz tokeny i elementy mapy.

```jsx
// Grid.jsx
import { useRef } from 'react'
import { BASE_PATH } from '../config'

const GRID_SIZE = 128
const CELL_SIZE = 64
const TOTAL = GRID_SIZE * CELL_SIZE

function Grid({ background, basePath }) {
  const containerRef = useRef(null)

  return (
    <div
      ref={containerRef}
      className="grid-container"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: '#0f3460',
      }}
    >
      <div
        className="grid-inner"
        style={{
          width: TOTAL,
          height: TOTAL,
          position: 'relative',
        }}
      >
        {/* Siatka komórek – opcjonalna wizualna siatka */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        />
        {/* Tło mapy – obrazek z offsetem i skalą */}
        {background && (
          <img
            src={(basePath || '') + background.src}
            alt={background.name}
            style={{
              position: 'absolute',
              left: background.offsetX ?? 0,
              top: background.offsetY ?? 0,
              width: (background.width || 0) * (background.scale ?? 1),
              height: (background.height || 0) * (background.scale ?? 1),
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Grid
```

W App.css (lub inline) warto ustawić `.grid-container` na pełną dostępną wysokość (np. `flex: 1` w layoucie).

---

## 5. Frontend – ładowanie listy tła i ustawianie tła

W App.jsx (lub w komponencie Sidebar):

```jsx
// Stan: lista assetów tła z API, aktualne tło (z danych sceny)
const [backgroundAssets, setBackgroundAssets] = useState([])
const [background, setBackground] = useState(null)

// Przy starcie pobierz listę tła
useEffect(() => {
  fetch(API_BASE + '?action=assets', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.success) setBackgroundAssets(data.backgroundAssets || [])
    })
    .catch(console.error)
}, [])

// Przy aktualizacji stanu sceny (z state/check) ustaw tło
const updateSceneState = useCallback((sceneData) => {
  if (!sceneData) return
  setBackground(sceneData.background || null)
  // ... pozostałe pola sceny
}, [])

// Handler: ustaw wybrane tło na aktywną scenę
const handleSetBackground = useCallback((bg) => {
  const payload = {
    src: bg.src,
    name: bg.name,
    width: bg.width,
    height: bg.height,
  }
  fetch(`${API_BASE}?action=set-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setBackground(data.background)
        setVersion(data.version)
      }
    })
    .catch(console.error)
}, [])

const handleRemoveBackground = useCallback(() => {
  fetch(`${API_BASE}?action=remove-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setBackground(null)
        setVersion(data.version)
      }
    })
    .catch(console.error)
}, [])
```

W JSX: przekaż `background` i `basePath={BASE_PATH}` do `Grid`. W Sidebar wyświetl `backgroundAssets` jako listę przycisków; klik wywołuje `handleSetBackground(asset)`. Przycisk „Usuń tło” wywołuje `handleRemoveBackground`.

---

## 6. URL obrazka tła

Jeśli frontend działa pod `BASE_PATH` (np. `/vtt/room1/`), a API zwraca `src: 'backend/assets/backgrounds/obraz.png'`, to pełny URL obrazka to `BASE_PATH + src`, czyli np. `/vtt/room1/backend/assets/backgrounds/obraz.png`. W dev z proxy request może iść przez Vite do PHP – wtedy ścieżka musi być taka, jak oczekuje serwer (zgodna z konfiguracją proxy lub z dokumentem, z którego ładujesz stronę).

---

## Jak sprawdzić

1. Umieść w `backend/assets/backgrounds/` co najmniej jeden plik (png/jpg). Uruchom API i w przeglądarce otwórz `.../backend/api.php?action=assets` – powinna być odpowiedź JSON z tablicą `backgroundAssets`.

2. W aplikacji otwórz panel z listą tła – powinna pojawić się pozycja dla tego pliku. Klik „Ustaw tło” – na siatce powinien pojawić się obrazek (lewym górnym rogiem w (0,0); offset/zoom dodasz w rozszerzeniach).

3. Klik „Usuń tło” – tło znika z siatki, stan po pollingu lub po odpowiedzi POST się aktualizuje.

4. Otwórz drugą kartę z tą samą aplikacją; w pierwszej ustaw tło – w drugiej po ok. 2 s powinno pojawić się to samo tło (dzięki pollingowi `check`).
