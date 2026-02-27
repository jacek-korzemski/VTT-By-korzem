import React, { useRef, useEffect, useState, useCallback } from 'react'
import SimpleWYSIWYG from '../atoms/SimpleWYSIWYG'
import { t } from '../../lang'
import { API_BASE } from '../../../config'

function parseRollExpression(expr, getFieldValue) {
  const diceRegex = /(\d*)d(\d+)/g
  const fieldRegex = /@(\w+)/g
  const conditionalRegex = /\+@(\w+)\?@(\w+)/g

  let modifier = 0
  const diceList = []

  const withoutConditionals = expr.replace(conditionalRegex, (_, valField, condField) => {
    const condVal = getFieldValue(condField)
    if (condVal === true || condVal === 'on' || condVal === 'true') {
      const val = parseInt(getFieldValue(valField), 10) || 0
      modifier += val
    }
    return ''
  })

  const withoutFields = withoutConditionals.replace(fieldRegex, (_, name) => {
    const val = parseInt(getFieldValue(name), 10) || 0
    modifier += val
    return ''
  })

  let match
  while ((match = diceRegex.exec(withoutFields)) !== null) {
    const count = parseInt(match[1], 10) || 1
    const sides = parseInt(match[2], 10)
    for (let i = 0; i < count; i++) {
      diceList.push({ type: `d${sides}`, sides })
    }
  }

  const remaining = withoutFields.replace(diceRegex, '').replace(/[+\s]/g, '')
  if (remaining) {
    const extra = parseInt(remaining, 10)
    if (!isNaN(extra)) modifier += extra
  }

  return { diceList, modifier }
}

function executeDiceRoll(expr, label, getFieldValue) {
  const { diceList, modifier } = parseRollExpression(expr, getFieldValue)
  if (diceList.length === 0) return

  const rolls = diceList.map(die => ({
    type: die.type,
    sides: die.sides,
    result: Math.floor(Math.random() * die.sides) + 1
  }))

  const total = rolls.reduce((sum, r) => sum + r.result, 0) + modifier
  const playerName = localStorage.getItem('vtt_player_name') || 'Anonymous'

  let resolvedLabel = label
  if (resolvedLabel) {
    resolvedLabel = resolvedLabel.replace(/@(\w+)/g, (_, name) => {
      const v = getFieldValue(name)
      return (v === true || v === false) ? '' : (v || '')
    }).trim()
  }

  const rollData = {
    player: resolvedLabel ? `${playerName} (${resolvedLabel})` : playerName,
    type: 'standard',
    dice: rolls,
    modifier,
    total,
    timestamp: Date.now()
  }

  window.dispatchEvent(new CustomEvent('vtt:dice-roll', { detail: rollData }))
}

function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return bodyMatch ? bodyMatch[1] : html
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return titleMatch ? titleMatch[1] : ''
}

function NoteEditor({ id, onRemove, canRemove }) {
  const storageKey = `vtt_notes_${id}`
  const editorRef = useRef(null)
  const templateRef = useRef(null)
  const menuRef = useRef(null)
  const saveMenuRef = useRef(null)
  const fieldsRef = useRef({})
  const handleFieldChangeRef = useRef(null)
  const [initialContent, setInitialContent] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState('notepad')
  const [templateHtml, setTemplateHtml] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templateFields, setTemplateFields] = useState({})
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [showSaveMenu, setShowSaveMenu] = useState(false)
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
      setInitialContent('Notatnik')
    }
  }, [storageKey])

  // --- Notepad mode persistence ---
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

  // --- Template mode persistence ---
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

  // --- Template rendering (runs only when template HTML or mode changes) ---
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
        const expr = btn.getAttribute('data-roll')
        const label = btn.getAttribute('data-roll-label') || ''
        executeDiceRoll(expr, label, getFieldValue)
      })
    })
  }, [mode, templateHtml, templateRenderKey])

  // --- Export ---
  const handleExportHtml = useCallback(() => {
    setShowSaveMenu(false)
    const filename = title || `notepad-${id}`

    let content
    if (mode === 'notepad') {
      content = editorRef.current?.getContent() || ''
    } else {
      const container = templateRef.current
      if (!container) return
      container.querySelectorAll('[data-field]').forEach(el => {
        if (el.type === 'checkbox') {
          if (el.checked) el.setAttribute('checked', '')
          else el.removeAttribute('checked')
        } else {
          el.setAttribute('value', el.value || '')
        }
      })
      content = container.innerHTML
    }

    const blob = new Blob([`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td { border: 1px solid #ccc; padding: 8px; }
    .section-header { text-align: center; font-weight: bold; background: #f5f5f5; }
    .section-header-sm { text-align: center; font-weight: bold; color: #666; }
    .center { text-align: center; }
    .right { text-align: right; }
    input[type="text"], textarea { border: 1px solid #ccc; padding: 2px 4px; border-radius: 3px; font-family: inherit; }
    input.plain, textarea.plain { border: none; border-bottom: 1px solid #ccc; border-radius: 0; }
    input.circle { width: 36px; height: 36px; border-radius: 50%; text-align: center; font-weight: bold; border: 2px solid #999; }
    input.box { text-align: center; }
    input.xs { width: 36px; } input.sm { width: 60px; } .wide { width: 100%; box-sizing: border-box; }
    .roll-btn { display: none; }
  </style>
</head>
<body>
${content}
</body>
</html>`], { type: 'text/html' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename.replace(/[^a-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/gi, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [title, id, mode])

  const handleExportJson = useCallback(() => {
    setShowSaveMenu(false)
    if (mode !== 'template') return
    const filename = title || `template-${id}`
    const data = {
      mode: 'template',
      templateId,
      templateHtml,
      fields: templateFields,
      title,
      lastModified: Date.now()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename.replace(/[^a-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/gi, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [mode, templateId, templateHtml, templateFields, title, id])

  // --- Import ---
  useEffect(() => {
    if (!showLoadMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowLoadMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLoadMenu])

  useEffect(() => {
    if (!showSaveMenu) return
    const handleClickOutside = (e) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) setShowSaveMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSaveMenu])

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
          } catch { /* not valid json, treat as HTML */ }
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
          setInitialContent(content)
          editorRef.current?.setContent(content)
          saveNotepad(content, detectedTitle || title)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [storageKey, title, saveNotepad])

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

  const handleSelectTemplate = useCallback(async (template) => {
    try {
      const res = await fetch(`${API_BASE}?action=get-template&id=${encodeURIComponent(template.id)}`)
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
      setInitialContent('Notatnik')
      localStorage.removeItem(storageKey)
    }
  }, [storageKey, mode])

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
                {mode === 'template' && (<>
                  <hr className="note-load-menu-separator" />
                  <button onClick={handleImportJson}>{t('notes.importJson')}</button>
                </>)}
              </div>
            )}
          </div>
          <div className="note-save-wrapper" ref={saveMenuRef}>
            <button onClick={() => {
              if (mode === 'notepad') {
                handleExportHtml()
              } else {
                setShowSaveMenu(v => !v)
              }
            }} title={t('notes.export')}>
              💾
            </button>
            {showSaveMenu && mode === 'template' && (
              <div className="note-load-menu">
                <button onClick={handleExportJson}>{t('notes.saveJson')}</button>
                <button onClick={handleExportHtml}>{t('notes.saveHtml')}</button>
              </div>
            )}
          </div>
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
        {mode === 'notepad' && initialContent && (
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
        <div className="note-template-modal" onClick={handleMismatchCancel}>
          <div className="note-template-modal-content" onClick={e => e.stopPropagation()}>
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

export default NoteEditor
