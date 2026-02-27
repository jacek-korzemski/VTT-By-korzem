import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react'
import NotesPanel from './NotesPanel'
import { t } from '../../lang'

const PdfPanel = lazy(() => import('./PdfPanel'))

const STORAGE_KEY = 'vtt_bottom_panel_height'
const MIN_HEIGHT_PERCENT = 30
const MAX_HEIGHT_PERCENT = 90
const DEFAULT_HEIGHT_PERCENT = 50

const PANELS = [
  { id: 'notes', icon: '📝', titleKey: 'notes.title' },
  { id: 'pdf', icon: '📄', titleKey: 'pdf.title' },
]

function BottomPanel({ activeTab, onTabChange }) {
  const [heightPercent, setHeightPercent] = useState(DEFAULT_HEIGHT_PERCENT)
  const [isResizing, setIsResizing] = useState(false)
  const [mountedTabs, setMountedTabs] = useState(new Set())
  const isOpen = activeTab !== null

  useEffect(() => {
    if (activeTab && !mountedTabs.has(activeTab)) {
      setMountedTabs(prev => new Set([...prev, activeTab]))
    }
  }, [activeTab, mountedTabs])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.heightPercent) setHeightPercent(config.heightPercent)
      } catch { /* ignore */ }
    } else {
      const legacy = localStorage.getItem('vtt_notes_config')
      if (legacy) {
        try {
          const config = JSON.parse(legacy)
          if (config.heightPercent) setHeightPercent(config.heightPercent)
        } catch { /* ignore */ }
      }
    }
  }, [])

  const saveHeight = useCallback((height) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ heightPercent: height }))
  }, [])

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e) => {
      const windowHeight = window.innerHeight
      const mouseY = e.clientY
      const newHeightPercent = ((windowHeight - mouseY) / windowHeight) * 100
      const clamped = Math.min(MAX_HEIGHT_PERCENT, Math.max(MIN_HEIGHT_PERCENT, newHeightPercent))
      setHeightPercent(clamped)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      saveHeight(heightPercent)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, heightPercent, saveHeight])

  const handleTabClick = useCallback((tabId) => {
    if (!isOpen) {
      onTabChange(tabId)
    } else if (activeTab !== tabId) {
      onTabChange(tabId)
    }
  }, [isOpen, activeTab, onTabChange])

  return (
    <>
      <div
        className={`bottom-panel ${isOpen ? 'open' : ''} ${isResizing ? 'resizing' : ''}`}
        style={{ height: isOpen ? `${heightPercent}vh` : '0' }}
      >
        <div className="bottom-panel-toolbar">
          <div className="bottom-panel-tabs">
            {PANELS.map(panel => (
              <button
                key={panel.id}
                className={`bottom-panel-tab ${activeTab === panel.id ? 'active' : ''}`}
                onClick={() => handleTabClick(panel.id)}
                title={t(panel.titleKey)}
              >
                {panel.icon}
              </button>
            ))}
          </div>
          {isOpen && (
            <button
              className="bottom-panel-close"
              onClick={() => onTabChange(null)}
              title={t('notes.close')}
            >
              ▼
            </button>
          )}
        </div>

        <div
          className={`bottom-panel-resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={handleResizeStart}
        >
          <div className="bottom-panel-resize-bar" />
        </div>

        <div className="bottom-panel-content">
          {mountedTabs.has('notes') && (
            <div className={`bottom-panel-tab-pane ${activeTab !== 'notes' ? 'hidden' : ''}`}>
              <NotesPanel />
            </div>
          )}
          {mountedTabs.has('pdf') && (
            <div className={`bottom-panel-tab-pane ${activeTab !== 'pdf' ? 'hidden' : ''}`}>
              <Suspense fallback={<div className="pdf-placeholder">{t('pdf.loading')}</div>}>
                <PdfPanel />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {isResizing && <div className="bottom-panel-resize-overlay" />}
    </>
  )
}

export default BottomPanel
