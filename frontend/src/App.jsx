import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Grid from './components/Grid'
import { 
  createEmptyFog, 
  createRevealedFog, 
  encodeToBase64, 
  decodeFromBase64,
} from './utils/fogBitmap'
import DicePanel from './components/DicePanel'
import { BASE_PATH, API_BASE } from '../config'
import { t } from './lang';
import NotesPanel from './components/NotesPanel'

function App() {
  const [scenes, setScenes] = useState([])
  const [notesPanelOpen, setNotesPanelOpen] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState(null)
  const [background, setBackground] = useState(null)
  const [mapElements, setMapElements] = useState([])
  const [tokens, setTokens] = useState([])
  const [mapPath, setMapPath] = useState('')
  const [mapFolders, setMapFolders] = useState([])
  const [mapFiles, setMapFiles] = useState([])
  const [tokenPath, setTokenPath] = useState('')
  const [tokenFolders, setTokenFolders] = useState([])
  const [tokenFiles, setTokenFiles] = useState([])
  const [backgroundAssets, setBackgroundAssets] = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [isEraserActive, setIsEraserActive] = useState(false)  
  const [version, setVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [fogOfWar, setFogOfWar] = useState({ enabled: false, data: null })
  const [fogBitmap, setFogBitmap] = useState(() => createEmptyFog())
  const [fogEditMode, setFogEditMode] = useState(false)
  const [fogRevealMode, setFogRevealMode] = useState(true)
  const [fogBrushSize, setFogBrushSize] = useState(3)
  const [fogGmOpacity, setFogGmOpacity] = useState(false)
  const [dicePanelOpen, setDicePanelOpen] = useState(false)
  const [rollHistory, setRollHistory] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth >= 576
  )
  const [zoomLevel, setZoomLevel] = useState(1)
  const [pingMode, setPingMode] = useState(false)
  const [pingAnimation, setPingAnimation] = useState(null)
  const [activePing, setActivePing] = useState(null)
  const lastPingTimestampRef = useRef(0)
  const gridContainerRef = useRef(null)
  const [isGameMaster, setIsGameMaster] = useState(false)
  
  const fogUpdateTimeoutRef = useRef(null)

  // Sprawdź rolę użytkownika na początku
  useEffect(() => {
    // W trybie deweloperskim sprawdź localStorage dla łatwego przełączania roli
    const devGm = localStorage.getItem('dev_gm') === '1'
    const gmParam = devGm ? '&gm=1' : ''
    
    fetch(`${API_BASE}?action=auth${gmParam}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsGameMaster(data.isGameMaster || false)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 575.98px)')
    const handler = () => {
      if (mq.matches) {
        setSidebarOpen(false)
        setDicePanelOpen(false)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleZoomChange = useCallback((newZoom) => {
    const clamped = Math.max(0.4, Math.min(1.4, newZoom))
    setZoomLevel(Math.round(clamped * 100) / 100)
  }, [])

  const updateSceneState = useCallback((sceneData) => {
    if (!sceneData) return
    setBackground(sceneData.background || null)
    setMapElements(sceneData.mapElements || [])
    setTokens(sceneData.tokens || [])
    setFogOfWar(sceneData.fogOfWar || { enabled: false, data: null })
    setFogBitmap(decodeFromBase64(sceneData.fogOfWar?.data))
  }, [])

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
          setPingMode(false)
        }
      })
      .catch(console.error)
  }, [])

  const handleTogglePing = useCallback(() => {
    const newPingMode = !pingMode
    setPingMode(newPingMode)
    
    if (newPingMode) {
      setSelectedAsset(null)
      setSelectedType(null)
      setIsEraserActive(false)
      setFogEditMode(false)
    }
  }, [pingMode])

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

  const scrollToPoint = useCallback((cellX, cellY) => {
    if (!gridContainerRef.current) return
    
    const container = gridContainerRef.current
    const cellSize = 64 * zoomLevel
    
    // Oblicz pozycję docelową (środek ekranu na danej komórce)
    const targetX = cellX * cellSize + cellSize / 2 - container.clientWidth / 2
    const targetY = cellY * cellSize + cellSize / 2 - container.clientHeight / 2
    
    // Smooth scroll
    container.scrollTo({
      left: Math.max(0, targetX),
      top: Math.max(0, targetY),
      behavior: 'smooth'
    })
    
    // Pokaż animację pinga
    setPingAnimation({ x: cellX, y: cellY, timestamp: Date.now() })
    
    // Ukryj animację po 2 sekundach
    setTimeout(() => {
      setPingAnimation(null)
    }, 2000)
  }, [zoomLevel])
  
  useEffect(() => {
    fetch(API_BASE + '?action=assets', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBackgroundAssets(data.backgroundAssets || [])
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const q = mapPath ? `&path=${encodeURIComponent(mapPath)}` : ''
    fetch(`${API_BASE}?action=list-map${q}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMapFolders(data.folders || [])
          setMapFiles(data.files || [])
        }
      })
      .catch(console.error)
  }, [mapPath])

  useEffect(() => {
    const q = tokenPath ? `&path=${encodeURIComponent(tokenPath)}` : ''
    fetch(`${API_BASE}?action=list-tokens${q}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTokenFolders(data.folders || [])
          setTokenFiles(data.files || [])
        }
      })
      .catch(console.error)
  }, [tokenPath])

  
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

  
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE}?action=check&version=${version}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.hasChanges) {
            setScenes(data.data.scenes || [])
            // Sprawdź czy zmieniono aktywną scenę
            if (data.data.activeSceneId !== activeSceneId) {
              setActiveSceneId(data.data.activeSceneId)
              updateSceneState(data.data.scene)
              // Reset narzędzi przy zmianie sceny
              setSelectedAsset(null)
              setSelectedType(null)
              setIsEraserActive(false)
              setFogEditMode(false)
            } else if (!fogEditMode) {
              // Aktualizuj tylko jeśli nie edytujemy mgły
              updateSceneState(data.data.scene)
            }
            setVersion(data.data.version)
          }
        })
        .catch(console.error)

      fetch(`${API_BASE}?action=ping`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            if (data.ping) {
              setActivePing(data.ping)
              if (data.ping.timestamp > lastPingTimestampRef.current) {
                lastPingTimestampRef.current = data.ping.timestamp
                scrollToPoint(data.ping.x, data.ping.y)
              }
            } else {
              setActivePing(null)
            }
          }
        })
        .catch(console.error)
      
      // Pobierz rzuty
      fetch(`${API_BASE}?action=rolls`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRollHistory(data.rolls || [])
          }
        })
        .catch(console.error)
    }, 2000)

    return () => clearInterval(interval)
  }, [version, activeSceneId, fogEditMode, updateSceneState, scrollToPoint])

  const handleSwitchScene = useCallback((sceneId) => {
    fetch(`${API_BASE}?action=switch-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: sceneId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActiveSceneId(sceneId)
          updateSceneState(data.scene)
          setVersion(data.version)
          // Reset narzędzi
          setSelectedAsset(null)
          setSelectedType(null)
          setIsEraserActive(false)
          setFogEditMode(false)
        }
      })
      .catch(console.error)
  }, [updateSceneState])

  const handleCreateScene = useCallback((name) => {
    fetch(`${API_BASE}?action=create-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScenes(prev => [...prev, data.scene])
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])

  const handleDeleteScene = useCallback((sceneId) => {
    fetch(`${API_BASE}?action=delete-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: sceneId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScenes(prev => prev.filter(s => s.id !== sceneId))
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])

  const handleRenameScene = useCallback((sceneId, name) => {
    fetch(`${API_BASE}?action=rename-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: sceneId, name })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScenes(prev => prev.map(s => 
            s.id === sceneId ? { ...s, name } : s
          ))
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])

  const handleDuplicateScene = useCallback((sceneId) => {
    fetch(`${API_BASE}?action=duplicate-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: sceneId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScenes(prev => [...prev, data.scene])
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])

  const handleDiceRoll = useCallback((rollData) => {
    setRollHistory(prev => [...prev, { ...rollData, id: Date.now().toString() }])
    
    fetch(`${API_BASE}?action=roll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(rollData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])
  
  const handleSelectAsset = useCallback((asset, type) => {
    setIsEraserActive(false)
    setFogEditMode(false)
    setPingMode(false) 
    
    if (selectedAsset?.id === asset.id && selectedType === type) {
      setSelectedAsset(null)
      setSelectedType(null)
    } else {
      setSelectedAsset(asset)
      setSelectedType(type)
    }
  }, [selectedAsset, selectedType])

  const handleToggleEraser = useCallback(() => {
    setFogEditMode(false)  
    setPingMode(false) 
    
    if (isEraserActive) {
      setIsEraserActive(false)
    } else {
      setIsEraserActive(true)
      setSelectedAsset(null)
      setSelectedType(null)
    }
  }, [isEraserActive])

  
  const handleSetBackground = useCallback((bg) => {
    fetch(`${API_BASE}?action=set-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        src: bg.src,
        name: bg.name,
        width: bg.width,
        height: bg.height
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBackground(data.background)
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])

  
  const handleRemoveBackground = useCallback(() => {
    fetch(`${API_BASE}?action=remove-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBackground(null)
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])

  
  const isOccupiedByToken = useCallback((x, y) => {
    return tokens.some(token => token.x === x && token.y === y)
  }, [tokens])

  const isOccupiedByMapElement = useCallback((x, y) => {
    return mapElements.some(element => element.x === x && element.y === y)
  }, [mapElements])

  
  const handleDeselectAsset = useCallback(() => {
    setSelectedAsset(null)
    setSelectedType(null)
  }, [])

  const placeAssetAt = useCallback((asset, type, x, y, deselectAfterPlace = false) => {
    if (type === 'token' && isOccupiedByToken(x, y)) return
    if (type === 'map' && isOccupiedByMapElement(x, y)) return
    const action = type === 'map' ? 'add-map-element' : 'add-token'
    return fetch(`${API_BASE}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ assetId: asset.id, src: asset.src, x, y })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (type === 'map') {
            setMapElements(prev => [...prev, data.element])
          } else {
            setTokens(prev => [...prev, data.token])
          }
          setVersion(data.version)
          if (deselectAfterPlace) {
            setSelectedAsset(null)
            setSelectedType(null)
          }
        }
      })
      .catch(console.error)
  }, [isOccupiedByToken, isOccupiedByMapElement])

  const handleCellClick = useCallback((x, y) => {
    if (isEraserActive) return
    if (!selectedAsset || !selectedType) return
    placeAssetAt(selectedAsset, selectedType, x, y, false)
  }, [selectedAsset, selectedType, isEraserActive, placeAssetAt])

  const handleDropOnGrid = useCallback((asset, type, x, y) => {
    placeAssetAt(asset, type, x, y, true)
  }, [placeAssetAt])

  
  const handleTokenMove = useCallback((tokenId, newX, newY) => {
    const isOccupied = tokens.some(t => t.id !== tokenId && t.x === newX && t.y === newY)
    if (isOccupied) return

    setTokens(prev => prev.map(t => 
      t.id === tokenId ? { ...t, x: newX, y: newY } : t
    ))

    fetch(`${API_BASE}?action=move-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: tokenId, x: newX, y: newY })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [tokens])

  
  const handleRemoveMapElement = useCallback((elementId) => {
    fetch(`${API_BASE}?action=remove-map-element`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: elementId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMapElements(prev => {
            const filtered = prev.filter(e => e.id !== elementId)
            // Automatycznie wyłącz gumkę jeśli usunęliśmy ostatni element
            if (filtered.length === 0 && isEraserActive) {
              setIsEraserActive(false)
            }
            return filtered
          })
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [isEraserActive])

  
  const handleRemoveToken = useCallback((tokenId) => {
    fetch(`${API_BASE}?action=remove-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: tokenId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTokens(prev => prev.filter(t => t.id !== tokenId))
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, [])

  
  const handleClear = useCallback(() => {
    if (!confirm(t('sidebar.clearMapConfirm'))) return

    fetch(`${API_BASE}?action=clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBackground(null)
          setMapElements([])
          setTokens([])
          setVersion(data.version)
          setSelectedAsset(null)
          setSelectedType(null)
          setIsEraserActive(false)
          setFogEditMode(false)
          setFogBitmap(createEmptyFog())
        }
      })
      .catch(console.error)
  }, [])

  const handleToggleFog = useCallback((enabled) => {
    fetch(`${API_BASE}?action=toggle-fog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFogOfWar(prev => ({ ...prev, enabled: data.enabled }))
          setVersion(data.version)
        }
      })
      .catch(console.error)
  }, []);

  const handleFogBitmapChange = useCallback((newBitmap) => {
  setFogBitmap(newBitmap)
  
  
  if (fogUpdateTimeoutRef.current) {
    clearTimeout(fogUpdateTimeoutRef.current)
  }
  
  fogUpdateTimeoutRef.current = setTimeout(() => {
    const base64 = encodeToBase64(newBitmap)
    fetch(`${API_BASE}?action=update-fog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ data: base64 })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVersion(data.version)
        }
      })
      .catch(console.error)
    }, 300)
  }, []);

  const handleFogRevealAll = useCallback(() => {
    const newBitmap = createRevealedFog()
    handleFogBitmapChange(newBitmap)
  }, [handleFogBitmapChange])

  const handleFogHideAll = useCallback(() => {
    const newBitmap = createEmptyFog()
    handleFogBitmapChange(newBitmap)
  }, [handleFogBitmapChange])

  
  const handleToggleFogEdit = useCallback(() => {
    const newEditMode = !fogEditMode
    setFogEditMode(newEditMode)
    setPingMode(false) 
    
    
    if (newEditMode) {
      setSelectedAsset(null)
      setSelectedType(null)
      setIsEraserActive(false)
    }
  }, [fogEditMode])

  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleDeselectAsset()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleDeselectAsset])

  useEffect(() => {
    const preventSelection = (e) => {
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('.grid-container')) {
        e.preventDefault()
      }
    }
    
    document.addEventListener('selectstart', preventSelection)
    return () => document.removeEventListener('selectstart', preventSelection)
  }, [])

  useEffect(() => {
    return () => {
      if (fogUpdateTimeoutRef.current) {
        clearTimeout(fogUpdateTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}?action=rolls`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRollHistory(data.rolls || [])
        }
      })
      .catch(console.error)
  }, [])

  if (isLoading) {
    return <div className="loading">{t('app.loading')}</div>
  }

  return (
    <div className="app">
      {/* Toggle sidebar button */}
      <button 
        className={`sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(prev => !prev)}
        title={sidebarOpen ? 'Zwiń panel' : 'Rozwiń panel'}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      <Sidebar
        isOpen={sidebarOpen}
        isGameMaster={isGameMaster}
        mapPath={mapPath}
        mapFolders={mapFolders}
        mapFiles={mapFiles}
        onMapPathChange={setMapPath}
        tokenPath={tokenPath}
        tokenFolders={tokenFolders}
        tokenFiles={tokenFiles}
        onTokenPathChange={setTokenPath}
        backgroundAssets={backgroundAssets}
        currentBackground={background}
        selectedAsset={selectedAsset}
        selectedType={selectedType}
        isEraserActive={isEraserActive}
        hasMapElements={mapElements.length > 0}
        fogOfWar={fogOfWar}
        fogEditMode={fogEditMode}
        fogRevealMode={fogRevealMode}
        fogBrushSize={fogBrushSize}
        fogGmOpacity={fogGmOpacity}
        onToggleFog={handleToggleFog}
        onToggleFogEdit={handleToggleFogEdit}
        onSetFogRevealMode={setFogRevealMode}
        onSetFogBrushSize={setFogBrushSize}
        onSetFogGmOpacity={setFogGmOpacity}
        onFogRevealAll={handleFogRevealAll}
        onFogHideAll={handleFogHideAll}
        onSelectAsset={handleSelectAsset}
        onToggleEraser={handleToggleEraser}
        onSetBackground={handleSetBackground}
        onRemoveBackground={handleRemoveBackground}
        onClear={handleClear}
        basePath={BASE_PATH}
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSwitchScene={handleSwitchScene}
        onCreateScene={handleCreateScene}
        onDeleteScene={handleDeleteScene}
        onRenameScene={handleRenameScene}
        onDuplicateScene={handleDuplicateScene}
        pingMode={pingMode}
        onTogglePing={handleTogglePing}
        activePing={activePing}
        onClearPing={handleClearPing}
        onDeselectAsset={handleDeselectAsset}
      />
      
      <main className="main-content">
        <Grid
          ref={gridContainerRef}
          isGameMaster={isGameMaster}
          background={background}
          mapElements={mapElements}
          tokens={tokens}
          selectedAsset={selectedAsset}
          selectedType={selectedType}
          isEraserActive={isEraserActive}
          fogBitmap={fogBitmap}
          fogEnabled={fogOfWar.enabled}
          fogEditMode={fogEditMode}
          fogRevealMode={fogRevealMode}
          fogBrushSize={fogBrushSize}
          fogGmOpacity={fogGmOpacity}
          onFogBitmapChange={handleFogBitmapChange}
          onCellClick={handleCellClick}
          onTokenMove={handleTokenMove}
          onRemoveMapElement={handleRemoveMapElement}
          onRemoveToken={handleRemoveToken}
          onDropPlace={handleDropOnGrid}
          onDeselectPlacement={handleDeselectAsset}
          basePath={BASE_PATH}
          zoomLevel={zoomLevel}
          pingMode={pingMode}
          pingAnimation={pingAnimation}
          onSendPing={handleSendPing}
        />
      </main>

      <DicePanel
        isOpen={dicePanelOpen}
        onToggle={() => setDicePanelOpen(prev => !prev)}
        rollHistory={rollHistory}
        onRoll={handleDiceRoll}
      />

      <NotesPanel
        isOpen={notesPanelOpen}
        onToggle={() => setNotesPanelOpen(prev => !prev)}
      />
    </div>
  )
}

export default App