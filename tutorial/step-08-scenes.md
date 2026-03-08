# Krok 8: Zarządzanie scenami

## Cel

- **Backend:** POST `create-scene` (name), `delete-scene` (id), `rename-scene` (id, name), `switch-scene` (id), `duplicate-scene` (id). Nie można usunąć ostatniej sceny. Przy usunięciu aktywnej sceny aktywną staje się pierwsza z listy.
- **Frontend:** Komponent SceneManager w Sidebar – lista scen (nazwa, aktywna), przełączanie sceny (klik), tworzenie nowej, usuwanie, zmiana nazwy, duplikowanie. Po przełączeniu/scenie z pollingu – aktualizacja activeSceneId i danych sceny (updateSceneState).

Po tym kroku MG może mieć wiele scen, przełączać je i synchronizować widok u wszystkich graczy.

---

## 1. Backend – create-scene

Dodanie nowej sceny (createEmptyScene) do tablicy scenes i zapis stanu. Zwrot id i name nowej sceny oraz version.

```php
case 'create-scene':
    $state = getState();
    $name = htmlspecialchars(substr($input['name'] ?? 'New Scene', 0, 50));
    $newScene = createEmptyScene($name);
    $state['scenes'][] = $newScene;
    $state = saveState($state);
    echo json_encode([
        'success' => true,
        'scene' => ['id' => $newScene['id'], 'name' => $newScene['name']],
        'version' => $state['version']
    ]);
    break;
```

---

## 2. Backend – delete-scene

Usunięcie sceny o podanym id. Jeśli zostaje tylko jedna scena – zwróć błąd. Jeśli usuwana jest scena aktywna – ustaw activeSceneId na pierwszą z listy.

```php
case 'delete-scene':
    $state = getState();
    $sceneId = $input['id'] ?? '';

    if (count($state['scenes']) <= 1) {
        echo json_encode(['success' => false, 'error' => 'Cannot delete last scene']);
        break;
    }

    $state['scenes'] = array_values(array_filter(
        $state['scenes'],
        fn($s) => $s['id'] !== $sceneId
    ));

    if ($state['activeSceneId'] === $sceneId) {
        $state['activeSceneId'] = $state['scenes'][0]['id'];
    }

    $state = saveState($state);
    echo json_encode(['success' => true, 'version' => $state['version']]);
    break;
```

---

## 3. Backend – rename-scene i switch-scene

**rename-scene:** Znajdź scenę po id, ustaw name (sanityzacja do 50 znaków), zapisz stan.

**switch-scene:** Sprawdź, czy scena o podanym id istnieje. Ustaw activeSceneId, zapisz stan, zwróć pełne dane aktywnej sceny (scene) i version – frontend od razu może zaktualizować widok.

```php
case 'rename-scene':
    $state = getState();
    $sceneId = $input['id'] ?? '';
    $name = htmlspecialchars(substr($input['name'] ?? 'Scene', 0, 50));
    foreach ($state['scenes'] as &$scene) {
        if ($scene['id'] === $sceneId) {
            $scene['name'] = $name;
            break;
        }
    }
    $state = saveState($state);
    echo json_encode(['success' => true, 'version' => $state['version']]);
    break;

case 'switch-scene':
    $state = getState();
    $sceneId = $input['id'] ?? '';
    $found = false;
    foreach ($state['scenes'] as $scene) {
        if ($scene['id'] === $sceneId) { $found = true; break; }
    }
    if (!$found) {
        echo json_encode(['success' => false, 'error' => 'Scene not found']);
        break;
    }
    $state['activeSceneId'] = $sceneId;
    $state = saveState($state);
    $activeScene = getActiveScene($state);
    echo json_encode([
        'success' => true,
        'scene' => $activeScene,
        'version' => $state['version']
    ]);
    break;
```

---

## 4. Backend – duplicate-scene

Skopiuj scenę o podanym id (wszystkie pola: background, fogOfWar, mapElements, tokens), nadaj nowe id (generateId), nazwę np. „{oryginał} (copy)”. Dopisz do scenes, zapisz stan, zwróć id i name nowej sceny oraz version.

