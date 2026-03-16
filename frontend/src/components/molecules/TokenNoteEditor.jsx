import React, { useRef, useEffect, useState, useCallback } from 'react'
import SimpleWYSIWYG from '../atoms/SimpleWYSIWYG'
import { t } from '../../lang'
import { API_BASE } from '../../../config'
import { executeDiceRoll, getEffectiveRollExpression } from '../../utils/diceRollUtils'

function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return bodyMatch ? bodyMatch[1] : html
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return titleMatch ? titleMatch[1] : ''
}

function TokenNoteEditor({ tokenId, tokenLabel = '', onClose }) {
  const storageKey = `vtt_token_note_${tokenId}`
  const editorRef = useRef(null)
  const templateRef = useRef(null)
  const menuRef = useRef(null)
  const fieldsRef = useRef({})
  const handleFieldChangeRef = useRef(null)
  const [initialContent, setInitialContent] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState('notepad')
  const [templateHtml, setTemplateHtml] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templateFields, setTemplateFields] = useState({})
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showMismatchModal, setShowMismatchModal] = useState(false)
  const [pendingJsonFields, setPendingJsonFields] = useState(null)
  const [mismatchInfo, setMismatchInfo] = useState({ source: '', current: '' })
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState(false)
  const [templateRenderKey, setTemplateRenderKey] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.mode === 'template' && data.templateHtml) {
          setMode('template')
          setTemplateHtml(data.templateHtml)
          setTemplateId(data.templateId || '')
          setTemplateFields(data.fields || {})
          fieldsRef.current = data.fields || {}
          setTitle(data.title || '')
        } else {
          setMode('notepad')
          setInitialContent(data.content || '')
          setTitle(data.title || '')
        }
      } catch {
        setInitialContent(saved)
      }
    } else {
      setInitialContent('')
    }
  }, [storageKey])

  const saveNotepad = useCallback((content, newTitle) => {
    const data = {
      mode: 'notepad',
      content: content ?? editorRef.current?.getContent() ?? '',
      title: newTitle ?? title,
      lastModified: Date.now()
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [storageKey, title])

  const handleChange = useCallback((content) => {
    saveNotepad(content, title)
  }, [saveNotepad, title])

  const saveTemplate = useCallback((fields, newTitle) => {
    const data = {
      mode: 'template',
      templateHtml,
      templateId,
      fields: fields ?? templateFields,
      title: newTitle ?? title,
      lastModified: Date.now()
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [storageKey, templateHtml, templateId, templateFields, title])

  const handleFieldChange = useCallback((fieldName, value) => {
    fieldsRef.current = { ...fieldsRef.current, [fieldName]: value }
    setTemplateFields(fieldsRef.current)
    const data = {
      mode: 'template',
      templateHtml,
      templateId,
      fields: fieldsRef.current,
      title,
      lastModified: Date.now()
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [storageKey, templateHtml, templateId, title])

  handleFieldChangeRef.current = handleFieldChange

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (mode === 'notepad') {
      saveNotepad(undefined, newTitle)
    } else {
      saveTemplate(undefined, newTitle)
    }
  }, [mode, saveNotepad, saveTemplate])

  useEffect(() => {
    if (mode !== 'template' || !templateRef.current || !templateHtml) return

    const container = templateRef.current
    container.innerHTML = extractBodyContent(templateHtml)
    const fields = fieldsRef.current

    container.querySelectorAll('[data-field]').forEach(el => {
      const name = el.getAttribute('data-field')
      const val = fields[name]

      if (el.type === 'checkbox') {
        el.checked = val === true || val === 'true' || val === 'on'
        el.addEventListener('change', () => {
          handleFieldChangeRef.current?.(name, el.checked)
        })
      } else if (el.tagName === 'TEXTAREA') {
        el.value = val || ''
        el.addEventListener('input', () => {
          handleFieldChangeRef.current?.(name, el.value)
        })
      } else {
        el.value = val ?? el.getAttribute('value') ?? ''
        el.addEventListener('input', () => {
          handleFieldChangeRef.current?.(name, el.value)
        })
      }
    })

    const getFieldValue = (fieldName) => {
      const el = container.querySelector(`[data-field="${fieldName}"]`)
      if (!el) return ''
      if (el.type === 'checkbox') return el.checked
      return el.value || ''
    }

    container.querySelectorAll('[data-roll]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const expr = getEffectiveRollExpression(btn)
        const label = btn.getAttribute('data-roll-label') || ''
        executeDiceRoll(expr, label, getFieldValue)
      })
    })
  }, [mode, templateHtml, templateRenderKey])

  const applyJsonFields = useCallback((fields) => {
    fieldsRef.current = { ...fieldsRef.current, ...fields }
    setTemplateFields(fieldsRef.current)
    const data = {
      mode: 'template',
      templateHtml,
      templateId,
      fields: fieldsRef.current,
      title,
      lastModified: Date.now()
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
    setTemplateRenderKey(k => k + 1)
  }, [storageKey, templateHtml, templateId, title])

  useEffect(() => {
    if (!showLoadMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowLoadMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLoadMenu])

  const handleImportLocal = useCallback(() => {
    setShowLoadMenu(false)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm,.txt,.json'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const raw = event.target?.result || ''

        if (file.name.endsWith('.json')) {
          try {
            const data = JSON.parse(raw)
            if (data.mode === 'template' && data.templateHtml) {
              setMode('template')
              setTemplateHtml(data.templateHtml)
              setTemplateId(data.templateId || '')
              fieldsRef.current = data.fields || {}
              setTemplateFields(fieldsRef.current)
              setTitle(data.title || '')
              localStorage.setItem(storageKey, JSON.stringify(data))
              return
            }
          } catch { /* not valid json */ }
        }

        const content = extractBodyContent(raw)
        const hasFields = /<[^>]+data-field=/.test(content)

        if (hasFields) {
          const detectedTitle = extractTitle(raw) || file.name.replace(/\.[^.]+$/, '')
          setMode('template')
          setTemplateHtml(raw)
          setTemplateId('')
          fieldsRef.current = {}
          setTemplateFields({})
          setTitle(detectedTitle)
          const data = {
            mode: 'template',
            templateHtml: raw,
            templateId: '',
            fields: {},
            title: detectedTitle,
            lastModified: Date.now()
          }
          localStorage.setItem(storageKey, JSON.stringify(data))
        } else {
          setMode('notepad')
          const detectedTitle = extractTitle(raw) || ''
          if (detectedTitle) setTitle(detectedTitle)
          setInitialContent(content || '')
          editorRef.current?.setContent(content || '')
          saveNotepad(content || '', detectedTitle || title)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [storageKey, title, saveNotepad])

  const handleImportJson = useCallback(() => {
    setShowLoadMenu(false)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result || '')
          if (!data.fields || typeof data.fields !== 'object') return

          const sourceId = data.templateId || data.title || ''
          const currentId = templateId || title || ''
          const isCompatible = !sourceId || !currentId || sourceId === currentId

          if (isCompatible) {
            applyJsonFields(data.fields)
          } else {
            setPendingJsonFields(data.fields)
            setMismatchInfo({
              source: data.title || data.templateId || '?',
              current: title || templateId || '?'
            })
            setShowMismatchModal(true)
          }
        } catch { /* invalid json */ }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [templateId, title, applyJsonFields])

  const handleMismatchConfirm = useCallback(() => {
    if (pendingJsonFields) {
      applyJsonFields(pendingJsonFields)
    }
    setShowMismatchModal(false)
    setPendingJsonFields(null)
  }, [pendingJsonFields, applyJsonFields])

  const handleMismatchCancel = useCallback(() => {
    setShowMismatchModal(false)
    setPendingJsonFields(null)
  }, [])

  const handleImportTemplate = useCallback(async () => {
    setShowLoadMenu(false)
    setShowTemplateModal(true)
    setTemplatesLoading(true)
    setTemplatesError(false)
    try {
      const res = await fetch(`${API_BASE}?action=list-templates`, { credentials: 'include' })
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

  const handleSelectTemplate = useCallback(async (template) => {
    try {
      const res = await fetch(`${API_BASE}?action=get-template&id=${encodeURIComponent(template.id)}`, { credentials: 'include' })
      const html = await res.text()

      const detectedTitle = extractTitle(html) || template.name
      setMode('template')
      setTemplateHtml(html)
      setTemplateId(template.id)
      fieldsRef.current = {}
      setTemplateFields({})
      setTitle(detectedTitle)

      const data = {
        mode: 'template',
        templateHtml: html,
        templateId: template.id,
        fields: {},
        title: detectedTitle,
        lastModified: Date.now()
      }
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      // silently fail
    }
    setShowTemplateModal(false)
  }, [storageKey])

  const handleClear = useCallback(() => {
    if (confirm(t('notes.clearConfirm'))) {
      if (mode === 'notepad') {
        editorRef.current?.clear()
      }
      setMode('notepad')
      setTemplateHtml('')
      setTemplateId('')
      fieldsRef.current = {}
      setTemplateFields({})
      setTitle('')
      setInitialContent('')
      localStorage.removeItem(storageKey)
    }
  }, [storageKey, mode])

  return (
    <div className="token-note-editor note-editor">
      <div className="note-editor-header token-note-editor-header">
        <input
          type="text"
          className="note-editor-title"
          value={title}
          onChange={handleTitleChange}
          placeholder={t('notes.titlePlaceholder')}
          maxLength={50}
        />
        <span className={`note-mode-badge ${mode}`}>
          {mode === 'template' ? t('notes.modeTemplate') : t('notes.modeNotepad')}
        </span>
        <div className="note-editor-actions">
          <div className="note-load-wrapper" ref={menuRef}>
            <button onClick={() => setShowLoadMenu(v => !v)} title={t('notes.import')}>
              📂
            </button>
            {showLoadMenu && (
              <div className="note-load-menu">
                <button onClick={handleImportLocal}>{t('notes.importLocal')}</button>
                <button onClick={handleImportTemplate}>{t('notes.importTemplate')}</button>
                {mode === 'template' && (
                  <>
                    <hr className="note-load-menu-separator" />
                    <button onClick={handleImportJson}>{t('notes.importJson')}</button>
                  </>
                )}
              </div>
            )}
          </div>
          <button onClick={handleClear} title={t('notes.clear')} className="note-btn-danger">
            🗑️
          </button>
          <button onClick={onClose} title={t('token.panelClose')} className="note-btn-close">
            ✕
          </button>
        </div>
      </div>

      <div className="note-editor-content token-note-editor-content">
        {mode === 'notepad' && (
          <SimpleWYSIWYG
            ref={editorRef}
            height="100%"
            placeholder={t('notes.placeholder')}
            initialContent={initialContent}
            onChange={handleChange}
          />
        )}
        {mode === 'template' && (
          <div className="note-template-renderer" ref={templateRef} />
        )}
      </div>

      {showTemplateModal && (
        <div className="note-template-modal">
          <div className="note-template-modal-content">
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
                  onClick={() => handleSelectTemplate(tmpl)}
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

      {showMismatchModal && (
        <div className="note-template-modal">
          <div className="note-template-modal-content">
            <h3>{t('notes.jsonMismatchTitle')}</h3>
            <p className="note-mismatch-message">
              {t('notes.jsonMismatchMessage', {
                source: mismatchInfo.source,
                current: mismatchInfo.current
              })}
            </p>
            <div className="note-template-modal-footer">
              <button onClick={handleMismatchCancel} className="note-template-cancel">
                {t('notes.jsonMismatchCancel')}
              </button>
              <button onClick={handleMismatchConfirm} className="note-mismatch-confirm">
                {t('notes.jsonMismatchConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TokenNoteEditor
