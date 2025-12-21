import React from 'react'
import CollapsibleSection from './CollapsibleSection'

function Sidebar({ 
  isOpen,
  mapAssets, 
  tokenAssets,
  backgroundAssets,
  currentBackground,
  selectedAsset, 
  selectedType,
  isEraserActive,
  hasMapElements,
  
  fogOfWar,
  fogEditMode,
  fogRevealMode,
  fogBrushSize,
  fogGmOpacity,
  onToggleFog,
  onToggleFogEdit,
  onSetFogRevealMode,
  onSetFogBrushSize,
  onSetFogGmOpacity,
  onFogRevealAll,
  onFogHideAll,
  
  onSelectAsset,
  onToggleEraser,
  onSetBackground,
  onRemoveBackground,
  onClear,
  basePath,
  zoomLevel,
  onZoomChange,
}) {
  const isSelected = (asset, type) => {
    return selectedAsset?.id === asset.id && selectedType === type
  }

  const getImageSrc = (src) => `${basePath}${src}`

  const isCurrentBackground = (bg) => {
    return currentBackground?.src === bg.src
  }

  
  const getActiveTool = () => {
    if (fogEditMode) return `☁️ Mgła: ${fogRevealMode ? 'odkrywanie' : 'zakrywanie'} (r: ${fogBrushSize})`
    if (isEraserActive) return '🧹 Gumka aktywna'
    if (selectedAsset) return `${selectedAsset.name} (${selectedType === 'map' ? 'mapa' : 'token'})`
    return null
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h1>🎲 Simple VTT</h1>
        <button className="clear-btn" onClick={onClear}>
          🗑️ Wyczyść mapę
        </button>
      </div>

      <div className="sidebar-sections">
        {/* Tła */}
        <CollapsibleSection title="Tło mapy" icon="🖼️" defaultOpen={false}>
          {currentBackground && (
            <div className="current-background">
              <span className="current-bg-label">Aktywne:</span>
              <span className="current-bg-name">{currentBackground.name}</span>
              <button 
                className="remove-bg-btn" 
                onClick={onRemoveBackground}
                title="Usuń tło"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="background-list">
            {backgroundAssets.length === 0 && (
              <p className="no-assets">
                Brak teł. Dodaj obrazki do<br/>
                <code>backend/assets/backgrounds/</code>
              </p>
            )}
            {backgroundAssets.map(bg => (
              <div
                key={bg.id}
                className={`background-item ${isCurrentBackground(bg) ? 'active' : ''}`}
                onClick={() => !isCurrentBackground(bg) && onSetBackground(bg)}
                title={`${bg.filename} (${bg.gridWidth}×${bg.gridHeight} kratek)`}
              >
                <span className="bg-icon">🗺️</span>
                <span className="bg-name">{bg.name}</span>
                <span className="bg-size">{bg.gridWidth}×{bg.gridHeight}</span>
                {isCurrentBackground(bg) && <span className="bg-active">✓</span>}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Mgła Wojny */}
        <CollapsibleSection 
          title="Mgła Wojny" 
          icon="☁️" 
          defaultOpen={false}
          badge={fogOfWar.enabled ? 'ON' : null}
        >
          <div className="fog-controls">
            <label className="fog-toggle">
              <input 
                type="checkbox" 
                checked={fogOfWar.enabled} 
                onChange={(e) => onToggleFog(e.target.checked)}
                style={{marginTop: '16px'}}
              />
              <span>Włącz mgłę wojny</span>
            </label>

            {fogOfWar.enabled && (
              <>
                <div className="fog-edit-toggle">
                  <button 
                    className={`fog-edit-btn ${fogEditMode ? 'active' : ''}`}
                    onClick={onToggleFogEdit}
                  >
                    {fogEditMode ? '✓ Tryb edycji' : '✏️ Edytuj mgłę'}
                  </button>
                </div>

                {fogEditMode && (
                  <div className="fog-tools">
                    <div className="fog-mode-buttons">
                      <button 
                        className={fogRevealMode ? 'active' : ''} 
                        onClick={() => onSetFogRevealMode(true)}
                      >
                        🔦 Odkryj
                      </button>
                      <button 
                        className={!fogRevealMode ? 'active' : ''} 
                        onClick={() => onSetFogRevealMode(false)}
                      >
                        🌑 Zakryj
                      </button>
                    </div>

                    <div className="fog-brush-size">
                      <label>Pędzel: {fogBrushSize}</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={fogBrushSize}
                        onChange={(e) => onSetFogBrushSize(Number(e.target.value))}
                      />
                    </div>

                    <label className="fog-gm-opacity">
                      <input 
                        type="checkbox" 
                        checked={fogGmOpacity}
                        onChange={(e) => onSetFogGmOpacity(e.target.checked)}
                      />
                      <span>50% opacity (podgląd MG)</span>
                    </label>
                  </div>
                )}

                <h2 style={{color: 'red'}}>DangerZone!</h2>
                <div className="fog-actions">
                  <button onClick={onFogRevealAll} className="fog-action-btn">
                    ☀️ Odkryj wszystko
                  </button>
                  <button onClick={onFogHideAll} className="fog-action-btn">
                    🌑 Zakryj wszystko
                  </button>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Elementy mapy */}
        <CollapsibleSection 
          title="Elementy mapy" 
          icon="🏠" 
          defaultOpen={true}
          badge={mapAssets.length || null}
        >
          {hasMapElements && (
            <div 
              className={`eraser-tool ${isEraserActive ? 'active' : ''}`}
              onClick={onToggleEraser}
            >
              <span className="eraser-icon">🧹</span>
              <span className="eraser-label">Gumka elementów</span>
              {isEraserActive && <span className="eraser-active">✓</span>}
            </div>
          )}
          
          <div className="asset-grid">
            {mapAssets.length === 0 && (
              <p className="no-assets">Brak elementów</p>
            )}
            {mapAssets.map(asset => (
              <div
                key={asset.id}
                className={`asset-item ${isSelected(asset, 'map') ? 'selected' : ''}`}
                onClick={() => onSelectAsset(asset, 'map')}
                title={asset.name}
              >
                <img src={getImageSrc(asset.src)} alt={asset.name} />
                <span>{asset.name}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Tokeny */}
        <CollapsibleSection 
          title="Tokeny" 
          icon="🎭" 
          defaultOpen={true}
          badge={tokenAssets.length || null}
        >
          <div className="asset-grid">
            {tokenAssets.length === 0 && (
              <p className="no-assets">Brak tokenów</p>
            )}
            {tokenAssets.map(asset => (
              <div
                key={asset.id}
                className={`asset-item ${isSelected(asset, 'token') ? 'selected' : ''}`}
                onClick={() => onSelectAsset(asset, 'token')}
                title={asset.name}
              >
                <img src={getImageSrc(asset.src)} alt={asset.name} />
                <span>{asset.name}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      <div className="zoom-controls">
        <button 
          className="zoom-btn"
          onClick={() => onZoomChange(zoomLevel - 0.1)}
          disabled={zoomLevel <= 0.4}
          title="Oddal"
        >
          🔍−
        </button>
        <div className="zoom-display">
          <input
            type="range"
            min="0.4"
            max="1.4"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          />
          <span>{Math.round(zoomLevel * 100)}%</span>
        </div>
        <button 
          className="zoom-btn"
          onClick={() => onZoomChange(zoomLevel + 0.1)}
          disabled={zoomLevel >= 1.4}
          title="Przybliż"
        >
          🔍+
        </button>
        <button
          className="zoom-btn zoom-reset"
          onClick={() => onZoomChange(1)}
          title="Reset (100%)"
        >
          ⟲
        </button>
      </div>

      <div className="sidebar-footer">
        <p>
          {getActiveTool() || '🖱️ Wybierz narzędzie'}
        </p>
        <p className="hint">
          LPM = akcja | PPM = usuń
        </p>
      </div>
    </aside>
  )
}

export default Sidebar