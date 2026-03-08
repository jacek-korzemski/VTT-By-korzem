# Krok 7: Mgła wojny (Fog of War)

## Cel

- **Backend:** W stanie aktywnej sceny pole `fogOfWar`: `{ enabled: bool, data: string | null }`. `data` to bitmapa komórek zakodowana w Base64 (1 bit na komórkę: 0 = zasłonięte, 1 = odsłonięte).
- **Backend:** POST `set-fog` (enabled, data), `update-fog` (data), `toggle-fog` (enabled) – modyfikacja mgły aktywnej sceny.
- **Frontend:** Bitmapa w pamięci jako `Uint8Array` (GRID_SIZE×GRID_SIZE bitów = GRID_SIZE*GRID_SIZE/8 bajtów). Funkcje: createEmptyFog (wszystkie 0), createRevealedFog (wszystkie 1), isRevealed, setCell, applyCircleBrush (okrągły pędzel), encodeToBase64 / decodeFromBase64.
- **Frontend:** Komponent canvas rysujący czarne prostokąty tylko nad komórkami nieodsłoniętymi; opcjonalnie 50% opacity dla MG (podgląd).
- **Frontend:** Tryb edycji mgły (tylko dla GM): pędzel reveal/hide, rozmiar pędzla. Przy zmianie bitmapy – debounce (np. 300 ms) i POST update-fog z zakodowaną bitmapą.

Po tym kroku MG może włączyć mgłę, malować odsłonięcia/zasłonięcia okrągłym pędzlem; gracze widzą tylko odsłonięte obszary.

---

## 1. Format bitmapy

Siatka ma GRID_SIZE×GRID_SIZE komórek (np. 128×128). Jedna komórka = jeden bit: 0 = zasłonięte, 1 = odsłonięte. Bajty w kolejności od lewej do prawej, od góry do dołu. Indeks komórki (x, y): `index = y * GRID_SIZE + x`. Bajt: `byteIndex = floor(index / 8)`, bit: `bitIndex = index % 8`. Ustawienie bitu na 1: `bitmap[byteIndex] |= (1 << bitIndex)`.

---

## 2. Backend – przechowywanie i endpointy

W stanie sceny: `fogOfWar: { enabled: true, data: 'base64string...' }`. Przy pierwszym włączeniu mgły można ustawić data na null – frontend wyśle pierwszą bitmapę przez update-fog.

```php
// set-fog – włączenie/wyłączenie i opcjonalnie początkowa bitmapa
case 'set-fog':
    $state = getState();
    $activeScene = getActiveScene($state);
    $activeScene['fogOfWar'] = [
        'enabled' => (bool)($input['enabled'] ?? false),
        'data' => $input['data'] ?? null
    ];
    updateActiveScene($state, $activeScene);
    $state = saveState($state);
    echo json_encode(['success' => true, 'version' => $state['version']]);
    break;

// update-fog – tylko aktualizacja bitmapy (data)
case 'update-fog':
    $state = getState();
    $activeScene = getActiveScene($state);
    if (!isset($activeScene['fogOfWar'])) {
        $activeScene['fogOfWar'] = ['enabled' => true, 'data' => null];
    }
    $activeScene['fogOfWar']['data'] = $input['data'] ?? null;
    updateActiveScene($state, $activeScene);
    $state = saveState($state);
    echo json_encode(['success' => true, 'version' => $state['version']]);
    break;

// toggle-fog – przełączenie włączone/wyłączone
case 'toggle-fog':
    $state = getState();
    $activeScene = getActiveScene($state);
    if (!isset($activeScene['fogOfWar'])) {
        $activeScene['fogOfWar'] = ['enabled' => false, 'data' => null];
    }
    $activeScene['fogOfWar']['enabled'] = (bool)($input['enabled'] ?? !$activeScene['fogOfWar']['enabled']);
    updateActiveScene($state, $activeScene);
    $state = saveState($state);
    echo json_encode(['success' => true, 'enabled' => $activeScene['fogOfWar']['enabled'], 'version' => $state['version']]);
    break;
```

---

## 3. Frontend – fogBitmap.js (utils)

```javascript
import { GRID_SIZE } from '../config'

const BITMAP_SIZE = (GRID_SIZE * GRID_SIZE) / 8

// Wszystkie komórki zasłonięte (0)
export function createEmptyFog() {
  return new Uint8Array(BITMAP_SIZE)
}

// Wszystkie komórki odsłonięte (255 w każdym bajcie)
export function createRevealedFog() {
  const bitmap = new Uint8Array(BITMAP_SIZE)
  bitmap.fill(255)
  return bitmap
}

export function isRevealed(bitmap, x, y) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false
  const index = y * GRID_SIZE + x
  const byteIndex = Math.floor(index / 8)
  const bitIndex = index % 8
  return (bitmap[byteIndex] & (1 << bitIndex)) !== 0
}

export function setCell(bitmap, x, y, revealed) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return
  const index = y * GRID_SIZE + x
  const byteIndex = Math.floor(index / 8)
  const bitIndex = index % 8
  if (revealed) {
    bitmap[byteIndex] |= (1 << bitIndex)
  } else {
    bitmap[byteIndex] &= ~(1 << bitIndex)
  }
}

// Pędzel kwadratowy
export function applyBrush(bitmap, centerX, centerY, radius, reveal) {
  const newBitmap = new Uint8Array(bitmap)
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      setCell(newBitmap, centerX + dx, centerY + dy, reveal)
    }
  }
  return newBitmap
}

// Pędzel okrągły (ładniejszy efekt)
export function applyCircleBrush(bitmap, centerX, centerY, radius, reveal) {
  const newBitmap = new Uint8Array(bitmap)
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        setCell(newBitmap, centerX + dx, centerY + dy, reveal)
      }
    }
  }
  return newBitmap
}

export function encodeToBase64(bitmap) {
  let binary = ''
  for (let i = 0; i < bitmap.length; i++) {
    binary += String.fromCharCode(bitmap[i])
  }
  return btoa(binary)
}

export function decodeFromBase64(base64) {
  if (!base64) return createEmptyFog()
  try {
    const binary = atob(base64)
    const bitmap = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bitmap[i] = binary.charCodeAt(i)
    }
    return bitmap
  } catch {
    return createEmptyFog()
  }
}
```

