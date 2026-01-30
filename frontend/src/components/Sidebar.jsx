import CollapsibleSection from './CollapsibleSection'
import SceneManager from './SceneManager'
import { t } from '../lang';

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
  scenes,
  activeSceneId,
  onSwitchScene,
  onCreateScene,
  onDeleteScene,
  onRenameScene,
  onDuplicateScene,
  pingMode,
  onTogglePing,
}) {
  const isSelected = (asset, type) => {
    return selectedAsset?.id === asset.id && selectedType === type
  }

  const getImageSrc = (src) => `${basePath}${src}`

  const isCurrentBackground = (bg) => {
    return currentBackground?.src === bg.src
  }

  const getActiveTool = () => {
    if (pingMode) return `📍 ${t('ping.active')}`  // NOWE
    if (fogEditMode) {
      const mode = fogRevealMode ? t('tools.fogReveal') : t('tools.fogHide')
      return t('tools.fogActive', { mode, size: fogBrushSize })
    }
    if (isEraserActive) return `🧹 ${t('tools.eraserActive')}`
    if (selectedAsset) return `${selectedAsset.name} (${selectedType === 'map' ? t('sidebar.mapElements').toLowerCase() : t('sidebar.tokens').toLowerCase()})`
    return null
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h1>🎲 {t('app.title')}</h1>
        <button className="clear-btn" onClick={onClear}>
          🗑️ {t('sidebar.clearMap')}
        </button>
      </div>

      <div className="sidebar-sections">
      <CollapsibleSection 
        title={t('scenes.title')} 
        icon="🎬" 
        defaultOpen={true}
        badge={scenes.length}
      >
        <SceneManager
          scenes={scenes}
          activeSceneId={activeSceneId}
          onSwitchScene={onSwitchScene}
          onCreateScene={onCreateScene}
          onDeleteScene={onDeleteScene}
          onRenameScene={onRenameScene}
          onDuplicateScene={onDuplicateScene}
        />
      </CollapsibleSection>
        {/* Tła */}
        <CollapsibleSection title={t('sidebar.backgrounds')} icon="🖼️" defaultOpen={false}>
          {currentBackground && (
            <div className="current-background">
              <span className="current-bg-label">{t('sidebar.backgroundActive')}</span>
              <span className="current-bg-name">{currentBackground.name}</span>
              <button 
                className="remove-bg-btn" 
                onClick={onRemoveBackground}
                title={t('sidebar.backgroundRemove')}
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="background-list">
            {backgroundAssets.length === 0 && (
              <p className="no-assets">
                {t('sidebar.backgroundsEmpty')}<br/>
                <code>backend/assets/backgrounds/</code>
              </p>
            )}
            {backgroundAssets.map(bg => (
              <div
                key={bg.id}
                className={`background-item ${isCurrentBackground(bg) ? 'active' : ''}`}
                onClick={() => !isCurrentBackground(bg) && onSetBackground(bg)}
                title={`${bg.filename} (${bg.gridWidth}×${bg.gridHeight})`}
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
          title={t('sidebar.fog')} 
          icon="🌫️" 
          defaultOpen={false}
          badge={fogOfWar.enabled ? 'ON' : null}
        >
          <div className="fog-controls">
            <label className="fog-toggle">
              <input 
                type="checkbox" 
                checked={fogOfWar.enabled} 
                onChange={(e) => onToggleFog(e.target.checked)}
              />
              <span>{t('sidebar.fogEnable')}</span>
            </label>

            {fogOfWar.enabled && (
              <>
                <div className="fog-edit-toggle">
                  <button 
                    className={`fog-edit-btn ${fogEditMode ? 'active' : ''}`}
                    onClick={onToggleFogEdit}
                  >
                    {fogEditMode ? t('sidebar.fogEditActive') : `✏️ ${t('sidebar.fogEdit')}`}
                  </button>
                </div>

                {fogEditMode && (
                  <div className="fog-tools">
                    <div className="fog-mode-buttons">
                      <button 
                        className={fogRevealMode ? 'active' : ''} 
                        onClick={() => onSetFogRevealMode(true)}
                      >
                        🔦 {t('sidebar.fogReveal')}
                      </button>
                      <button 
                        className={!fogRevealMode ? 'active' : ''} 
                        onClick={() => onSetFogRevealMode(false)}
                      >
                        🌑 {t('sidebar.fogHide')}
                      </button>
                    </div>

                    <div className="fog-brush-size">
                      <label>{t('sidebar.fogBrush')} {fogBrushSize}</label>
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
                      <span>{t('sidebar.fogGmOpacity')}</span>
                    </label>
                  </div>
                )}

                <div className="fog-actions">
                  <button onClick={onFogRevealAll} className="fog-action-btn">
                    ☀️ {t('sidebar.fogRevealAll')}
                  </button>
                  <button onClick={onFogHideAll} className="fog-action-btn">
                    🌑 {t('sidebar.fogHideAll')}
                  </button>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Elementy mapy */}
        <CollapsibleSection 
          title={t('sidebar.mapElements')} 
          icon="🏠" 
          defaultOpen={true}
          badge={mapAssets.length || null}
        >
          <div 
            className={`ping-tool ${pingMode ? 'active' : ''}`}
            onClick={onTogglePing}
            title={t('ping.toolHint')}
          >
            <span className="ping-icon">📍</span>
            <span className="ping-label">{t('ping.tool')}</span>
            {pingMode && <span className="ping-active">✓</span>}
          </div>
          {hasMapElements && (
            <div 
              className={`eraser-tool ${isEraserActive ? 'active' : ''}`}
              onClick={onToggleEraser}
            >
              <span className="eraser-icon">🧹</span>
              <span className="eraser-label">{t('sidebar.eraser')}</span>
              {isEraserActive && <span className="eraser-active">✓</span>}
            </div>
          )}
          
          <div className="asset-grid">
            {mapAssets.length === 0 && (
              <p className="no-assets">{t('sidebar.noAssets')}</p>
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
          title={t('sidebar.tokens')} 
          icon="🎭" 
          defaultOpen={true}
          badge={tokenAssets.length || null}
        >
          <div className="asset-grid">
            {tokenAssets.length === 0 && (
              <p className="no-assets">{t('sidebar.noAssets')}</p>
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

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button 
          className="zoom-btn"
          onClick={() => onZoomChange(zoomLevel - 0.1)}
          disabled={zoomLevel <= 0.4}
          title={t('zoom.zoomOut')}
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
          title={t('zoom.zoomIn')}
        >
          🔍+
        </button>
        <button
          className="zoom-btn zoom-reset"
          onClick={() => onZoomChange(1)}
          title={t('zoom.reset')}
        >
          ⟲
        </button>
      </div>

      <div className="sidebar-footer">
        <p>
          {getActiveTool() || `🖱️ ${t('sidebar.selectTool')}`}
        </p>
        <p className="hint">
          {selectedAsset || isEraserActive || fogEditMode
            ? t('sidebar.clickToDeselect')
            : t('sidebar.hintLeftRight')
          }
        </p>
      </div>
    </aside>
  )
}

export default Sidebar