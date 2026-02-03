import React, { useState, useCallback, useEffect } from 'react'
import NoteEditor from './NoteEditor'
import { t } from '../lang'

const STORAGE_KEY_CONFIG = 'vtt_notes_config'
const MIN_HEIGHT_PERCENT = 30
const MAX_HEIGHT_PERCENT = 90
const DEFAULT_HEIGHT_PERCENT = 50
const MAX_EDITORS = 3

function NotesPanel({ isOpen, onToggle }) {
  const [heightPercent, setHeightPercent] = useState(DEFAULT_HEIGHT_PERCENT)
  const [isResizing, setIsResizing] = useState(false)
  const [editorIds, setEditorIds] = useState(['1'])

  // Załaduj konfigurację (które edytory są otwarte)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.editorIds && config.editorIds.length > 0) {
          setEditorIds(config.editorIds)
        }
        if (config.heightPercent) {
          setHeightPercent(config.heightPercent)
        }
      } catch {
        // Ignoruj błędy
      }
    }
  }, [])

  // Zapisz konfigurację
  const saveConfig = useCallback((ids, height) => {
    const config = {
      editorIds: ids,
      heightPercent: height
    }
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
  }, [])

  // Dodaj edytor
  const handleAddEditor = useCallback(() => {
    if (editorIds.length >= MAX_EDITORS) return
    
    const newId = Date.now().toString()
    const newIds = [...editorIds, newId]
    setEditorIds(newIds)
    saveConfig(newIds, heightPercent)
  }, [editorIds, heightPercent, saveConfig])

  // Usuń edytor
  const handleRemoveEditor = useCallback((id) => {
    if (editorIds.length <= 1) return
    
    const newIds = editorIds.filter(eid => eid !== id)
    setEditorIds(newIds)
    saveConfig(newIds, heightPercent)
  }, [editorIds, heightPercent, saveConfig])

  // Resize - rozpoczęcie
  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  // Resize - ruch myszy
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
      saveConfig(editorIds, heightPercent)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, editorIds, heightPercent, saveConfig])

  return (
    <>
      {/* Panel */}
      <div 
        className={`notes-panel ${isOpen ? 'open' : ''}`}
        style={{ height: isOpen ? `${heightPercent}vh` : '0' }}
      >
        <button 
          className="notes-panel-toggle"
          onClick={onToggle}
          title={isOpen ? t('notes.close') : t('notes.title')}
        >
          {isOpen ? '▼' : '📝'}
        </button>
        {/* Resize handle */}
        <div 
          className={`notes-resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={handleResizeStart}
        >
          <div className="notes-resize-bar" />
        </div>

        {/* Header */}
        <div className="notes-header">
          <div className="notes-header-left">
            <h2>📝 {t('notes.title')}</h2>
            <span className="notes-count">({editorIds.length}/{MAX_EDITORS})</span>
          </div>
          <div className="notes-header-actions">
            {editorIds.length < MAX_EDITORS && (
              <button onClick={handleAddEditor} className="notes-add-btn">
                + {t('notes.addEditor')}
              </button>
            )}
            <button onClick={onToggle} className="notes-close-btn" title={t('notes.close')}>
              ✕
            </button>
          </div>
        </div>

        {/* Editors container */}
        <div className="notes-editors-container">
          {editorIds.map(id => (
            <NoteEditor
              key={id}
              id={id}
              onRemove={handleRemoveEditor}
              canRemove={editorIds.length > 1}
            />
          ))}
        </div>
      </div>

      {/* Overlay przy resize */}
      {isResizing && <div className="notes-resize-overlay" />}
    </>
  )
}

export default NotesPanel