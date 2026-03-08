# Krok 10: Ping (wskazanie punktu na mapie)

## Cel

- **Backend:** W stanie globalnym (np. w state.json na poziomie głównym, obok scenes) pole `ping`: `{ x, y, timestamp }` lub null. POST `action=send-ping` ustawia ping na podane (x, y) i timestamp. POST `action=clear-ping` ustawia ping na null. GET `action=ping` zwraca aktualny ping.
- **Frontend:** Tryb „Ping” (np. przycisk w Sidebar) – po włączeniu klik w siatkę wysyła POST send-ping z współrzędnymi komórki. Wszyscy klienci w pollingu odbierają GET ping; jeśli jest nowy ping (np. większy timestamp), przewijają widok do tego punktu i pokazują krótką animację (np. pulsujące kółko). Przycisk „Wyczyść ping” wysyła clear-ping.

Po tym kroku MG może wskazać miejsce na mapie, a gracze automatycznie zobaczą przewinięcie i podświetlenie.

---

## 1. Backend – przechowywanie pinga

W projekcie FreeRoll VTT ping jest w tym samym pliku co stan scen (state.json), na poziomie głównym: `$state['ping'] = ['x' => int, 'y' => int, 'timestamp' => int]` lub `$state['ping'] = null`. Przy każdej zmianie pinga wywołuj saveState($state), żeby version się zwiększyło i polling check mógł rozesłać zmiany.

---

## 2. Backend – POST send-ping i clear-ping, GET ping

```php
// GET
case 'ping':
    $state = getState();
    $ping = $state['ping'] ?? null;
    echo json_encode(['success' => true, 'ping' => $ping]);
    break;

// POST
case 'send-ping':
    $state = getState();
    $state['ping'] = [
        'x' => intval($input['x']),
        'y' => intval($input['y']),
        'timestamp' => (time() * 1000) + (int)(microtime(true) * 1000) % 1000
    ];
    $state = saveState($state);
    echo json_encode(['success' => true, 'ping' => $state['ping'], 'version' => $state['version']]);
    break;

case 'clear-ping':
    $state = getState();
    $state['ping'] = null;
    $state = saveState($state);
    echo json_encode(['success' => true, 'version' => $state['version']]);
    break;
```

---

## 3. Frontend – tryb ping i klik w siatkę

- Stan: pingMode (bool), activePing ({ x, y, timestamp } | null), pingAnimation (np. { x, y, timestamp } do jednorazowej animacji).
- Gdy pingMode === true, wyłącz wybór assetu i inne narzędzia (np. selectedAsset = null przy włączeniu trybu ping). W Grid przy kliku w komórkę (gdy pingMode) nie stawiasz elementu – zamiast tego wywołuj handler sendPing(cellX, cellY).

```javascript
const handleSendPing = useCallback((x, y) => {
  fetch(`${API_BASE}?action=send-ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ x, y })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setActivePing(data.ping)
        setVersion(data.version)
        setPingMode(false)  // opcjonalnie wyłącz tryb po wysłaniu
      }
    })
    .catch(console.error)
}, [])
```

---

## 4. Frontend – przewijanie do punktu i animacja

Po odebraniu pinga z pollingu (lub po własnym send-ping) trzeba przewinąć kontener siatki tak, aby komórka (ping.x, ping.y) znalazła się w centrum (lub w widocznym obszarze). Współrzędne komórki w pikselach: cellX * CELL_SIZE, cellY * CELL_SIZE. Pozycja scroll: np. środek komórki minus połowa szerokości/wysokości kontenera, z clamp do 0 i max scroll.

```javascript
const scrollToPoint = useCallback((cellX, cellY) => {
  if (!gridContainerRef.current) return
  const container = gridContainerRef.current
  const cellSize = CELL_SIZE * zoomLevel
  const targetX = cellX * cellSize + cellSize / 2 - container.clientWidth / 2
  const targetY = cellY * cellSize + cellSize / 2 - container.clientHeight / 2
  container.scrollTo({
    left: Math.max(0, targetX),
    top: Math.max(0, targetY),
    behavior: 'smooth'
  })
  setPingAnimation({ x: cellX, y: cellY, timestamp: Date.now() })
  setTimeout(() => setPingAnimation(null), 2000)
}, [zoomLevel])
```

W pollingu przy GET ping: jeśli data.ping i data.ping.timestamp > lastPingTimestampRef.current, ustaw lastPingTimestampRef na timestamp, wywołaj scrollToPoint(data.ping.x, data.ping.y) i ustaw activePing / pingAnimation.

---

## 5. Frontend – wizualizacja pinga

Na siatce (np. warstwa nad tokenami, pod lub nad mgłą) rysuj wskaźnik tylko gdy activePing lub pingAnimation:
- pozycja w px: activePing.x * CELL_SIZE + offset, activePing.y * CELL_SIZE + offset (wyśrodkowanie w komórce).
- Krótka animacja (np. rozszerzające się kółko, opacity) przez 1–2 s – użyj pingAnimation i po timeout zeruj ją.

---

## 6. Frontend – wyczyść ping

Przycisk „Wyczyść ping” wywołuje POST clear-ping. W then: setActivePing(null), setVersion(data.version). Po pollingu wszyscy przestaną widzieć ping.

```javascript
const handleClearPing = useCallback(() => {
  fetch(`${API_BASE}?action=clear-ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setActivePing(null)
        setVersion(data.version)
      }
    })
    .catch(console.error)
}, [])
```

---

## Jak sprawdzić

1. Jako MG włącz tryb „Ping”, kliknij w dowolną komórkę siatki – w Network zobaczysz POST send-ping. Widok powinien przewinąć się do tego punktu i pokazać animację (jeśli zaimplementowana).

2. Otwórz drugą kartę (gracz). W pierwszej wyślij ping – w drugiej po pollingu (ok. 2 s) powinno nastąpić przewinięcie do tego samego punktu i animacja.

3. Kliknij „Wyczyść ping” – activePing znika, po pollingu w drugiej karcie też (brak wskaźnika).
