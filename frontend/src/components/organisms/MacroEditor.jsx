import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNotesTemplate } from '../../contexts/NotesTemplateContext'
import { executeDiceRoll, parseRollExpression } from '../../utils/diceRollUtils'
import { t } from '../../lang'

const STORAGE_KEY = 'vtt_macros'

const MACRO_EMOJI_GROUPS = [
  { name: '⚔️', emojis: ['⚔️', '🗡️', '🏹', '🛡️', '🪓', '🔱'] },
  { name: '🔮', emojis: ['🔮', '🪄', '✨', '🧪', '📜'] },
  { name: '🧙', emojis: ['🧙', '🧝', '🧛', '🧟', '👻', '💀'] },
  { name: '🐉', emojis: ['🐉', '🐲', '🦇', '🕷️', '🦂', '🐺'] },
  { name: '💰', emojis: ['💰', '💎', '🏆', '🪙'] },
  { name: '❤️', emojis: ['❤️', '🖤', '✅', '❌', '⚠️', '🎲'] }
]

function loadMacros() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveMacros(macros) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(macros))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vtt:macros-changed'))
  }
}

function MacroIconPicker({ value, onChange }) {
  const buttonRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)

  const handleSelect = (emoji) => {
    if (!onChange) return
    onChange(emoji === value ? '' : emoji)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const anchor = buttonRef.current
    if (!anchor) return

    const run = () => {
      const rect = anchor.getBoundingClientRect()
      const MARGIN = 8
      const PANEL_MAX_WIDTH = 280
      const PANEL_MAX_HEIGHT = 260

      const spaceBelow = window.innerHeight - rect.bottom - MARGIN
      const spaceAbove = rect.top - MARGIN
      const openUp = spaceBelow < 160 && spaceAbove >= spaceBelow

      let top
      let bottom
      let maxHeight = PANEL_MAX_HEIGHT

      if (openUp) {
        bottom = window.innerHeight - rect.top + 4
        maxHeight = Math.min(PANEL_MAX_HEIGHT, spaceAbove)
      } else {
        top = rect.bottom + 4
        if (top + maxHeight > window.innerHeight - MARGIN) {
          maxHeight = Math.min(PANEL_MAX_HEIGHT, window.innerHeight - top - MARGIN)
        }
      }

      if (top !== undefined && top < MARGIN) {
        top = MARGIN
        maxHeight = Math.min(PANEL_MAX_HEIGHT, window.innerHeight - MARGIN * 2)
      }

      let left = rect.left
      const panelWidth = Math.min(PANEL_MAX_WIDTH, window.innerWidth - MARGIN * 2)
      if (left + panelWidth > window.innerWidth - MARGIN) {
        left = window.innerWidth - panelWidth - MARGIN
      }
      if (left < MARGIN) left = MARGIN

      setPosition({ top, bottom, left, maxHeight, width: panelWidth })
    }

    const id = requestAnimationFrame(run)
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (buttonRef.current && buttonRef.current.contains(e.target)) return
      if (e.target.closest('.macro-icon-menu')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const button = (
    <div className="macro-icon-picker">
      <label>
        {t('macros.iconLabel')}
        <div className="macro-icon-picker-row">
          <button
            ref={buttonRef}
            type="button"
            className={`macro-icon-current ${value ? 'has-icon' : ''}`}
            onClick={() => setOpen(o => !o)}
            title={value ? t('macros.iconClear') : t('macros.iconLabel')}
          >
            {value || '—'}
          </button>
        </div>
      </label>
    </div>
  )

  if (!open || !position) {
    return button
  }

  return (
    <>
      {button}
      {typeof document !== 'undefined' && createPortal(
        <div
          className="macro-icon-menu"
          style={{
            position: 'fixed',
            ...(position.top !== undefined ? { top: position.top } : {}),
            ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
            left: position.left,
            maxHeight: position.maxHeight,
            width: position.width,
            zIndex: 999999
          }}
        >
          <div className="macro-icon-menu-inner">
            <div className="macro-icon-groups">
              {MACRO_EMOJI_GROUPS.map(group => (
                <div key={group.name} className="macro-icon-group">
                  <span className="macro-icon-group-label">{group.name}</span>
                  <div className="macro-icon-group-emojis">
                    {group.emojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        className={`macro-icon-btn ${value === emoji ? 'active' : ''}`}
                        onClick={() => handleSelect(emoji)}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function MacroEditor() {
  const [macros, setMacros] = useState(loadMacros)
  const [editingId, setEditingId] = useState(null)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formExpression, setFormExpression] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formSourceNoteId, setFormSourceNoteId] = useState('')
  const [formIcon, setFormIcon] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [fieldsOpen, setFieldsOpen] = useState(true)
  const { sources, getFieldValue: ctxGetFieldValue } = useNotesTemplate() || {}

  const sortedMacros = useMemo(() => {
    const list = [...macros]
    if (sortBy === 'date-desc' || sortBy === 'date-asc') {
      list.sort((a, b) => {
        const timeA = a.createdAt ?? (parseInt(a.id, 10) || 0)
        const timeB = b.createdAt ?? (parseInt(b.id, 10) || 0)
        return sortBy === 'date-desc' ? timeB - timeA : timeA - timeB
      })
    } else {
      list.sort((a, b) => {
        const nameA = (a.name || a.expression || '').toLowerCase()
        const nameB = (b.name || b.expression || '').toLowerCase()
        const cmp = nameA.localeCompare(nameB)
        return sortBy === 'name-desc' ? -cmp : cmp
      })
    }
    return list
  }, [macros, sortBy])

  const persist = useCallback((next) => {
    setMacros(prev => {
      const nextList = typeof next === 'function' ? next(prev) : next
      saveMacros(nextList)
      return nextList
    })
  }, [])

  const startAdd = useCallback(() => {
    setEditingId(null)
    setIsAddFormOpen(true)
    setFormName('')
    setFormExpression('')
    setFormLabel('')
    setFormSourceNoteId('')
    setFormIcon('')
  }, [])

  const startEdit = useCallback((macro) => {
    setEditingId(macro.id)
    setFormName(macro.name || '')
    setFormExpression(macro.expression || '')
    setFormLabel(macro.label || '')
    setFormSourceNoteId(macro.sourceNoteId || '')
    setFormIcon(macro.icon || '')
  }, [])

  const saveMacro = useCallback(() => {
    const name = formName.trim()
    const expression = formExpression.trim()
    if (!expression) return

    if (editingId) {
      persist(prev => prev.map(m => m.id === editingId
        ? { ...m, name, expression, label: formLabel.trim(), sourceNoteId: formSourceNoteId || undefined, icon: formIcon || undefined }
        : m
      ))
    } else {
      persist(prev => [...prev, {
        id: Date.now().toString(),
        createdAt: Date.now(),
        name,
        expression,
        label: formLabel.trim(),
        sourceNoteId: formSourceNoteId || undefined,
        icon: formIcon || undefined
      }])
    }
    setEditingId(null)
    setIsAddFormOpen(false)
    setFormName('')
    setFormExpression('')
    setFormLabel('')
    setFormSourceNoteId('')
    setFormIcon('')
  }, [editingId, formName, formExpression, formLabel, formSourceNoteId, formIcon, persist])

  const closeForm = useCallback(() => {
    setEditingId(null)
    setIsAddFormOpen(false)
    setFormName('')
    setFormExpression('')
    setFormLabel('')
    setFormSourceNoteId('')
    setFormIcon('')
  }, [])

  const deleteMacro = useCallback((id) => {
    persist(prev => prev.filter(m => m.id !== id))
    if (editingId === id) closeForm()
  }, [editingId, persist, closeForm])

  const runMacro = useCallback((macro) => {
    const getFieldValue = macro.sourceNoteId && ctxGetFieldValue
      ? (fieldName) => ctxGetFieldValue(macro.sourceNoteId, fieldName)
      : () => ''
    executeDiceRoll(macro.expression, macro.label || macro.name, getFieldValue)
  }, [ctxGetFieldValue])

  const showForm = isAddFormOpen || editingId !== null || formExpression !== '' || formName !== ''

  const canSave = formExpression.trim().length > 0
  const noDice = useCallback((expr, getter) => {
    const { diceList } = parseRollExpression(expr, getter)
    return diceList.length === 0
  }, [])

  const insertFieldAndOpenForm = useCallback((fieldName) => {
    setFormExpression(prev => prev + (prev ? ' ' : '') + `@${fieldName}`)
    setIsAddFormOpen(true)
  }, [])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = (e) => {
      const file = e.target?.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const raw = ev.target?.result
          if (typeof raw !== 'string') return
          const data = JSON.parse(raw)
          const list = Array.isArray(data) ? data : []
          const normalized = list
            .filter(m => m && typeof m.expression === 'string' && m.expression.trim())
            .map((m, i) => ({
              id: typeof m.id === 'string' ? m.id : `${Date.now()}-${i}`,
              createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
              name: typeof m.name === 'string' ? m.name : '',
              expression: String(m.expression).trim(),
              label: typeof m.label === 'string' ? m.label : '',
              sourceNoteId: typeof m.sourceNoteId === 'string' ? m.sourceNoteId : undefined,
              icon: typeof m.icon === 'string' && m.icon ? m.icon : undefined
            }))
          persist(() => normalized)
        } catch {
          // invalid file – ignore
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [persist])

  return (
    <div className="macro-editor">
      <div className="macro-editor-header">
        <h2>⚡ {t('macros.title')}</h2>
        <div className="macro-editor-actions">
          <button type="button" className="macro-import-btn" onClick={handleImport} title={t('macros.import')}>
            {t('macros.import')}
          </button>
          <button type="button" className="macro-export-btn" onClick={() => {
            const blob = new Blob([JSON.stringify(macros, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'vtt-macros.json'
            a.click()
            URL.revokeObjectURL(url)
          }}>
            {t('macros.export')}
          </button>
          <button type="button" className="macro-add-btn" onClick={startAdd}>
            + {t('macros.add')}
          </button>
          <button type="button" className="macro-info-btn" onClick={() => setShowInfoModal(true)} title={t('macros.infoButtonTitle')}>
            ℹ️
          </button>
        </div>
      </div>

      {showInfoModal && (
        <div className="macro-info-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="macro-info-modal" onClick={e => e.stopPropagation()}>
            <h3>{t('macros.infoTitle')}</h3>
            <div className="macro-info-modal-body">
              <h4>{t('macros.infoWhereFieldsHeading')}</h4>
              <p>{t('macros.infoWhereFields')}</p>
              <h4>{t('macros.infoCreateHeading')}</h4>
              <p>{t('macros.infoCreate')}</p>
              <h4>{t('macros.infoEditHeading')}</h4>
              <p>{t('macros.infoEdit')}</p>
              <h4>{t('macros.infoRunHeading')}</h4>
              <p>{t('macros.infoRun')}</p>
              <h4>{t('macros.infoExamplesHeading')}</h4>
              <p>{t('macros.infoExamplesIntro')}</p>
              <ul className="macro-info-examples">
                <li><code>2d6</code> — {t('macros.infoEx1')}</li>
                <li><code>1d20+@str</code> — {t('macros.infoEx2')}</li>
                <li><code>2d6+@str</code> — {t('macros.infoEx3')}</li>
                <li><code>d@wpn1_die</code> — {t('macros.infoEx4')}</li>
              </ul>
              <p>{t('macros.infoExamplesNote')}</p>
            </div>
            <div className="macro-info-modal-footer">
              <button type="button" className="macro-info-close-btn" onClick={() => setShowInfoModal(false)}>
                {t('macros.infoClose')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="macro-editor-columns">
        {sources && sources.length > 0 && (
          <div className={`macro-editor-fields ${fieldsOpen ? 'open' : 'closed'}`}>
            <h3>{t('macros.fieldsFromNotes')}</h3>
            {sources.map(src => (
              <div key={src.noteId} className="macro-note-source">
                <span className="macro-note-title">
                  {t('macros.noteTitle', { index: src.noteIndex, title: src.title || t('macros.untitledNote') })}
                </span>
                <div className="macro-field-chips">
                  {(src.fieldNames || []).map(f => {
                    const label = src.fieldLabels?.[f]
                    const display = label ? `${label} – @${f}` : `@${f}`
                    return (
                      <button
                        key={f}
                        type="button"
                        className="macro-field-chip"
                        onClick={() => insertFieldAndOpenForm(f)}
                        title={t('macros.insertField')}
                      >
                        {display}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {sources && sources.length > 0 && (
          <button
            type="button"
            className={`macro-fields-toggle ${fieldsOpen ? 'open' : ''}`}
            onClick={() => setFieldsOpen(prev => !prev)}
            title={fieldsOpen ? t('pdf.collapseSidebar') : t('pdf.expandSidebar')}
          >
            {fieldsOpen ? '◀' : '▶'}
          </button>
        )}

        <div className="macro-editor-main">
          {showForm && (
            <div className="macro-form-panel">
              <h3>{editingId ? t('macros.edit') : t('macros.add')}</h3>
              <div className="macro-form">
                <label>
                  {t('macros.name')}
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={t('macros.namePlaceholder')}
                  />
                </label>
                <label>
                  {t('macros.expression')}
                  <input
                    type="text"
                    value={formExpression}
                    onChange={e => setFormExpression(e.target.value)}
                    placeholder="2d6+@str"
                  />
                </label>
                <label>
                  {t('macros.label')}
                  <input
                    type="text"
                    value={formLabel}
                    onChange={e => setFormLabel(e.target.value)}
                    placeholder={t('macros.labelPlaceholder')}
                  />
                </label>
                <MacroIconPicker value={formIcon} onChange={setFormIcon} />
                {sources && sources.length > 0 && (
                  <label>
                    {t('macros.sourceNote')}
                    <select
                      value={formSourceNoteId}
                      onChange={e => setFormSourceNoteId(e.target.value)}
                    >
                      <option value="">—</option>
                      {sources.map(src => (
                        <option key={src.noteId} value={src.noteId}>
                          {t('macros.noteTitle', { index: src.noteIndex, title: src.title || t('macros.untitledNote') })}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="macro-form-buttons">
                  <button type="button" className="macro-save-btn" onClick={saveMacro} disabled={!canSave}>
                    {t('macros.save')}
                  </button>
                  <button type="button" className="macro-cancel-btn" onClick={closeForm}>
                    {t('macros.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="macro-list">
            <div className="macro-list-header">
              <h3>{t('macros.listTitle')}</h3>
              <label className="macro-sort-label">
                {t('macros.sortBy')}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="macro-sort-select">
                  <option value="date-desc">{t('macros.sortDateNewest')}</option>
                  <option value="date-asc">{t('macros.sortDateOldest')}</option>
                  <option value="name-asc">{t('macros.sortNameAZ')}</option>
                  <option value="name-desc">{t('macros.sortNameZA')}</option>
                </select>
              </label>
            </div>
            {sortedMacros.length === 0 ? (
              <p className="macro-list-empty">{t('macros.noMacros')}</p>
            ) : (
              <ul className="macro-list-items">
                {sortedMacros.map(macro => (
                  <li key={macro.id} className="macro-list-item">
                    <div className="macro-item-info">
                      <span className="macro-item-name">
                        {macro.icon && <span className="macro-item-icon">{macro.icon}</span>}
                        {macro.name || macro.expression}
                      </span>
                      <span className="macro-item-expr">{macro.expression}</span>
                      {macro.sourceNoteId && sources?.length > 0 && (
                        <span className="macro-item-source">
                          {t('macros.noteTitle', {
                            index: sources.find(s => s.noteId === macro.sourceNoteId)?.noteIndex ?? '?',
                            title: sources.find(s => s.noteId === macro.sourceNoteId)?.title || t('macros.untitledNote')
                          })}
                        </span>
                      )}
                    </div>
                    <div className="macro-item-actions">
                      <button
                        type="button"
                        className="macro-run-btn"
                        onClick={() => runMacro(macro)}
                        disabled={noDice(macro.expression, macro.sourceNoteId && ctxGetFieldValue ? (fn) => ctxGetFieldValue(macro.sourceNoteId, fn) : () => '')}
                        title={t('macros.run')}
                      >
                        🎲
                      </button>
                      <button type="button" className="macro-edit-btn" onClick={() => startEdit(macro)} title={t('macros.edit')}>
                        ✎
                      </button>
                      <button type="button" className="macro-delete-btn" onClick={() => deleteMacro(macro.id)} title={t('macros.delete')}>
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MacroEditor
