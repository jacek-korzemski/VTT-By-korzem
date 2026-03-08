# Krok 12: Notatniki, PDF i makra

## Cel

- **Backend:** GET `action=list-templates` – lista plików .html z assets/templates (id, name). GET `action=get-template&id=...` – zwraca treść pliku HTML (Content-Type: text/html). GET `action=list-papers` – lista PDF z assets/papers (id, name, src). GET `action=get-paper&id=...` – zwraca binarny PDF (Content-Type: application/pdf, readfile).
- **Frontend:** Dolny panel (BottomPanel) z zakładkami: Notatniki, PDF, Makra. Panel może być rozwijany/zwijany i mieć zmienną wysokość (np. suwak).
- **Notatniki (NotesPanel):** Kilka notatników (np. 3) z edytorem WYSIWYG (lub textarea). Zapisywanie/ładowanie treści w localStorage. Opcjonalnie „Załaduj szablon z serwera” – GET list-templates, wybór, GET get-template – wstawienie HTML do notatnika. Eksport do HTML/JSON.
- **PDF (PdfPanel):** Lista PDF z GET list-papers. Po wyborze pliku – URL do wyświetlenia to np. API_BASE + '?action=get-paper&id=' + encodeURIComponent(id); dla iframe lub komponentu PDF (np. react-pdf) z credentials. Opcjonalnie przechowywanie dodatkowych PDF w localStorage (per klient).
- **Makra (MacroEditor):** Lista makr w localStorage (np. wyrażenia typu „2d6+3”, „1d20+@str”). Edycja, sortowanie, import/export. Uruchomienie makra – parsowanie wyrażenia (np. 2d6+@str), odczyt wartości @str z pól notatnika (np. z szablonu postaci), wygenerowanie rzutu i wysłanie eventu vtt:dice-roll (Krok 9).

Po tym kroku użytkownicy mają notatniki, podgląd PDF z serwera i edytor makr kości.

---

## 1. Backend – list-templates i get-template

```php
case 'list-templates':
    $templates = [];
    $templatesDir = __DIR__ . '/assets/templates';
    if (is_dir($templatesDir)) {
        foreach (glob($templatesDir . '/*.html') as $file) {
            $filename = basename($file);
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $templates[] = [
                'id' => $filename,
                'name' => ucfirst(str_replace(['_', '-'], ' ', $name))
            ];
        }
    }
    usort($templates, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    echo json_encode(['success' => true, 'templates' => $templates]);
    break;

case 'get-template':
    $id = basename($_GET['id'] ?? '');
    $filePath = __DIR__ . '/assets/templates/' . $id;
    if ($id && preg_match('/\.html?$/i', $id) && is_file($filePath)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($filePath);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Template not found']);
    }
    break;
```

Uwaga: get-template zwraca surowy HTML, nie JSON – frontend używa fetch i .text() (lub jeśli iframe – src na URL z action=get-template&id=...).

---

## 2. Backend – list-papers i get-paper

```php
case 'list-papers':
    $papers = [];
    $papersDir = __DIR__ . '/assets/papers';
    if (is_dir($papersDir)) {
        foreach (glob($papersDir . '/*.pdf') as $file) {
            $filename = basename($file);
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $papers[] = [
                'id' => $filename,
                'name' => ucfirst(str_replace(['_', '-'], ' ', $name)),
                'src' => 'backend/assets/papers/' . $filename
            ];
        }
    }
    usort($papers, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    echo json_encode(['success' => true, 'papers' => $papers]);
    break;

case 'get-paper':
    $id = basename($_GET['id'] ?? '');
    $filePath = __DIR__ . '/assets/papers/' . $id;
    if ($id && preg_match('/\.pdf$/i', $id) && is_file($filePath)) {
        header('Content-Type: application/pdf');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Paper not found']);
    }
    break;
```

Do wyświetlenia PDF w przeglądarce: URL z credentials (np. fetch z credentials: 'include' i blob, potem URL.createObjectURL(blob) dla iframe lub react-pdf).

---

## 3. Frontend – BottomPanel (zakładki)

Komponent z zakładkami (np. Notatniki, PDF, Makra). Stan: activeTab (id zakładki lub null gdy panel zamknięty). Przy zmianie zakładki renderuj odpowiedni panel (NotesPanel, PdfPanel, MacroEditor). Opcjonalnie: suwak do zmiany wysokości panelu, zapis wysokości w localStorage. Lazy load: React.lazy dla PdfPanel i MacroEditor, żeby nie ładować PDF.js od razu.

