# Krok 6: Elementy mapy i tokeny

## Cel

- **Backend:** GET `action=list-map` i `action=list-tokens` z opcjonalnym parametrem `path` – nawigacja po folderach w `backend/assets/map/` i `backend/assets/tokens/` (zwrot list folderów i plików obrazków).
- **Backend:** POST `add-map-element`, `add-token` (x, y, assetId, src) – dodanie elementu/tokenu do aktywnej sceny; kolizja: jedna pozycja (x,y) tylko dla jednego elementu/tokenu.
- **Backend:** POST `move-token` (id, x, y), `update-token` (id, size, upperLabel, lowerLabel), `remove-map-element` (id), `remove-token` (id).
- **Frontend:** Przeglądarka assetów (AssetBrowser) – foldery i pliki z API, wybór assetu (map lub token). Wybrany asset pozwala „stawiać” na siatce kliknięciem (lub drag & drop).
- **Frontend:** Na siatce: renderowanie MapElement i Token; tokeny z możliwością przeciągania (drag); gumka do elementów mapy i gumka do tokenów (RMB lub narzędzie). Etykiety i rozmiar tokenu (update-token).

Po tym kroku użytkownik może wybierać obrazki z folderów map/tokeny, klikać w siatkę, żeby je postawić, przesuwać tokeny i usuwać elementy.

---

## 1. Backend – list-map i list-tokens

Oba endpointy działają analogicznie: przyjmują opcjonalny `path` (podfolder względem assets/map lub assets/tokens), skanują katalog, zwracają `currentPath`, `folders` (name, path) i `files` (id, name, src). Zabezpieczenie: odrzucamy `path` zawierające `..`.

```php
// list-map
case 'list-map':
    $mapBaseDir = __DIR__ . '/assets/map';
    $path = isset($_GET['path']) ? trim($_GET['path']) : '';
    $path = str_replace('\\', '/', trim($path, '/'));
    if (strpos($path, '..') !== false) {
        echo json_encode(['success' => false, 'error' => 'Invalid path']);
        break;
    }
    $fullPath = $path === '' ? $mapBaseDir : $mapBaseDir . '/' . $path;
    if (!is_dir($fullPath)) {
        echo json_encode(['success' => true, 'currentPath' => $path, 'folders' => [], 'files' => []]);
        break;
    }
    $folders = [];
    $files = [];
    $extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    foreach (scandir($fullPath) as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        $entryPath = $fullPath . '/' . $entry;
        $relativePath = $path === '' ? $entry : $path . '/' . $entry;
        if (is_dir($entryPath)) {
            $folders[] = ['name' => $entry, 'path' => $relativePath];
        } else {
            $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if (in_array($ext, $extensions)) {
                $name = pathinfo($entry, PATHINFO_FILENAME);
                $files[] = [
                    'id' => $relativePath,
                    'name' => ucfirst(str_replace(['_', '-'], ' ', $name)),
                    'src' => 'backend/assets/map/' . $relativePath
                ];
            }
        }
    }
    usort($folders, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    usort($files, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    echo json_encode(['success' => true, 'currentPath' => $path, 'folders' => $folders, 'files' => $files]);
    break;
```

Dla tokenów: `$tokenBaseDir = __DIR__ . '/assets/tokens'`, `backend/assets/tokens/` w src, akcja `list-tokens`.

---

## 2. Backend – add-map-element i add-token

Sprawdzamy, czy pozycja (x, y) nie jest zajęta (dla map – przez inny element mapy; dla tokenów – przez inny token). Generujemy id (np. `generateId()`), dopisujemy element/token do `$activeScene['mapElements']` / `$activeScene['tokens']`, zapisujemy stan.

```php
case 'add-map-element':
    $state = getState();
    $activeScene = getActiveScene($state);
    $x = intval($input['x']);
    $y = intval($input['y']);
    foreach ($activeScene['mapElements'] as $el) {
        if ($el['x'] === $x && $el['y'] === $y) {
            echo json_encode(['success' => false, 'error' => 'Position occupied']);
            exit;
        }
    }
    $element = [
        'id' => generateId(),
        'assetId' => $input['assetId'],
        'src' => $input['src'],
        'x' => $x, 'y' => $y
    ];
    $activeScene['mapElements'][] = $element;
    updateActiveScene($state, $activeScene);
    $state = saveState($state);
    echo json_encode(['success' => true, 'element' => $element, 'version' => $state['version']]);
    break;

case 'add-token':
    $state = getState();
    $activeScene = getActiveScene($state);
    $x = intval($input['x']);
    $y = intval($input['y']);
    foreach ($activeScene['tokens'] as $t) {
        if ($t['x'] === $x && $t['y'] === $y) {
            echo json_encode(['success' => false, 'error' => 'Position occupied by token']);
            exit;
        }
    }
    $token = [
        'id' => generateId(),
        'assetId' => $input['assetId'],
        'src' => $input['src'],
        'x' => $x, 'y' => $y
    ];
    $activeScene['tokens'][] = $token;
    updateActiveScene($state, $activeScene);
    $state = saveState($state);
    echo json_encode(['success' => true, 'token' => $token, 'version' => $state['version']]);
    break;
```

---

## 3. Backend – move-token, update-token, remove-map-element, remove-token

- **move-token:** Znajdź token po `id`, sprawdź czy (newX, newY) nie jest zajęte przez inny token, ustaw token.x, token.y, zapisz stan.
- **update-token:** Znajdź token po `id`, nadpisz tylko przekazane pola (np. size, upperLabel, lowerLabel), zapisz stan.
- **remove-map-element / remove-token:** Usuń z tablicy element/token o podanym id, zapisz stan, zwróć nową wersję.

