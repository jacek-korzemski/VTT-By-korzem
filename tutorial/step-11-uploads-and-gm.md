# Krok 11: Uploady i rola Mistrza Gry

## Cel

- **Backend:** POST `action=upload-asset` – tylko dla użytkownika z rolą MG (`isGameMaster()`). Jeśli nie MG – 403 Forbidden. Request w formacie multipart/form-data: pole `type` (token | map | background | template | paper) oraz pliki (np. `files[]` dla wielu obrazków, `file` dla pojedynczego szablonu/PDF). Zapis w odpowiednich katalogach: assets/tokens, assets/map, assets/backgrounds, assets/templates, assets/papers. Sanityzacja nazw plików, unikanie nadpisywania (np. suffix -1, -2).
- **Frontend:** Sekcja uploadu (UploadSection) wyświetlana **tylko gdy** `isGameMaster === true`. Po udanym uploadzie wywołanie callbacków odświeżających listy (map, tokeny, tła, papiery), żeby nowe pliki od razu były widoczne.

Po tym kroku tylko MG może przesyłać pliki na serwer; gracze nie widzą panelu uploadu.

---

## 1. Backend – sprawdzenie roli i typy uploadu

Na początku obsługi `upload-asset` sprawdź isGameMaster(). Jeśli false – zwróć 403 i komunikat (np. "Forbidden"). Request nie jest w JSON – dane z formularza w $_POST i $_FILES.

```php
case 'upload-asset':
    if (!isGameMaster()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden']);
        break;
    }

    $type = $_POST['type'] ?? '';
    $type = is_string($type) ? trim($type) : '';

    $baseDirMap = [
        'token' => __DIR__ . '/assets/tokens',
        'map' => __DIR__ . '/assets/map',
        'background' => __DIR__ . '/assets/backgrounds',
        'template' => __DIR__ . '/assets/templates',
        'paper' => __DIR__ . '/assets/papers',
    ];

    if (!isset($baseDirMap[$type])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid type']);
        break;
    }

    $baseDir = $baseDirMap[$type];
    if (!is_dir($baseDir)) {
        mkdir($baseDir, 0755, true);
    }
```

---

## 2. Backend – sanityzacja nazwy i unikalna ścieżka

Nazwa pliku tylko z dozwolonych znaków (np. litery, cyfry, kropka, podkreślenie, myślnik). Jeśli plik o takiej nazwie już istnieje – dodaj suffix -1, -2, itd.

```php
$sanitizeFilename = function ($name) {
    $name = basename($name);
    $name = preg_replace('/[^A-Za-z0-9._-]/', '_', $name);
    if ($name === '' || $name === '.' || $name === '..') {
        $name = 'file';
    }
    return $name;
};

$makeUniquePath = function ($dir, $filename) {
    $path = $dir . '/' . $filename;
    if (!file_exists($path)) return $path;
    $info = pathinfo($filename);
    $base = $info['filename'] ?? 'file';
    $ext = isset($info['extension']) && $info['extension'] !== '' ? ('.' . $info['extension']) : '';
    $i = 1;
    do {
        $candidate = $dir . '/' . $base . '-' . $i . $ext;
        $i++;
    } while (file_exists($candidate));
    return $candidate;
};
```

---

## 3. Backend – upload wielu obrazków (token, map, background)

Oczekiwane pole: `files` jako tablica (np. `files[]`). Dozwolone rozszerzenia: png, jpg, jpeg, gif, webp, bmp. Dla każdego pliku: sprawdź error uploadu, rozszerzenie, sanityzuj nazwę, move_uploaded_file do makeUniquePath. Zwróć listę zapisanych (originalName, storedName, type) i ewentualne błędy per plik.

