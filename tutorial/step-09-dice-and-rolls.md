# Krok 9: Kości i historia rzutów

## Cel

- **Backend:** Plik `backend/data/rolls.json` – tablica ostatnich rzutów. GET `action=rolls` zwraca ostatnie 50 wpisów. POST `action=roll` przyjmuje dane rzutu (gracz, kości, modyfikator, suma, typ standard/L5R) i dopisuje do pliku (max np. 100 wpisów). POST `action=clear-rolls` czyści historię.
- **Frontend:** Panel kości (DicePanel) – wybór typu kości (d4, d6, d8, d10, d12, d20, d100), liczba kości, modyfikator, imię gracza (np. w localStorage). Przyciskiem „Rzuć” generujesz wyniki po stronie klienta, wysyłasz POST roll z pełnymi danymi; optymistycznie dodajesz rzut do lokalnej historii. Historia rzutów jest też pobierana w pollingu (GET rolls), żeby wszyscy widzieli te same rzuty.

Po tym kroku gracze mogą rzucać kośćmi i widzieć wspólną historię rzutów.

---

## 1. Backend – GET rolls

Zwróć ostatnie 50 rzutów z pliku rolls.json (jeśli plik nie istnieje – pusta tablica).

```php
case 'rolls':
    $rollsFile = __DIR__ . '/data/rolls.json';
    if (file_exists($rollsFile)) {
        $rolls = json_decode(file_get_contents($rollsFile), true);
    } else {
        $rolls = [];
    }
    $rolls = array_slice($rolls, -50);
    echo json_encode(['success' => true, 'rolls' => $rolls]);
    break;
```

---

## 2. Backend – POST roll (rzut standardowy)

Klient wysyła: player (string, max 20 znaków), dice (tablica obiektów: type np. 'd6', sides, result), modifier (int), total (int), timestamp (opcjonalnie). Backend dopisuje wpis do rolls.json, ogranicza długość tablicy (np. ostatnie 100), zapisuje plik. Opcjonalnie zwiększa version w state.json, żeby klient mógł odświeżyć stan (w FreeRoll VTT tak jest).

```php
case 'roll':
    $rollsFile = __DIR__ . '/data/rolls.json';
    if (file_exists($rollsFile)) {
        $rolls = json_decode(file_get_contents($rollsFile), true);
    } else {
        $rolls = [];
    }

    $rollType = $input['type'] ?? 'standard';

    if ($rollType === 'l5r') {
        // Opcjonalnie: osobna struktura dla L5R (dice z symbolami, totals success/opportunity/strife)
        $newRoll = [ /* ... */ ];
    } else {
        $newRoll = [
            'id' => generateId(),
            'player' => htmlspecialchars(substr($input['player'] ?? 'Anonymous', 0, 20)),
            'type' => 'standard',
            'dice' => array_map(function($die) {
                return [
                    'type' => $die['type'] ?? 'd6',
                    'sides' => intval($die['sides'] ?? 6),
                    'result' => intval($die['result'] ?? 1)
                ];
            }, $input['dice'] ?? []),
            'modifier' => intval($input['modifier'] ?? 0),
            'total' => intval($input['total'] ?? 0),
            'timestamp' => $input['timestamp'] ?? (time() * 1000)
        ];
    }

    $rolls[] = $newRoll;
    if (count($rolls) > 100) {
        $rolls = array_slice($rolls, -100);
    }
    file_put_contents($rollsFile, json_encode($rolls, JSON_PRETTY_PRINT));

    // Opcjonalnie: zwiększ version stanu (do synchronizacji)
    $state = getState();
    $state = saveState($state);

    echo json_encode(['success' => true, 'roll' => $newRoll, 'version' => $state['version']]);
    break;
```

---

## 3. Backend – POST clear-rolls

Zapisz w rolls.json pustą tablicę, zwróć success.

```php
case 'clear-rolls':
    $rollsFile = __DIR__ . '/data/rolls.json';
    file_put_contents($rollsFile, json_encode([], JSON_PRETTY_PRINT));
    echo json_encode(['success' => true]);
    break;
```

---

## 4. Frontend – struktura rzutu (standard)

Przykład obiektu wysyłanego i przechowywanego:

```javascript
{
  id: '...',
  player: 'Jan',
  type: 'standard',
  dice: [
    { type: 'd6', sides: 6, result: 4 },
    { type: 'd6', sides: 6, result: 2 }
  ],
  modifier: 2,
  total: 8,
  timestamp: 1640000000000
}
```

Generowanie wyników po stronie klienta: dla każdej kości losuj `result` z przedziału 1..sides, zsumuj + modifier = total.

---

## 5. Frontend – DicePanel (uproszczony)

- Stan: selectedDice (tablica wybranych kości, np. [{ type: 'd6', sides: 6, id }]), modifier, playerName (z localStorage), isRolling (blokada przycisku).
- UI: przyciski dodawania kości (d4, d6, d8, d10, d12, d20, d100), pole modyfikatora, pole imienia (onChange zapisuje do localStorage). Przycisk „Rzuć”.
- handleRoll: dla każdej kości losuj result; zbuduj obiekt rollData (player, dice, modifier, total, timestamp); setRollHistory(prev => [...prev, { ...rollData, id: Date.now() }]); fetch POST roll z body JSON.stringify(rollData), credentials: 'include'. W then ewentualnie zaktualizuj version.
- Wyświetlanie historii: lista rollHistory od najnowszego – dla każdego rzutu pokaż gracza, kości (np. „2d6: 4, 2”), modyfikator i sumę.

---

## 6. Frontend – polling historii rzutów

W tym samym interwale co polling check (np. co 2 s) wywołaj GET rolls i ustaw setRollHistory(data.rolls || []). Dzięki temu wszyscy gracze widzą tę samą listę rzutów bez odświeżania strony.

```javascript
fetch(`${API_BASE}?action=rolls`, { credentials: 'include' })
  .then(res => res.json())
  .then(data => {
    if (data.success) setRollHistory(data.rolls || [])
  })
  .catch(console.error)
```

---

## 7. Event vtt:dice-roll (opcjonalnie)

W aplikacji FreeRoll VTT makra i inne komponenty mogą wysyłać rzut przez custom event, żeby nie duplikować logiki: `window.dispatchEvent(new CustomEvent('vtt:dice-roll', { detail: rollData }))`. App nasłuchuje tego zdarzenia i wywołuje handleDiceRoll(detail) – ten sam handler co przyciskiem „Rzuć” (dodanie do historii + POST roll).

---

## Jak sprawdzić

1. Otwórz panel kości, ustaw np. 2d6, modyfikator 0, wpisz imię. Kliknij „Rzuć” – w historii powinien pojawić się wpis z dwoma wynikami i sumą. W zakładce Network zobaczysz POST roll z body JSON.

2. Otwórz drugą kartę (lub drugą przeglądarkę) – po pollingu w obu powinna być ta sama historia rzutów.

3. Wyczyść historię (clear-rolls) – lista w obu kartach powinna być pusta (po pollingu).

4. Sprawdź, że plik backend/data/rolls.json istnieje i zawiera tablicę wpisów po rzutach; katalog data/ musi być zapisywalny.