```jsx
const PANELS = [
  { id: 'notes', icon: '📝', titleKey: 'notes.title' },
  { id: 'pdf', icon: '📄', titleKey: 'pdf.title' },
  { id: 'macros', icon: '⚡', titleKey: 'macros.title' },
]

function BottomPanel({ activeTab, onTabChange }) {
  const isOpen = activeTab !== null
  return (
    <div className="bottom-panel">
      <div className="tabs">
        {PANELS.map(p => (
          <button key={p.id} onClick={() => onTabChange(activeTab === p.id ? null : p.id)}>
            {p.icon} {t(p.titleKey)}
          </button>
        ))}
      </div>
      {isOpen && (
        activeTab === 'notes' && <NotesPanel /> ||
        activeTab === 'pdf' && <PdfPanel /> ||
        activeTab === 'macros' && <MacroEditor />
      )}
    </div>
  )
}
```

W App: stan bottomPanelTab, przyciski w UI (np. pasek u dołu) ustawiają activeTab; BottomPanel otrzymuje activeTab i onTabChange.

---

## 4. Frontend – NotesPanel (skrót)

- Kilka slotów notatników (np. 3). Każdy: tytuł (edytowalny), treść (WYSIWYG lub textarea). Stan w localStorage (np. klucz vtt_notes_1, vtt_notes_2, struktura { title, content }).
- Przyciski: Załaduj szablon – fetch list-templates, wybór z listy, fetch get-template (URL lub action), wstawienie HTML do wybranego notatnika. Export: zapis JSON (tytuł + treść) lub generowanie pliku HTML.
- Kontekst szablonów (NotesTemplateContext): jeśli używasz makr z referencjami do pól (np. @str), notatnik może być szablonem z polami name="str"; kontekst udostępnia getFieldValue(name) dla MacroEditor.

---

## 5. Frontend – PdfPanel (skrót)

- fetch(API_BASE + '?action=list-papers', { credentials: 'include' }) → lista. Dla każdego PDF link lub przycisk „Otwórz”.
- URL do wyświetlenia: `${API_BASE}?action=get-paper&id=${encodeURIComponent(pdf.id)}` – z credentials w fetch trzeba pobrać blob i utworzyć object URL: `const res = await fetch(url, { credentials: 'include' }); const blob = await res.blob(); const src = URL.createObjectURL(blob)` – ten src przekaż do iframe lub do react-pdf (Document file={src}). Pamiętaj o revokeObjectURL przy odmontowaniu.
- Opcjonalnie: przechowywanie PDF dodanych lokalnie (np. wybór pliku, FileReader, zapis w localStorage jako base64 lub IndexedDB) – tylko per klient.

---

## 6. Frontend – MacroEditor (skrót)

- Lista makr w localStorage (np. vtt_macros – tablica { id, name, expression }). Dodawanie, edycja, usuwanie, sortowanie. Import/export jako JSON.
- Wyrażenie: np. "2d6+3", "1d20+@str" – parsowanie (regex lub prosty parser), zamiana @field na wartość z kontekstu notatnika (getFieldValue('str')). Generowanie rzutu (losowanie kości), złożenie obiektu rollData i dispatchEvent(new CustomEvent('vtt:dice-roll', { detail: rollData })).
- Aplikacja nasłuchuje vtt:dice-roll i wywołuje handleDiceRoll (POST roll + aktualizacja historii) – makro trafia do wspólnej historii jak zwykły rzut.

---

## Jak sprawdzić

1. Umieść plik .html w backend/assets/templates/ i plik .pdf w backend/assets/papers/. GET list-templates i list-papers zwracają odpowiednie listy. GET get-template&id=plik.html zwraca HTML; GET get-paper&id=plik.pdf zwraca PDF (nagłówek Content-Type: application/pdf).

2. Otwórz zakładkę Notatniki – dodaj tekst, odśwież stronę – treść z localStorage powinna się zachować. Załaduj szablon z serwera – wybierz szablon z listy, treść powinna pojawić się w notatniku.

3. Otwórz zakładkę PDF – lista z serwera; po kliknięciu „Otwórz” PDF wyświetla się (iframe lub react-pdf).

4. W Makrach dodaj makro np. "2d6+0", uruchom – w historii rzutów powinien pojawić się wpis (event vtt:dice-roll obsłużony przez App).