```php
if (in_array($type, ['token', 'map', 'background'], true)) {
    if (empty($_FILES['files']) || !is_array($_FILES['files']['name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No files uploaded']);
        break;
    }
    $allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
    $names = $_FILES['files']['name'];
    $tmpNames = $_FILES['files']['tmp_name'];
    $errors = $_FILES['files']['error'];
    $result = ['success' => false, 'uploaded' => [], 'errors' => []];

    for ($i = 0; $i < count($names); $i++) {
        if ($errors[$i] !== UPLOAD_ERR_OK) { /* dodaj do result['errors'] */ continue; }
        $ext = strtolower(pathinfo($names[$i], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExtensions)) { /* error */ continue; }
        $safeName = $sanitizeFilename($names[$i]);
        $targetPath = $makeUniquePath($baseDir, $safeName);
        if (!move_uploaded_file($tmpNames[$i], $targetPath)) { /* error */ continue; }
        $result['uploaded'][] = ['originalName' => $names[$i], 'storedName' => basename($targetPath), 'type' => $type];
    }
    $result['success'] = count($result['uploaded']) > 0;
    echo json_encode($result);
    break;
}
```

---

## 4. Backend – upload pojedynczego szablonu (HTML) i PDF

Dla **template:** jeden plik w `$_FILES['file']`, rozszerzenie .html/.htm. Po zapisie opcjonalnie skan zawartości – jeśli zawiera `<script>`, usuń plik i zwróć błąd (bezpieczeństwo). Dla **paper:** jeden plik, rozszerzenie .pdf, obsługa błędów rozmiaru (np. UPLOAD_ERR_FORM_SIZE) z czytelnym komunikatem.

---

## 5. Frontend – warunek wyświetlania UploadSection

W Sidebar (lub w miejscu, gdzie renderujesz sekcje tylko dla MG) warunek:

```jsx
{isGameMaster && (
  <CollapsibleSection title="Upload" icon="📁" defaultOpen={false}>
    <UploadSection
      onUploadedImages={() => {
        onRefreshMapAssets?.()
        onRefreshTokenAssets?.()
      }}
      onUploadedBackgrounds={onRefreshBackgroundAssets}
      onUploadedPapers={onRefreshPapers}
    />
  </CollapsibleSection>
)}
```

`isGameMaster` pochodzi z odpowiedzi GET auth (Krok 2) i jest trzymane w stanie App.

---

## 6. Frontend – formularz uploadu i odświeżanie list

UploadSection: wybór typu (token / map / background / template / paper), input file (multiple dla token/map/background), przycisk „Wyślij”. Po wyborze plików walidacja (rozszerzenia, pojedynczy plik dla template/paper). Wysyłka: FormData z polem `type` i plikami (np. `files` lub `file`), fetch POST z body: formData (bez ręcznego Content-Type – przeglądarka ustawi multipart z boundary). credentials: 'include'. W then: przy sukcesie wywołaj callbacki onUploadedImages / onUploadedBackgrounds / onUploadedPapers, żeby rodzic odświeżył listy (ponowne GET list-map, list-tokens, assets, list-papers).

```javascript
const formData = new FormData()
formData.append('type', selectedType)
if (selectedType === 'token' || selectedType === 'map' || selectedType === 'background') {
  files.forEach(f => formData.append('files[]', f))
} else {
  formData.append('file', files[0])
}
fetch(`${API_BASE}?action=upload-asset`, {
  method: 'POST',
  credentials: 'include',
  body: formData
})
```

---

## Jak sprawdzić

1. Zaloguj się jako gracz (bez checkboxa MG) – sekcja uploadu nie powinna być widoczna. Wywołanie POST upload-asset z poziomu gracza (np. z konsoli) powinno zwrócić 403.

2. Zaloguj się jako MG. Powinna być widoczna sekcja uploadu. Wybierz typ „Token”, dodaj plik PNG, wyślij – w Network zobaczysz POST multipart; w backend/assets/tokens/ pojawi się plik. Odśwież listę tokenów w przeglądarce (lub callback) – nowy token na liście.

3. Dla typu „Template” wyślij plik .html – powinien trafić do assets/templates/. Dla „Paper” plik .pdf – do assets/papers/. Sprawdź walidację: np. template z tagiem <script> powinien być odrzucony (jeśli backend to sprawdza).
