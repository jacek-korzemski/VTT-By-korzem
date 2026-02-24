import { t } from '../lang'

function BackgroundZoomControls({ 
  currentBackground, 
  bgZoomStep, 
  onBgZoomStepChange,
  onScaleBackground, 
  onResetBackgroundScale 
}) {
  return (
    <div className="background-adjust-section">
      <span className="bg-adjust-label">{t('sidebar.backgroundZoom')}</span>
      <div className="bg-zoom-controls">
        <button
          type="button"
          className="bg-zoom-btn"
          onClick={() => onScaleBackground(-(bgZoomStep / 100))}
          title={t('zoom.zoomOut')}
        >
          −
        </button>
        <span className="bg-zoom-display">
          {Math.round((currentBackground.scale ?? 1) * 100)}%
        </span>
        <select
          className="bg-zoom-step-select"
          value={bgZoomStep}
          onChange={(e) => onBgZoomStepChange(parseFloat(e.target.value))}
        >
          <option value={10}>10%</option>
          <option value={1}>1%</option>
          <option value={0.1}>0.1%</option>
          <option value={0.001}>0.001%</option>
        </select>
        <button
          type="button"
          className="bg-zoom-btn"
          onClick={() => onScaleBackground(bgZoomStep / 100)}
          title={t('zoom.zoomIn')}
        >
          +
        </button>
      </div>
      <div className="bg-zoom-reset-row">
        <button
          type="button"
          className="bg-nudge-reset-btn"
          onClick={onResetBackgroundScale}
        >
          {t('sidebar.backgroundResetScale') || 'Reset zoom'}
        </button>
      </div>
    </div>
  )
}

export default BackgroundZoomControls
