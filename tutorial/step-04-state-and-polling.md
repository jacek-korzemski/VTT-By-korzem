# Krok 4: Stan aplikacji i polling

## Cel

- **Backend:** Przechowywanie stanu gry w jednym pliku JSON (`backend/data/state.json`): lista scen, aktywna scena, dane aktywnej sceny (tło, mgła, elementy mapy, tokeny). Wersjonowanie stanu (`version`) umożliwia wykrywanie zmian.
- **Backend:** Endpoint GET `action=state` – zwraca pełny stan (sceny + aktywna scena + wersja).
- **Backend:** Endpoint GET `action=check&version=X` – zwraca zmiany tylko gdy `version` na serwerze jest większe niż X (oszczędność transferu i logiki po stronie klienta).
- **Frontend:** Przy starcie aplikacji pobranie stanu (`GET state`), zapis w stanie React (scenes, activeSceneId, dane sceny, version).
- **Frontend:** Polling co 2 s (`GET check?version=...`) i aktualizacja stanu gdy `hasChanges === true`.

Dzięki temu wielu graczy widzi ten sam stan; zmiany wprowadzone przez jednego klienta (lub MG) po chwili pojawią się u pozostałych.

---

## 1. Backend – plik stanu i pomocnicze funkcje

Ścieżka do pliku stanu oraz tworzenie katalogu `data/`, jeśli nie istnieje:

```php
// Ścieżka do pliku ze stanem – jedna wspólna dla całej aplikacji
$dataFile = __DIR__ . '/data/state.json';

if (!file_exists(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

// Unikalny identyfikator (np. dla scen, tokenów)
function generateId() {
    return uniqid('', true);
}

/**
 * Pusta scena – każda scena ma: id, name, background, fogOfWar, mapElements, tokens.
 * W kolejnych krokach te pola będą uzupełniane (np. set-background, add-token).
 */
function createEmptyScene($name = 'New Scene') {
    return [
        'id' => 'scene_' . generateId(),
        'name' => $name,
        'background' => null,
        'fogOfWar' => ['enabled' => false, 'data' => null],
        'mapElements' => [],
        'tokens' => []
    ];
}

/**
 * Odczyt stanu z dysku. Jeśli plik nie istnieje – tworzymy stan początkowy
 * z jedną sceną i zapisujemy go do state.json.
 */
function getState() {
    global $dataFile;

    if (!file_exists($dataFile)) {
        $defaultScene = createEmptyScene('Scene 1');
        $initialState = [
            'activeSceneId' => $defaultScene['id'],
            'scenes' => [$defaultScene],
            'lastUpdate' => time(),
            'version' => 0
        ];
        file_put_contents($dataFile, json_encode($initialState, JSON_PRETTY_PRINT));
        return $initialState;
    }

    $content = file_get_contents($dataFile);
    $state = json_decode($content, true);

    // Opcjonalna migracja: gdy w pliku był stary format (bez tablicy scenes),
    // budujemy jedną scenę z pól top-level i zapisujemy nowy format.
    if (!isset($state['scenes'])) {
        $scene = createEmptyScene('Scene 1');
        $scene['background'] = $state['background'] ?? null;
        $scene['fogOfWar'] = $state['fogOfWar'] ?? ['enabled' => false, 'data' => null];
        $scene['mapElements'] = $state['mapElements'] ?? [];
        $scene['tokens'] = $state['tokens'] ?? [];
        $state = [
            'activeSceneId' => $scene['id'],
            'scenes' => [$scene],
            'lastUpdate' => $state['lastUpdate'] ?? time(),
            'version' => $state['version'] ?? 0
        ];
    }

    return $state;
}

/**
 * Zapis stanu na dysk. Aktualizujemy lastUpdate i zwiększamy version,
 * żeby inne klienty (polling check) wykryły zmianę.
 */
function saveState($state) {
    global $dataFile;
    $state['lastUpdate'] = time();
    $state['version'] = ($state['version'] ?? 0) + 1;
    file_put_contents($dataFile, json_encode($state, JSON_PRETTY_PRINT));
    return $state;
}

/**
 * Pobranie referencji do aktywnej sceny (ta, której id == activeSceneId).
 * Fallback: jeśli brak dopasowania, ustawiamy activeSceneId na pierwszą scenę.
 */
function getActiveScene(&$state) {
    foreach ($state['scenes'] as &$scene) {
        if ($scene['id'] === $state['activeSceneId']) {
            return $scene;
        }
    }
    if (!empty($state['scenes'])) {
        $state['activeSceneId'] = $state['scenes'][0]['id'];
        return $state['scenes'][0];
    }
    return null;
}
```

---

## 2. Backend – endpointy GET state i GET check

W bloku `switch ($action)` w api.php (metoda GET):

