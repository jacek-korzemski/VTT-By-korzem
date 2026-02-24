import { t } from '../lang'
import CollapsibleSection from './CollapsibleSection'
import { isCurrentBackground } from '../utils/sidebarHelpers'
import BackgroundAdjust from './BackgroundAdjust'

function BackgroundSection({
  backgroundAssets,
  currentBackground,
  bgZoomStep,
  onBgZoomStepChange,
  onSetBackground,
  onRemoveBackground,
  onNudgeBackground,
  onScaleBackground,
  onResetBackgroundPosition,
  onResetBackgroundScale,
  onResetBackgroundAll,
  onDeselectAsset,
}) {
  return (
    <CollapsibleSection 
      title={t('sidebar.backgrounds')} 
      icon="🖼️" 
      defaultOpen={false} 
      onToggle={onDeselectAsset}
    >
      {currentBackground && (
        <div className="current-background">
          <span className="current-bg-label">{t('sidebar.backgroundActive')}</span>
          <span className="current-bg-name">{currentBackground.name}</span>
          <button 
            className="remove-bg-btn" 
            onClick={onResetBackgroundAll}
            title={t('sidebar.backgroundResetAll') || 'Reset background position and zoom'}
          >
            ⟲
          </button>
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
            className={`background-item ${isCurrentBackground(bg, currentBackground) ? 'active' : ''}`}
            onClick={() => !isCurrentBackground(bg, currentBackground) && onSetBackground(bg)}
            title={`${bg.filename} (${bg.gridWidth}×${bg.gridHeight})`}
          >
            <span className="bg-icon">🗺️</span>
            <span className="bg-name">{bg.name}</span>
            <span className="bg-size">{bg.gridWidth}×{bg.gridHeight}</span>
            {isCurrentBackground(bg, currentBackground) && <span className="bg-active">✓</span>}
          </div>
        ))}
      </div>

      {currentBackground && (
        <BackgroundAdjust
          currentBackground={currentBackground}
          bgZoomStep={bgZoomStep}
          onBgZoomStepChange={onBgZoomStepChange}
          onNudgeBackground={onNudgeBackground}
          onScaleBackground={onScaleBackground}
          onResetBackgroundPosition={onResetBackgroundPosition}
          onResetBackgroundScale={onResetBackgroundScale}
        />
      )}
    </CollapsibleSection>
  )
}

export default BackgroundSection