---

## 4. Frontend – aktualizacja stanu sceny i fogBitmap

W updateSceneState po otrzymaniu danych sceny (z state/check) ustawiamy też mgłę:

```javascript
const [fogOfWar, setFogOfWar] = useState({ enabled: false, data: null })
const [fogBitmap, setFogBitmap] = useState(() => createEmptyFog())

const updateSceneState = useCallback((sceneData) => {
  if (!sceneData) return
  setFogOfWar(sceneData.fogOfWar || { enabled: false, data: null })
  setFogBitmap(decodeFromBase64(sceneData.fogOfWar?.data))
  // ... background, mapElements, tokens
}, [])
```

---

## 5. Frontend – komponent FogOfWar (canvas)

Komponent otrzymuje: bitmap, enabled, gmOpacity (np. 0.5 dla MG), isEditing, brushSize, revealMode (true = odsłaniaj, false = zasłaniaj), onBitmapChange(newBitmap), zoomLevel (do przeliczenia myszy na komórkę).

- Rysowanie: dla każdej komórki (x,y) sprawdź isRevealed(bitmap, x, y). Jeśli nie odsłonięte – rysuj czarny prostokąt (CELL_SIZE×CELL_SIZE). Opacity: gmOpacity ? 0.5 : 1.
- Edycja: przy mousedown/mousemove (gdy isEditing) oblicz komórkę spod kursora, wywołaj applyCircleBrush(bitmap, cellX, cellY, brushSize-1, revealMode), przekaż nową bitmapę do onBitmapChange. Unikaj wielokrotnego malowania tej samej komórki w jednym „pociągnięciu” (np. lastCellRef).

Canvas w rozmiarze GRID_SIZE*CELL_SIZE; pozycjonowany absolutnie nad siatką (ten sam kontener co tło/tokeny). pointer-events tylko gdy enabled; w trybie edycji canvas zbiera zdarzenia myszy.

---

## 6. Frontend – zapis do API z debounce

W App (lub nad FogOfWar) przy każdej zmianie bitmapy (onBitmapChange) nie wysyłaj od razu requestu – użyj setTimeout (np. 300 ms). Przy kolejnej zmianie wyczyść poprzedni timeout i ustaw nowy. Po upływie czasu: encodeToBase64(bitmap), POST `action=update-fog` z body `{ data: base64 }`, credentials: 'include'. Po sukcesie możesz zaktualizować version. Dzięki debounce przy malowaniu pędzlem wysyłanych jest mniej requestów.

```javascript
const fogUpdateTimeoutRef = useRef(null)

const handleFogBitmapChange = useCallback((newBitmap) => {
  setFogBitmap(newBitmap)
  if (fogUpdateTimeoutRef.current) clearTimeout(fogUpdateTimeoutRef.current)
  fogUpdateTimeoutRef.current = setTimeout(() => {
    const base64 = encodeToBase64(newBitmap)
    fetch(`${API_BASE}?action=update-fog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ data: base64 })
    })
      .then(res => res.json())
      .then(data => { if (data.success) setVersion(data.version) })
      .catch(console.error)
  }, 300)
}, [])
```

---

## 7. Frontend – toggle mgły i przyciski Reveal all / Hide all

- **Toggle:** Przycisk „Włącz mgłę” / „Wyłącz mgłę” wywołuje POST toggle-fog (enabled: true/false). W odpowiedzi backend zwraca aktualne enabled i version; ustawiasz fogOfWar.enabled i version.
- **Reveal all:** Ustaw fogBitmap na createRevealedFog(), wywołaj handleFogBitmapChange(newBitmap) – zapisze się przez debounce.
- **Hide all:** Analogicznie createEmptyFog() i handleFogBitmapChange.

Panel mgły (tylko dla GM): checkbox „Edycja mgły” (fogEditMode), przełącznik Reveal/Hide (fogRevealMode), suwak rozmiaru pędzla (fogBrushSize), opcjonalnie „50% opacity dla MG” (fogGmOpacity).

---

## Jak sprawdzić

1. Jako GM włącz mgłę (toggle-fog). Na siatce powinna pojawić się czarna warstwa (cała mapa zasłonięta, jeśli data była pusta/null i front zinterpretował to jako empty fog).

2. Wejdź w tryb edycji mgły, wybierz „Reveal”, rozmiar pędzla np. 3. Maluj po siatce – obszary powinny się odsłaniać. Po ok. 300 ms w network zobaczysz POST update-fog. Otwórz drugą kartę (gracz) – po pollingu powinna widzieć tę samą mgłę i odsłonięcia.

3. „Hide all” – cała mapa znów zasłonięta. „Reveal all” – cała odsłonięta.

4. Opcja 50% opacity dla MG – jako MG widzisz półprzezroczystą mgłę; gracz widzi pełną nieprzezroczystość nad nieodsłoniętymi komórkami.
