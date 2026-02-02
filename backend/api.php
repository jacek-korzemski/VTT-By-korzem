<?php
session_start();

// ============================================
// Ładowanie konfiguracji z .env
// ============================================
function loadEnv($path) {
    if (!file_exists($path)) return [];
    
    $env = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === '#') continue;
        
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $value = trim($parts[1]);
            $value = trim($value, '"\'');
            $env[$key] = $value;
        }
    }
    
    return $env;
}

$envFile = __DIR__ . '/.env';
$env = loadEnv($envFile);

// ============================================
// CORS
// ============================================
header('Content-Type: application/json');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOriginsStr = $env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));

if (in_array($origin, $allowedOrigins) || in_array('*', $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ============================================
// Helpers
// ============================================

$dataFile = __DIR__ . '/data/state.json';

if (!file_exists(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

function generateId() {
    return uniqid('', true);
}

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
    
    // Migracja ze starego formatu (bez scen)
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

function saveState($state) {
    global $dataFile;
    $state['lastUpdate'] = time();
    $state['version'] = ($state['version'] ?? 0) + 1;
    file_put_contents($dataFile, json_encode($state, JSON_PRETTY_PRINT));
    return $state;
}

function getActiveScene(&$state) {
    foreach ($state['scenes'] as &$scene) {
        if ($scene['id'] === $state['activeSceneId']) {
            return $scene;
        }
    }
    // Fallback - pierwsza scena
    if (!empty($state['scenes'])) {
        $state['activeSceneId'] = $state['scenes'][0]['id'];
        return $state['scenes'][0];
    }
    return null;
}

function updateActiveScene(&$state, $updatedScene) {
    foreach ($state['scenes'] as $idx => $scene) {
        if ($scene['id'] === $state['activeSceneId']) {
            $state['scenes'][$idx] = $updatedScene;
            return;
        }
    }
}

function getSceneById(&$state, $sceneId) {
    foreach ($state['scenes'] as &$scene) {
        if ($scene['id'] === $sceneId) {
            return $scene;
        }
    }
    return null;
}

// ============================================
// API
// ============================================

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'state':
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

                case 'ping':
                    $state = getState();
                    $ping = $state['ping'] ?? null;
                    echo json_encode(['success' => true, 'ping' => $ping]);
                    break;

                case 'check':
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

                case 'assets':
                    $mapAssets = [];
                    $tokenAssets = [];
                    $backgroundAssets = [];
                    
                    $mapDir = __DIR__ . '/assets/map';
                    $tokenDir = __DIR__ . '/assets/tokens';
                    $bgDir = __DIR__ . '/assets/backgrounds';
                    
                    if (is_dir($mapDir)) {
                        foreach (glob($mapDir . '/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE) as $file) {
                            $filename = basename($file);
                            $name = pathinfo($filename, PATHINFO_FILENAME);
                            $mapAssets[] = [
                                'id' => $name,
                                'name' => ucfirst(str_replace(['_', '-'], ' ', $name)),
                                'src' => 'backend/assets/map/' . $filename
                            ];
                        }
                    }
                    
                    if (is_dir($tokenDir)) {
                        foreach (glob($tokenDir . '/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE) as $file) {
                            $filename = basename($file);
                            $name = pathinfo($filename, PATHINFO_FILENAME);
                            $tokenAssets[] = [
                                'id' => $name,
                                'name' => ucfirst(str_replace(['_', '-'], ' ', $name)),
                                'src' => 'backend/assets/tokens/' . $filename
                            ];
                        }
                    }
                    
                    if (is_dir($bgDir)) {
                        foreach (glob($bgDir . '/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE) as $file) {
                            $filename = basename($file);
                            $name = pathinfo($filename, PATHINFO_FILENAME);
                            $imageInfo = getimagesize($file);
                            $width = $imageInfo[0] ?? 0;
                            $height = $imageInfo[1] ?? 0;
                            
                            $backgroundAssets[] = [
                                'id' => $name,
                                'filename' => $filename,
                                'name' => ucfirst(str_replace(['_', '-'], ' ', $name)),
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
                        'mapAssets' => $mapAssets,
                        'tokenAssets' => $tokenAssets,
                        'backgroundAssets' => $backgroundAssets
                    ]);
                    break;

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

                default:
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Unknown action']);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            switch ($action) {
                // ============================================
                // SCENE MANAGEMENT
                // ============================================
                
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

                case 'delete-scene':
                    $state = getState();
                    $sceneId = $input['id'] ?? '';
                    
                    // Nie można usunąć jedynej sceny
                    if (count($state['scenes']) <= 1) {
                        echo json_encode(['success' => false, 'error' => 'Cannot delete last scene']);
                        break;
                    }
                    
                    $state['scenes'] = array_values(array_filter(
                        $state['scenes'],
                        fn($s) => $s['id'] !== $sceneId
                    ));
                    
                    // Jeśli usunięto aktywną scenę, przełącz na pierwszą
                    if ($state['activeSceneId'] === $sceneId) {
                        $state['activeSceneId'] = $state['scenes'][0]['id'];
                    }
                    
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

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
                    
                    // Sprawdź czy scena istnieje
                    $found = false;
                    foreach ($state['scenes'] as $scene) {
                        if ($scene['id'] === $sceneId) {
                            $found = true;
                            break;
                        }
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

                case 'duplicate-scene':
                    $state = getState();
                    $sceneId = $input['id'] ?? '';
                    
                    $sourceScene = getSceneById($state, $sceneId);
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

                // ============================================
                // SCENE CONTENT (operate on active scene)
                // ============================================

                case 'set-background':
                    $state = getState();
                    $activeScene = getActiveScene($state);
                    $activeScene['background'] = [
                        'src' => $input['src'],
                        'name' => $input['name'] ?? '',
                        'width' => intval($input['width'] ?? 0),
                        'height' => intval($input['height'] ?? 0)
                    ];
                    updateActiveScene($state, $activeScene);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'background' => $activeScene['background'], 'version' => $state['version']]);
                    break;

                case 'remove-background':
                    $state = getState();
                    $activeScene = getActiveScene($state);
                    $activeScene['background'] = null;
                    updateActiveScene($state, $activeScene);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

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
                        'x' => $x,
                        'y' => $y
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
                        'x' => $x,
                        'y' => $y
                    ];
                    $activeScene['tokens'][] = $token;
                    updateActiveScene($state, $activeScene);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'token' => $token, 'version' => $state['version']]);
                    break;

                case 'move-token':
                    $state = getState();
                    $activeScene = getActiveScene($state);
                    $tokenId = $input['id'];
                    $newX = intval($input['x']);
                    $newY = intval($input['y']);
                    
                    foreach ($activeScene['tokens'] as $t) {
                        if ($t['id'] !== $tokenId && $t['x'] === $newX && $t['y'] === $newY) {
                            echo json_encode(['success' => false, 'error' => 'Position occupied']);
                            exit;
                        }
                    }
                    
                    foreach ($activeScene['tokens'] as &$token) {
                        if ($token['id'] === $tokenId) {
                            $token['x'] = $newX;
                            $token['y'] = $newY;
                            break;
                        }
                    }
                    
                    updateActiveScene($state, $activeScene);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'remove-map-element':
                    $state = getState();
                    $activeScene = getActiveScene($state);
                    $elementId = $input['id'];
                    $activeScene['mapElements'] = array_values(array_filter(
                        $activeScene['mapElements'],
                        fn($el) => $el['id'] !== $elementId
                    ));
                    updateActiveScene($state, $activeScene);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'remove-token':
                    $state = getState();
                    $activeScene = getActiveScene($state);
                    $tokenId = $input['id'];
                    $activeScene['tokens'] = array_values(array_filter(
                        $activeScene['tokens'],
                        fn($t) => $t['id'] !== $tokenId
                    ));
                    updateActiveScene($state, $activeScene);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'clear':
                    // Czyści tylko aktywną scenę
                    $state = getState();
                    $activeScene = getActiveScene($state);
                    $activeScene['background'] = null;
                    $activeScene['fogOfWar'] = ['enabled' => false, 'data' => null];
                    $activeScene['mapElements'] = [];
                    $activeScene['tokens'] = [];
                    updateActiveScene($state, $activeScene);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'roll':
                    $rollsFile = __DIR__ . '/data/rolls.json';
                    if (file_exists($rollsFile)) {
                        $rolls = json_decode(file_get_contents($rollsFile), true);
                    } else {
                        $rolls = [];
                    }
                    
                    // Sprawdź typ rzutu
                    $rollType = $input['type'] ?? 'standard';
                    
                    if ($rollType === 'l5r') {
                        // Rzut L5R
                        $newRoll = [
                            'id' => generateId(),
                            'player' => htmlspecialchars(substr($input['player'] ?? 'Anonymous', 0, 20)),
                            'type' => 'l5r',
                            'dice' => array_map(function($die) {
                                return [
                                    'type' => $die['type'] ?? 'ring',
                                    'symbol' => htmlspecialchars($die['symbol'] ?? ''),
                                    'success' => intval($die['success'] ?? 0),
                                    'opportunity' => intval($die['opportunity'] ?? 0),
                                    'strife' => (bool)($die['strife'] ?? false),
                                    'exploded' => (bool)($die['exploded'] ?? false)
                                ];
                            }, $input['dice'] ?? []),
                            'totals' => [
                                'success' => intval($input['totals']['success'] ?? 0),
                                'opportunity' => intval($input['totals']['opportunity'] ?? 0),
                                'strife' => intval($input['totals']['strife'] ?? 0)
                            ],
                            'timestamp' => $input['timestamp'] ?? (time() * 1000)
                        ];
                    } else {
                        // Rzut standardowy
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
                    
                    // Zachowaj tylko ostatnie 100 rzutów
                    if (count($rolls) > 100) {
                        $rolls = array_slice($rolls, -100);
                    }
                    
                    file_put_contents($rollsFile, json_encode($rolls, JSON_PRETTY_PRINT));
                    
                    // Zwiększ wersję stanu
                    $state = getState();
                    $state = saveState($state);
                    
                    echo json_encode(['success' => true, 'roll' => $newRoll, 'version' => $state['version']]);
                    break;

                case 'clear-rolls':
                    $rollsFile = __DIR__ . '/data/rolls.json';
                    file_put_contents($rollsFile, json_encode([], JSON_PRETTY_PRINT));
                    echo json_encode(['success' => true]);
                    break;

                case 'send-ping':
                    $state = getState();
                    $state['ping'] = [
                        'x' => intval($input['x']),
                        'y' => intval($input['y']),
                        'timestamp' => time() * 1000 + intval(microtime(true) * 1000) % 1000
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

                default:
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Unknown action']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}