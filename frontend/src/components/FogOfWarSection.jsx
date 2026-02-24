import { t } from '../lang'
import CollapsibleSection from './CollapsibleSection'

function FogOfWarSection({
  fogOfWar,
  fogEditMode,
  fogRevealMode,
  fogBrushSize,
  fogGmOpacity,
  isGameMaster,
  onToggleFog,
  onToggleFogEdit,
  onSetFogRevealMode,
  onSetFogBrushSize,
  onSetFogGmOpacity,
  onFogRevealAll,
  onFogHideAll,
  onDeselectAsset,
}) {
  return (
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
  )
}

export default FogOfWarSection
