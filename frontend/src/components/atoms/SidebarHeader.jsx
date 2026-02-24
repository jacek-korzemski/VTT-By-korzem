import { t } from '../../lang'

function SidebarHeader({ isGameMaster, onClear }) {
  return (
    <div className="sidebar-header">
      <h1>🎲 {t('app.title')}</h1>
      {isGameMaster && (
        <button className="clear-btn" onClick={onClear}>
          🗑️ {t('sidebar.clearMap')}
        </button>
      )}
    </div>
  )
}

export default SidebarHeader
