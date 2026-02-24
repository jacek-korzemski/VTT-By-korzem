import { t } from '../lang'

function PingTool({ pingMode, activePing, onTogglePing, onClearPing }) {
  return (
    <>
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
    </>
  )
}

export default PingTool
