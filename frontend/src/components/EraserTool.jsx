import { t } from '../lang'

function EraserTool({ isEraserActive, hasMapElements, onToggleEraser }) {
  if (!hasMapElements) return null

  return (
    <div 
      className={`eraser-tool ${isEraserActive ? 'active' : ''}`}
      onClick={onToggleEraser}
    >
      <span className="eraser-icon">🧹</span>
      <span className="eraser-label">{t('sidebar.eraser')}</span>
      {isEraserActive && <span className="eraser-active">✓</span>}
    </div>
  )
}

export default EraserTool
