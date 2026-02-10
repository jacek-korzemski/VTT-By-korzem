import CollapsibleSection from './CollapsibleSection'
import SceneManager from './SceneManager'
import { t } from '../lang';

function Sidebar({ 
  isOpen,
  isGameMaster = false,
  mapPath,
  mapFolders,
  mapFiles,
  onMapPathChange,
  tokenPath,
  tokenFolders,
  tokenFiles,
  onTokenPathChange,
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
  activePing,
  onTogglePing,
  onClearPing,
  onDeselectAsset,
}) {
  const isSelected = (asset, type) => {
    return selectedAsset?.id === asset.id && selectedType === type
  }

  const getImageSrc = (src) => `${basePath}${src}`

  const handleAssetDragStart = (asset, type, e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: asset.id,
      src: asset.src,
      name: asset.name,
      type,
    }))
    e.dataTransfer.effectAllowed = 'copy'
    const item = e.target.closest?.('.asset-item')
    if (e.dataTransfer.setDragImage && item) {
      const img = item.querySelector('img')
      const el = img || item
      const rect = el.getBoundingClientRect()
      e.dataTransfer.setDragImage(el, rect.width / 2, rect.height / 2)
    }
  }

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
        {isGameMaster && (
          <button className="clear-btn" onClick={onClear}>
            🗑️ {t('sidebar.clearMap')}
          </button>
        )}
      </div>

      <div className="sidebar-sections">
        <div className="sidebar-sections-inner">
          <div className="sidebar-sections-content">
      {isGameMaster && (
        <CollapsibleSection 
          title={t('scenes.title')} 
          icon="🎬" 
          defaultOpen={true}
          badge={scenes.length}
          onToggle={onDeselectAsset}
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
      )}
        {/* Tła - tylko dla MG */}
        {isGameMaster && (
          <CollapsibleSection title={t('sidebar.backgrounds')} icon="🖼️" defaultOpen={false} onToggle={onDeselectAsset}>
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
        )}

        {/* Mgła Wojny */}
        <CollapsibleSection 
          title={t('sidebar.fog')} 
          icon="🌫️" 
          defaultOpen={false}
          badge={fogOfWar.enabled ? 'ON' : null}
          onToggle={onDeselectAsset}
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

            {fogOfWar.enabled && isGameMaster && (
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
          badge={mapFolders.length + mapFiles.length || null}
          onToggle={onDeselectAsset}
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

          {activePing && (
            <button 
              className="ping-clear-btn"
              onClick={onClearPing}
              title={t('ping.clearHint')}
            >
              ✕ {t('ping.clear')}
            </button>
          )}
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

          {(mapPath || mapFolders.length > 0) && (
            <div className="token-breadcrumbs">
              <button
                type="button"
                className="breadcrumb-btn"
                onClick={() => onMapPathChange('')}
                title={t('sidebar.mapElementsRoot')}
              >
                🏠
              </button>
              {mapPath.split('/').filter(Boolean).map((segment, i, arr) => {
                const pathUpToHere = arr.slice(0, i + 1).join('/')
                return (
                  <span key={pathUpToHere} className="breadcrumb-segment">
                    <span className="breadcrumb-sep">/</span>
                    <button
                      type="button"
                      className="breadcrumb-btn"
                      onClick={() => onMapPathChange(pathUpToHere)}
                    >
                      {segment}
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          {mapFolders.length > 0 && (
            <div className="token-folders">
              {mapFolders.map(folder => (
                <div
                  key={folder.path}
                  className="asset-item token-folder"
                  onClick={() => onMapPathChange(folder.path)}
                  title={folder.name}
                >
                  <span className="folder-icon">📁</span>
                  <span>{folder.name}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="asset-grid">
            {mapFiles.length === 0 && mapFolders.length === 0 && (
              <p className="no-assets">{t('sidebar.noAssets')}</p>
            )}
            {mapFiles.map(asset => (
              <div
                key={asset.id}
                className={`asset-item ${isSelected(asset, 'map') ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleAssetDragStart(asset, 'map', e)}
                onClick={() => onSelectAsset(asset, 'map')}
                title={asset.name}
              >
                <img src={getImageSrc(asset.src)} alt={asset.name} draggable={false} />
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
          badge={tokenFolders.length + tokenFiles.length || null}
          onToggle={onDeselectAsset}
        >
          {(tokenPath || tokenFolders.length > 0) && (
            <div className="token-breadcrumbs">
              <button
                type="button"
                className="breadcrumb-btn"
                onClick={() => onTokenPathChange('')}
                title={t('sidebar.tokensRoot')}
              >
                🎭
              </button>
              {tokenPath.split('/').filter(Boolean).map((segment, i, arr) => {
                const pathUpToHere = arr.slice(0, i + 1).join('/')
                return (
                  <span key={pathUpToHere} className="breadcrumb-segment">
                    <span className="breadcrumb-sep">/</span>
                    <button
                      type="button"
                      className="breadcrumb-btn"
                      onClick={() => onTokenPathChange(pathUpToHere)}
                    >
                      {segment}
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          {tokenFolders.length > 0 && (
            <div className="token-folders">
              {tokenFolders.map(folder => (
                <div
                  key={folder.path}
                  className="asset-item token-folder"
                  onClick={() => onTokenPathChange(folder.path)}
                  title={folder.name}
                >
                  <span className="folder-icon">📁</span>
                  <span>{folder.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="asset-grid">
            {tokenFiles.length === 0 && tokenFolders.length === 0 && (
              <p className="no-assets">{t('sidebar.noAssets')}</p>
            )}
            {tokenFiles.map(asset => (
              <div
                key={asset.id}
                className={`asset-item ${isSelected(asset, 'token') ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleAssetDragStart(asset, 'token', e)}
                onClick={() => onSelectAsset(asset, 'token')}
                title={asset.name}
              >
                <img src={getImageSrc(asset.src)} alt={asset.name} draggable={false} />
                <span>{asset.name}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
          </div>

          {/* Zoom Controls – wewnątrz przewijania, przyklejone do dołu */}
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
        </div>
      </div>
    </aside>
  )
}

export default Sidebar