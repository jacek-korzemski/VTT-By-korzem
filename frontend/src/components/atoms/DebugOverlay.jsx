import { useState, useEffect, useRef } from 'react'

function DebugOverlay() {
  const [errors, setErrors] = useState([])
  const [minimized, setMinimized] = useState(false)
  const idRef = useRef(0)

  useEffect(() => {
    const push = (msg) => {
      const id = ++idRef.current
      const entry = { id, msg: String(msg), time: new Date().toLocaleTimeString() }
      setErrors(prev => [entry, ...prev].slice(0, 50))
    }

    const onError = (event) => {
      const detail = event.message
        ? `${event.message} (${event.filename}:${event.lineno}:${event.colno})`
        : String(event)
      push(detail)
    }

    const onRejection = (event) => {
      const reason = event.reason
      push(reason?.stack || reason?.message || String(reason))
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    const origConsoleError = console.error
    console.error = (...args) => {
      push(args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '))
      origConsoleError.apply(console, args)
    }

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      console.error = origConsoleError
    }
  }, [])

  if (errors.length === 0) return null

  const style = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: minimized ? '30px' : '40vh',
    background: 'rgba(0,0,0,0.92)',
    color: '#ff6b6b',
    fontSize: '11px',
    fontFamily: 'monospace',
    zIndex: 999999,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #ff6b6b',
  }

  return (
    <div style={style}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          background: '#330000',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => setMinimized(m => !m)}
      >
        <span>DEBUG ({errors.length} errors)</span>
        <span>{minimized ? '+' : '-'}</span>
      </div>
      {!minimized && (
        <div style={{ overflow: 'auto', flex: 1, padding: '4px 8px' }}>
          {errors.map(e => (
            <div key={e.id} style={{ borderBottom: '1px solid #333', padding: '3px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span style={{ color: '#888' }}>[{e.time}]</span> {e.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DebugOverlay