```php
case 'duplicate-scene':
    $state = getState();
    $sceneId = $input['id'] ?? '';
    $sourceScene = getSceneById($state, $sceneId);  // funkcja zwracająca scenę po id
    if (!$sourceScene) {
        echo json_encode(['success' => false, 'error' => 'Scene not found']);
        break;
    }
    $newScene = $sourceScene;
    $newScene['id'] = 'scene_' . generateId();
    $newScene['name'] = $sourceScene['name'] . ' (copy)';
    $state['scenes'][] = $newScene;
    $state = saveState($state);
    echo json_encode([
        'success' => true,
        'scene' => ['id' => $newScene['id'], 'name' => $newScene['name']],
        'version' => $state['version']
    ]);
    break;
```

---

## 5. Frontend – handlery scen

W App (lub kontekście):

- **handleSwitchScene(sceneId)** – POST switch-scene z `{ id: sceneId }`, credentials: 'include'. W then: setActiveSceneId(sceneId), updateSceneState(data.scene), setVersion(data.version). Opcjonalnie: reset wybranego narzędzia (selectedAsset = null, fogEditMode = false).
- **handleCreateScene(name)** – POST create-scene z `{ name }`. W then: setScenes(prev => [...prev, data.scene]), setVersion(data.version).
- **handleDeleteScene(sceneId)** – POST delete-scene z `{ id: sceneId }`. W then: setScenes(prev => prev.filter(s => s.id !== sceneId)), setVersion; jeśli usunięto aktywną, activeSceneId i dane sceny przyjdą z pollingu lub można je ustawić lokalnie na pierwszą scenę.
- **handleRenameScene(sceneId, name)** – POST rename-scene. W then: setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, name } : s)), setVersion.
- **handleDuplicateScene(sceneId)** – POST duplicate-scene. W then: setScenes(prev => [...prev, data.scene]), setVersion.

---

## 6. Frontend – SceneManager (Sidebar)

Komponent przyjmuje: scenes (tablica { id, name }), activeSceneId, onSwitchScene, onCreateScene, onDeleteScene, onRenameScene, onDuplicateScene.

- Lista: dla każdej sceny przycisk lub wiersz z nazwą; jeśli scene.id === activeSceneId – wizualne podświecenie (aktywna). Klik nazwy/wiersza → onSwitchScene(scene.id).
- Przycisk „Nowa scena” → dialog/prompt z nazwą → onCreateScene(name).
- Przy każdej scenie (np. menu kontekstowe lub ikony): „Usuń” (potwierdzenie) → onDeleteScene(id); „Zmień nazwę” (input) → onRenameScene(id, name); „Duplikuj” → onDuplicateScene(id).

Nie usuwaj ostatniej sceny – przy jednej scenie przycisk „Usuń” może być nieaktywny lub ukryty.

---

## 7. Polling i zmiana aktywnej sceny

W pollingu check, gdy hasChanges i data.data.activeSceneId !== activeSceneId, ustaw setActiveSceneId(data.data.activeSceneId) i updateSceneState(data.data.scene). Dzięki temu gdy MG przełączy scenę, wszyscy gracze po chwili zobaczą tę samą scenę (tło, tokeny, mgła).

---

## Jak sprawdzić

1. Utwórz drugą scenę („Nowa scena”). Na liście powinny być dwie pozycje; aktywna zaznaczona.

2. Kliknij drugą scenę – siatka i panel powinny pokazać dane nowej sceny (pusta mapa, brak tła/tokenów jeśli nic nie dodawałeś). W drugiej karcie po ok. 2 s też powinna być ta sama aktywna scena.

3. Zmień nazwę sceny – lista odświeży się. Duplikuj scenę – pojawi się „… (copy)”. Usuń duplikat – lista bez niego. Spróbuj usunąć ostatnią pozostałą scenę – backend powinien zwrócić błąd; nie można usunąć jedynej sceny.
