import { useEffect, useRef, useState } from 'react'
import { t } from '../../lang'

function SidebarHeader({ isGameMaster, onClear, apiStatus = 'ok', apiFlashTrigger = 0 }) {
  const [flashing, setFlashing] = useState(false)
  const prevTriggerRef = useRef(apiFlashTrigger)

  useEffect(() => {
    if (prevTriggerRef.current !== apiFlashTrigger) {
      prevTriggerRef.current = apiFlashTrigger
      setFlashing(true)
      const timer = setTimeout(() => setFlashing(false), 300)
      return () => clearTimeout(timer)
    }
  }, [apiFlashTrigger])

  return (
    <div className="sidebar-header">
      <h1>
        🎲 {t('app.title')}
        <span
          className={`status-dot status-dot--${apiStatus}${flashing ? ' status-dot--flash' : ''}`}
          title={apiStatus === 'ok' ? t('status.connected') : t('status.error')}
          aria-hidden
        />
      </h1>
      {isGameMaster && (
        <button className="clear-btn" onClick={onClear}>
          🗑️ {t('sidebar.clearMap')}
        </button>
      )}
    </div>
  )
}

export default SidebarHeader
