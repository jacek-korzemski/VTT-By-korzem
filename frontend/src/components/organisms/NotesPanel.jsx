import React, { useState, useCallback, useEffect } from 'react'
import NoteEditor from '../molecules/NoteEditor'
import { t } from '../../lang'

const STORAGE_KEY_CONFIG = 'vtt_notes_config'
const MAX_EDITORS = 3

function NotesPanel() {
  const [editorIds, setEditorIds] = useState(['1'])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.editorIds && config.editorIds.length > 0) {
          setEditorIds(config.editorIds)
        }
      } catch {
        // ignore
      }
    }
  }, [])

  const saveConfig = useCallback((ids) => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ editorIds: ids }))
  }, [])

  const handleAddEditor = useCallback(() => {
    if (editorIds.length >= MAX_EDITORS) return
    
    const newId = Date.now().toString()
    const newIds = [...editorIds, newId]
    setEditorIds(newIds)
    saveConfig(newIds)
  }, [editorIds, saveConfig])

  const handleRemoveEditor = useCallback((id) => {
    if (editorIds.length <= 1) return
    
    const newIds = editorIds.filter(eid => eid !== id)
    setEditorIds(newIds)
    saveConfig(newIds)
  }, [editorIds, saveConfig])

  return (
    <>
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
        </div>
      </div>

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
    </>
  )
}

export default NotesPanel