(Implementacja analogiczna do opisu – w każdym przypadku getState, getActiveScene, modyfikacja, updateActiveScene, saveState, echo JSON.)

---

## 4. Frontend – stan i handlery

W App (lub w kontekście):

- `mapPath` / `tokenPath` – aktualna ścieżka w przeglądarce map/tokenów.
- `mapFolders`, `mapFiles`, `tokenFolders`, `tokenFiles` – z GET list-map / list-tokens.
- `selectedAsset`, `selectedType` ('map' | 'token') – wybrany asset do stawiania; null = nic nie wybrano.
- `mapElements`, `tokens` – z danych aktywnej sceny (updateSceneState).
- `isEraserActive` (gumka elementów), `isTokenEraserActive` (gumka tokenów).

Handlery (wszystkie z `credentials: 'include'`):

- **onMapPathChange / onTokenPathChange** – ustaw path, wywołaj fetch list-map / list-tokens z `&path=...`.
- **onSelectAsset(asset, type)** – ustaw selectedAsset i selectedType; przy ponownym kliku tego samego – odznacz (null).
- **onCellClick(x, y)** – jeśli jest selectedAsset i selectedType, wywołaj add-map-element lub add-token (x, y, assetId, src); po sukcesie dodaj element/token do stanu lokalnego i ewentualnie odznacz (opcjonalnie).
- **onTokenMove(tokenId, newX, newY)** – optymistyczna aktualizacja lokalna, POST move-token; po sukcesie zaktualizuj version.
- **onTokenUpdate(tokenId, updates)** – optymistyczna aktualizacja, POST update-token.
- **onRemoveMapElement(id)** – POST remove-map-element, po sukcesie usuń z mapElements.
- **onRemoveToken(id)** – POST remove-token, po sukcesie usuń z tokens.

Sprawdzenie zajętości przed dodaniem: `isOccupiedByToken(x,y)` i `isOccupiedByMapElement(x,y)` – funkcje sprawdzające tablice tokens/mapElements.

---

## 5. Frontend – klik w komórkę siatki

W Grid potrzebna jest funkcja: z pozycji myszy (clientX, clientY) + scroll i zoom oblicz indeks komórki (cellX, cellY). Przy kliku (gdy nie jest włączone przeciąganie tokenu) wywołaj `onCellClick(cellX, cellY)`.

```javascript
// Przykład: getCellFromMousePosition(ev, gridContainerRef, zoomLevel, CELL_SIZE)
// rect = gridRef.getBoundingClientRect(), scrollLeft/scrollTop
// cellX = floor(((clientX - rect.left) / zoomLevel + scrollLeft / zoomLevel) / CELL_SIZE)
// cellY = floor(((clientY - rect.top) / zoomLevel + scrollTop / zoomLevel) / CELL_SIZE)
// Zwróć { x: cellX, y: cellY } jeśli w granicach [0, GRID_SIZE), inaczej null.
```

W handlerze kliku: jeśli `selectedAsset` i `selectedType` i komórka nie jest zajęta – wywołaj placeAssetAt(asset, type, x, y).

---

## 6. Frontend – renderowanie MapElement i Token

- **MapElement:** Pozycja w pikselach: `left: element.x * CELL_SIZE + CELL_SIZE/2`, `top: element.y * CELL_SIZE + CELL_SIZE/2` (wyśrodkowanie), obrazek `basePath + element.src`. Klasa np. `erasable` gdy isEraserActive; przy kliku w element w trybie gumki – onEraserClick(element.id) → remove-map-element.
- **Token:** Analogiczna pozycja; rozmiar (scale) z token.size (domyślnie 1). Obsługa drag: onMouseDown rozpoczyna przeciąganie (ustaw draggedToken, dragPosition), onMouseMove aktualizuje pozycję w px, onMouseUp/onMouseLeave – konwersja pozycji na komórkę, wywołanie onTokenMove(tokenId, cellX, cellY). Token może mieć upperLabel/lowerLabel (update-token). Przy isTokenEraserActive i kliku – remove-token.

---

## 7. Frontend – AssetBrowser (uproszczony)

Komponent przyjmuje: currentPath, folders, files, onPathChange (np. „wstecz” lub klik folderu), onSelectFile(file). Dla map: path = mapPath, onPathChange ustawia mapPath; dla tokenów: tokenPath. Lista plików – przycisk/div na każdy plik; klik wywołuje onSelectFile(file) – w App to ustawia selectedAsset = file, selectedType = 'map' lub 'token'. Wyświetl aktualnie wybrany asset (np. podświetlenie) i możliwość odznaczenia.

---

## Jak sprawdzić

1. Umieść w `backend/assets/map/` i `backend/assets/tokens/` po kilka obrazków. Sprawdź GET list-map i list-tokens (z path i bez) – zwrot folders + files.

2. W UI wybierz asset z mapy, kliknij w pustą komórkę siatki – powinien pojawić się element mapy. Wybierz token, kliknij w inną komórkę – token się pojawi.

3. Przeciągnij token na inną komórkę – pozycja powinna się zapisać (move-token) i po pollingu być taka sama w drugiej karcie.

4. Włącz „gumkę” elementów, kliknij w element mapy – element znika (remove-map-element). To samo dla gumki tokenów i tokenu.

5. Ustaw etykietę/rozmiar tokenu (jeśli masz UI do update-token) – zmiana powinna być zapisana i widoczna po odświeżeniu/pollingu.
