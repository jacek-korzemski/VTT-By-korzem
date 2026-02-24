import { t } from '../lang'

function ZoomControls({ zoomLevel, onZoomChange }) {
  return (
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
  )
}

export default ZoomControls