```php
case 'state':
    // Pełny stan – używane przy pierwszym ładowaniu aplikacji
    $state = getState();
    $activeScene = getActiveScene($state);
    echo json_encode([
        'success' => true,
        'data' => [
            'activeSceneId' => $state['activeSceneId'],
            'scenes' => array_map(function($s) {
                return ['id' => $s['id'], 'name' => $s['name']];
            }, $state['scenes']),
            'scene' => $activeScene,
            'version' => $state['version']
        ]
    ]);
    break;

case 'check':
    // Polling – klient podaje swoją wersję; jeśli na serwerze jest nowsza, zwracamy pełne dane
    $clientVersion = intval($_GET['version'] ?? 0);
    $state = getState();

    if ($state['version'] > $clientVersion) {
        $activeScene = getActiveScene($state);
        echo json_encode([
            'success' => true,
            'hasChanges' => true,
            'data' => [
                'activeSceneId' => $state['activeSceneId'],
                'scenes' => array_map(function($s) {
                    return ['id' => $s['id'], 'name' => $s['name']];
                }, $state['scenes']),
                'scene' => $activeScene,
                'version' => $state['version']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'hasChanges' => false,
            'version' => $state['version']
        ]);
    }
    break;
```

---

## 3. Frontend – stan i pobranie przy starcie

W `App.jsx` (lub w osobnym komponencie) trzymamy: listę scen, id aktywnej sceny, dane aktywnej sceny (tło, elementy, tokeny, mgła), wersję. Przy mount pobieramy stan z API.

```jsx
import { useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../config'

function App() {
  const [scenes, setScenes] = useState([])
  const [activeSceneId, setActiveSceneId] = useState(null)
  // Dane aktywnej sceny – w kolejnych krokach: background, mapElements, tokens, fogOfWar
  const [sceneData, setSceneData] = useState(null)
  const [version, setVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Aktualizacja lokalnego stanu na podstawie obiektu "scene" z API
  const updateSceneState = useCallback((sceneData) => {
    if (!sceneData) return
    setSceneData(sceneData)
    // W kolejnych krokach: setBackground(sceneData.background), setMapElements(...) itd.
  }, [])

  // Pobranie pełnego stanu przy starcie aplikacji
  useEffect(() => {
    fetch(API_BASE + '?action=state', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScenes(data.data.scenes || [])
          setActiveSceneId(data.data.activeSceneId)
          updateSceneState(data.data.scene)
          setVersion(data.data.version || 0)
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error(err)
        setIsLoading(false)
      })
  }, [updateSceneState])

  if (isLoading) {
    return <div className="loading">Ładowanie...</div>
  }

  return (
    <div className="app">
      <h1>FreeRoll VTT</h1>
      <p>Scen: {scenes.length}, aktywna: {activeSceneId}</p>
      <p>Wersja stanu: {version}</p>
    </div>
  )
}

export default App
```

---

## 4. Frontend – polling co 2 sekundy

Co 2 s wysyłamy GET `check?version=...`. Jeśli serwer zwróci `hasChanges: true`, aktualizujemy listę scen, activeSceneId, dane sceny i version. Dzięki temu drugi gracz (lub drugi tab) zobaczy zmiany bez odświeżania strony.

```jsx
useEffect(() => {
  const interval = setInterval(() => {
    fetch(`${API_BASE}?action=check&version=${version}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.hasChanges) {
          setScenes(data.data.scenes || [])
          setActiveSceneId(data.data.activeSceneId)
          updateSceneState(data.data.scene)
          setVersion(data.data.version)
        }
      })
      .catch(console.error)
  }, 2000)

  return () => clearInterval(interval)
}, [version, updateSceneState])
```

Uwaga: w zależności od implementacji warto uwzględnić `activeSceneId` w tablicy zależności, jeśli przy zmianie aktywnej sceny resetujesz jakieś UI (np. wybrane narzędzie).

---

## Jak sprawdzić

1. **Backend:** Upewnij się, że w api.php są zaimplementowane `getState`, `saveState`, `createEmptyScene`, `getActiveScene` oraz GET `state` i `check`. Katalog `backend/data/` musi być zapisywalny (np. `chmod 755`).

2. Uruchom API (np. `php -S localhost:8080` w katalogu nad `backend/`) i frontend (`npm run dev` w `frontend/`). Upewnij się, że CORS i proxy (lub ten sam origin) są skonfigurowane tak, aby requesty do API dochodziły i zwracały 200.

3. Otwórz aplikację w przeglądarce. Powinieneś zobaczyć np. "Scen: 1, aktywna: scene_...", "Wersja stanu: 0" (lub wyższą, jeśli plik state.json już istniał).

4. Ręcznie zmień plik `backend/data/state.json` – np. zmień `version` na 5 i zapisz. W ciągu ok. 2 s w UI powinna pojawić się zaktualizowana wersja (np. "Wersja stanu: 5"). To potwierdza, że polling `check` działa.

5. Otwórz drugą kartę z tą samą aplikacją. W pierwszej karcie w kolejnych krokach coś zmienisz przez API (np. przełączenie sceny); w drugiej karcie stan powinien zaktualizować się po pollingu.
