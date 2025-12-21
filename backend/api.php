<?php
session_start();

// ============================================
// initialize from .env
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
            // Usuń cudzysłowy jeśli są
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

$dataFile = __DIR__ . '/data/state.json';

if (!file_exists(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

if (!file_exists($dataFile)) {
    $initialState = [
        'background' => null,
        'fogOfWar' => ['enabled' => false, 'data' => null],
        'mapElements' => [],
        'tokens' => [],
        'lastUpdate' => time(),
        'version' => 0
    ];
    file_put_contents($dataFile, json_encode($initialState, JSON_PRETTY_PRINT));
}

function getState() {
    global $dataFile;
    $content = file_get_contents($dataFile);
    $state = json_decode($content, true);
    
    if (!isset($state['background'])) {
        $state['background'] = null;
    }
    if (!isset($state['fogOfWar'])) {
        $state['fogOfWar'] = ['enabled' => false, 'data' => null];
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

function generateId() {
    return uniqid('', true);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'state':
                    $state = getState();
                    echo json_encode(['success' => true, 'data' => $state]);
                    break;

                case 'check':
                    $clientVersion = intval($_GET['version'] ?? 0);
                    $state = getState();
                    
                    if ($state['version'] > $clientVersion) {
                        echo json_encode([
                            'success' => true,
                            'hasChanges' => true,
                            'data' => $state
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
                
                case 'set-background':
                    $state = getState();
                    $state['background'] = [
                        'src' => $input['src'],
                        'name' => $input['name'] ?? '',
                        'width' => intval($input['width'] ?? 0),
                        'height' => intval($input['height'] ?? 0)
                    ];
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'background' => $state['background'], 'version' => $state['version']]);
                    break;

                
                case 'remove-background':
                    $state = getState();
                    $state['background'] = null;
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'add-map-element':
                    $state = getState();
                    
                    $x = intval($input['x']);
                    $y = intval($input['y']);
                    foreach ($state['mapElements'] as $el) {
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
                    $state['mapElements'][] = $element;
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'element' => $element, 'version' => $state['version']]);
                    break;

                case 'add-token':
                    $state = getState();
                    
                    $x = intval($input['x']);
                    $y = intval($input['y']);
                    foreach ($state['tokens'] as $t) {
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
                    $state['tokens'][] = $token;
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'token' => $token, 'version' => $state['version']]);
                    break;

                case 'move-token':
                    $state = getState();
                    $tokenId = $input['id'];
                    $newX = intval($input['x']);
                    $newY = intval($input['y']);
                    
                    foreach ($state['tokens'] as $t) {
                        if ($t['id'] !== $tokenId && $t['x'] === $newX && $t['y'] === $newY) {
                            echo json_encode(['success' => false, 'error' => 'Position occupied']);
                            exit;
                        }
                    }
                    
                    foreach ($state['tokens'] as &$token) {
                        if ($token['id'] === $tokenId) {
                            $token['x'] = $newX;
                            $token['y'] = $newY;
                            break;
                        }
                    }
                    
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'remove-map-element':
                    $state = getState();
                    $elementId = $input['id'];
                    $state['mapElements'] = array_values(array_filter(
                        $state['mapElements'],
                        fn($el) => $el['id'] !== $elementId
                    ));
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'remove-token':
                    $state = getState();
                    $tokenId = $input['id'];
                    $state['tokens'] = array_values(array_filter(
                        $state['tokens'],
                        fn($t) => $t['id'] !== $tokenId
                    ));
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'clear':
                    $state = [
                        'background' => null,
                        'fogOfWar' => ['enabled' => false, 'data' => null],  
                        'mapElements' => [],
                        'tokens' => [],
                        'lastUpdate' => time(),
                        'version' => 0
                    ];
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'set-fog':
                    $state = getState();
                    $state['fogOfWar'] = [
                        'enabled' => (bool)($input['enabled'] ?? false),
                        'data' => $input['data'] ?? null
                    ];
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'update-fog':
                    $state = getState();
                    if (!isset($state['fogOfWar'])) {
                        $state['fogOfWar'] = ['enabled' => true, 'data' => null];
                    }
                    $state['fogOfWar']['data'] = $input['data'] ?? null;
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'version' => $state['version']]);
                    break;

                case 'toggle-fog':
                    $state = getState();
                    if (!isset($state['fogOfWar'])) {
                        $state['fogOfWar'] = ['enabled' => false, 'data' => null];
                    }
                    $state['fogOfWar']['enabled'] = (bool)($input['enabled'] ?? !$state['fogOfWar']['enabled']);
                    $state = saveState($state);
                    echo json_encode(['success' => true, 'enabled' => $state['fogOfWar']['enabled'], 'version' => $state['version']]);
                    break;

                case 'roll':
                    // Zapisz nowy rzut
                    $rollsFile = __DIR__ . '/data/rolls.json';
                    if (file_exists($rollsFile)) {
                        $rolls = json_decode(file_get_contents($rollsFile), true);
                    } else {
                        $rolls = [];
                    }
                    
                    $newRoll = [
                        'id' => generateId(),
                        'player' => htmlspecialchars(substr($input['player'] ?? 'Anonim', 0, 20)),
                        'dice' => $input['dice'] ?? [],
                        'modifier' => intval($input['modifier'] ?? 0),
                        'total' => intval($input['total'] ?? 0),
                        'timestamp' => $input['timestamp'] ?? (time() * 1000)
                    ];
                    
                    $rolls[] = $newRoll;
                    
                    // Zachowaj tylko ostatnie 100 rzutów
                    if (count($rolls) > 100) {
                        $rolls = array_slice($rolls, -100);
                    }
                    
                    file_put_contents($rollsFile, json_encode($rolls, JSON_PRETTY_PRINT));
                    
                    // Zwiększ wersję stanu żeby inni gracze dostali update
                    $state = getState();
                    $state = saveState($state);
                    
                    echo json_encode(['success' => true, 'roll' => $newRoll, 'version' => $state['version']]);
                    break;

                case 'clear-rolls':
                    // Wyczyść historię rzutów
                    $rollsFile = __DIR__ . '/data/rolls.json';
                    file_put_contents($rollsFile, json_encode([], JSON_PRETTY_PRINT));
                    echo json_encode(['success' => true]);
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