import React, { useRef, useEffect, useState, useCallback } from 'react'
import SimpleWYSIWYG from '../atoms/SimpleWYSIWYG'
import { t } from '../../lang'
import { API_BASE } from '../../../config'

function NoteEditor({ id, onRemove, canRemove }) {
  const storageKey = `vtt_notes_${id}`
  const editorRef = useRef(null)
  const menuRef = useRef(null)
  const [initialContent, setInitialContent] = useState('')
  const [title, setTitle] = useState('')
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState(false)

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

  const saveToStorage = useCallback((content, newTitle) => {
    const data = {
      content: content ?? editorRef.current?.getContent() ?? '',
      title: newTitle ?? title,
      lastModified: Date.now()
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [storageKey, title])

  const handleChange = useCallback((content) => {
    saveToStorage(content, title)
  }, [saveToStorage, title])

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    saveToStorage(undefined, newTitle)
  }, [saveToStorage])

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

  useEffect(() => {
    if (!showLoadMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowLoadMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLoadMenu])

  const loadHtmlContent = useCallback((htmlString) => {
    let content = htmlString
    const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch) {
      setTitle(titleMatch[1])
    }
    if (content.includes('<body>')) {
      const match = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (match) {
        content = match[1]
      }
    }
    editorRef.current?.setContent(content)
    saveToStorage(content, titleMatch?.[1] || title)
  }, [saveToStorage, title])

  const handleImportLocal = useCallback(() => {
    setShowLoadMenu(false)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm,.txt'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        loadHtmlContent(event.target?.result || '')
      }
      reader.readAsText(file)
    }
    input.click()
  }, [loadHtmlContent])

  const handleImportTemplate = useCallback(async () => {
    setShowLoadMenu(false)
    setShowTemplateModal(true)
    setTemplatesLoading(true)
    setTemplatesError(false)
    try {
      const res = await fetch(`${API_BASE}?action=list-templates`)
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates)
      } else {
        setTemplatesError(true)
      }
    } catch {
      setTemplatesError(true)
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  const handleSelectTemplate = useCallback(async (templateId) => {
    try {
      const res = await fetch(`${API_BASE}?action=get-template&id=${encodeURIComponent(templateId)}`)
      const html = await res.text()
      loadHtmlContent(html)
    } catch {
      // silently fail
    }
    setShowTemplateModal(false)
  }, [loadHtmlContent])

  const handleClear = useCallback(() => {
    if (confirm(t('notes.clearConfirm'))) {
      editorRef.current?.clear()
      setTitle('')
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const handleRemove = useCallback(() => {
    if (confirm(t('notes.removeConfirm'))) {
      localStorage.removeItem(storageKey)
      onRemove(id)
    }
  }, [storageKey, onRemove, id])

  return (
    <div className="note-editor">
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
          <div className="note-load-wrapper" ref={menuRef}>
            <button onClick={() => setShowLoadMenu(v => !v)} title={t('notes.import')}>
              📂
            </button>
            {showLoadMenu && (
              <div className="note-load-menu">
                <button onClick={handleImportLocal}>{t('notes.importLocal')}</button>
                <button onClick={handleImportTemplate}>{t('notes.importTemplate')}</button>
              </div>
            )}
          </div>
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

      <div className="note-editor-content">
          {initialContent && <SimpleWYSIWYG
          ref={editorRef}
          height="100%"
          placeholder={t('notes.placeholder')}
          initialContent={initialContent}
          onChange={handleChange}
        />}
      </div>

      {showTemplateModal && (
        <div className="note-template-modal" onClick={() => setShowTemplateModal(false)}>
          <div className="note-template-modal-content" onClick={e => e.stopPropagation()}>
            <h3>{t('notes.templateModalTitle')}</h3>
            <div className="note-template-list">
              {templatesLoading && <div className="note-template-loading">{t('notes.templateLoading')}</div>}
              {templatesError && <div className="note-template-error">{t('notes.templateLoadError')}</div>}
              {!templatesLoading && !templatesError && templates.length === 0 && (
                <div className="note-template-empty">{t('notes.templateEmpty')}</div>
              )}
              {templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  className="note-template-item"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
            <div className="note-template-modal-footer">
              <button onClick={() => setShowTemplateModal(false)} className="note-template-cancel">
                {t('notes.templateCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoteEditor
