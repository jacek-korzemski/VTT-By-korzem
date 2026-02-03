import React, { useRef, useEffect, useState, useCallback } from 'react'
import SimpleWYSIWYG from './SimpleWYSIWYG'
import { t } from '../lang'

function NoteEditor({ id, onRemove, canRemove }) {
  const storageKey = `vtt_notes_${id}`
  const editorRef = useRef(null)
  const [initialContent, setInitialContent] = useState('')
  const [title, setTitle] = useState('')

  // Załaduj z localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setInitialContent(data.content || '')
        setTitle(data.title || '')
      } catch {
        setInitialContent(saved)
      }
    } else {
      setInitialContent('Notatnik');
    }
  }, [storageKey])

  // Zapisz zawartość
  const saveToStorage = useCallback((content, newTitle) => {
    const data = {
      content: content ?? editorRef.current?.getContent() ?? '',
      title: newTitle ?? title,
      lastModified: Date.now()
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [storageKey, title])

  // Zmiana zawartości edytora
  const handleChange = useCallback((content) => {
    saveToStorage(content, title)
  }, [saveToStorage, title])

  // Zmiana tytułu
  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    saveToStorage(undefined, newTitle)
  }, [saveToStorage])

  // Eksport
  const handleExport = useCallback(() => {
    if (!editorRef.current) return
    
    const content = editorRef.current.getContent()
    const filename = title || `notepad-${id}`
    
    const blob = new Blob([`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td { border: 1px solid #ccc; padding: 8px; }
  </style>
</head>
<body>
${content}
</body>
</html>
    `], { type: 'text/html' })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename.replace(/[^a-z0-9]/gi, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [title, id])

  // Import
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm,.txt'
    
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        let content = event.target?.result || ''
        
        // Wyciągnij tytuł z HTML jeśli jest
        const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i)
        if (titleMatch) {
          setTitle(titleMatch[1])
        }
        
        // Wyciągnij body
        if (content.includes('<body>')) {
          const match = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
          if (match) {
            content = match[1]
          }
        }
        
        editorRef.current?.setContent(content)
        saveToStorage(content, titleMatch?.[1] || title)
      }
      reader.readAsText(file)
    }
    
    input.click()
  }, [saveToStorage, title])

  // Wyczyść
  const handleClear = useCallback(() => {
    if (confirm(t('notes.clearConfirm'))) {
      editorRef.current?.clear()
      setTitle('')
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  // Usuń edytor
  const handleRemove = useCallback(() => {
    if (confirm(t('notes.removeConfirm'))) {
      localStorage.removeItem(storageKey)
      onRemove(id)
    }
  }, [storageKey, onRemove, id])

  return (
    <div className="note-editor">
      {/* Header edytora */}
      <div className="note-editor-header">
        <input
          type="text"
          className="note-editor-title"
          value={title}
          onChange={handleTitleChange}
          placeholder={t('notes.titlePlaceholder')}
          maxLength={50}
        />
        <div className="note-editor-actions">
          <button onClick={handleImport} title={t('notes.import')}>
            📂
          </button>
          <button onClick={handleExport} title={t('notes.export')}>
            💾
          </button>
          <button onClick={handleClear} title={t('notes.clear')} className="note-btn-danger">
            🗑️
          </button>
          {canRemove && (
            <button onClick={handleRemove} title={t('notes.remove')} className="note-btn-close">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="note-editor-content">
          {initialContent && <SimpleWYSIWYG
          ref={editorRef}
          height="100%"
          placeholder={t('notes.placeholder')}
          initialContent={initialContent}
          onChange={handleChange}
        />}
      </div>
    </div>
  )
}

export default NoteEditor