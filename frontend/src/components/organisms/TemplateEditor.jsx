import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE } from '../../../config'
import { t } from '../../lang'
import { templateModelToHtml, htmlToModel } from '../../utils/templateEditorUtils'

const ROW_TYPES = [
  { value: 'text', labelKey: 'rowTypeText' },
  { value: 'textarea', labelKey: 'rowTypeTextarea' },
  { value: 'checkbox', labelKey: 'rowTypeCheckbox' },
  { value: 'textWithRoll', labelKey: 'rowTypeTextWithRoll' },
]

const TEMPLATE_EMOJI_GROUPS = [
  { name: '⚔️', emojis: ['⚔️', '🗡️', '🏹', '🛡️', '🪓', '🔱'] },
  { name: '🔮', emojis: ['🔮', '🪄', '✨', '🧪', '📜'] },
  { name: '🧙', emojis: ['🧙', '🧝', '🧛', '🧟', '👻', '💀'] },
  { name: '🐉', emojis: ['🐉', '🐲', '🦇', '🕷️', '🦂', '🐺'] },
  { name: '💰', emojis: ['💰', '💎', '🏆', '🪙'] },
  { name: '❤️', emojis: ['❤️', '🖤', '✅', '❌', '⚠️', '🎲'] },
]

const defaultCell = (type = 'text') => ({
  type,
  label: '',
  fieldId: '',
  size: 'normal',
  style: 'plain',
  rollFormula: '', // empty allowed; for textWithRoll user can leave empty and use only field value
  rollLabel: '',
})

const defaultRow = () => ({ cells: [defaultCell('text')] })

const defaultSection = () => ({
  title: '',
  emoji: '',
  rows: [defaultRow()],
})

function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return bodyMatch ? bodyMatch[1] : html
}

function TemplateEmojiPicker({ value, onChange }) {
  const buttonRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)

  const handleSelect = (emoji) => {
    if (onChange) onChange(emoji === value ? '' : emoji)
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
      const PANEL_MAX = 260
      const spaceBelow = window.innerHeight - rect.bottom - MARGIN
      const spaceAbove = rect.top - MARGIN
      const openUp = spaceBelow < 160 && spaceAbove >= spaceBelow
      let top, bottom, maxHeight = PANEL_MAX
      if (openUp) {
        bottom = window.innerHeight - rect.top + 4
        maxHeight = Math.min(PANEL_MAX, spaceAbove)
      } else {
        top = rect.bottom + 4
        if (top + maxHeight > window.innerHeight - MARGIN) maxHeight = Math.min(PANEL_MAX, window.innerHeight - top - MARGIN)
      }
      if (top !== undefined && top < MARGIN) {
        top = MARGIN
        maxHeight = Math.min(PANEL_MAX, window.innerHeight - MARGIN * 2)
      }
      let left = rect.left
      const w = Math.min(280, window.innerWidth - MARGIN * 2)
      if (left + w > window.innerWidth - MARGIN) left = window.innerWidth - w - MARGIN
      if (left < MARGIN) left = MARGIN
      setPosition({ top, bottom, left, maxHeight, width: w })
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
    <div className="macro-icon-picker template-emoji-picker">
      <div className="macro-icon-picker-row">
        <button
          ref={buttonRef}
          type="button"
          className={`macro-icon-current ${value ? 'has-icon' : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          title={value ? t('macros.iconClear') : t('templates.sectionEmoji')}
          aria-label={t('templates.sectionEmoji')}
        >
          {value || '—'}
        </button>
      </div>
    </div>
  )

  if (!open || !position) return button

  return (
    <>
      {button}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className="macro-icon-menu template-emoji-menu"
            style={{
              position: 'fixed',
              ...(position.top !== undefined ? { top: position.top } : {}),
              ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
              left: position.left,
              maxHeight: position.maxHeight,
              width: position.width,
              zIndex: 7910001,
            }}
          >
            <div className="macro-icon-menu-inner">
              <div className="macro-icon-groups">
                {TEMPLATE_EMOJI_GROUPS.map((group) => (
                  <div key={group.name} className="macro-icon-group">
                    <span className="macro-icon-group-label">{group.name}</span>
                    <div className="macro-icon-group-emojis">
                      {group.emojis.map((emoji) => (
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

function TemplateEditor({ onSave, onCancel, initialTemplateId, initialHtml }) {
  const isEditMode = Boolean(initialTemplateId && initialHtml)
  const [templateName, setTemplateName] = useState('')
  const [sections, setSections] = useState([defaultSection()])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!isEditMode || !initialHtml) return
    const model = htmlToModel(initialHtml)
    if (model) {
      setTemplateName(model.templateName || '')
      setSections(Array.isArray(model.sections) && model.sections.length > 0 ? model.sections : [defaultSection()])
      setLoadError('')
    } else {
      setLoadError(t('templates.cannotLoadForEdit') || 'Cannot load this template for editing.')
    }
  }, [isEditMode, initialHtml])

  const updateSection = useCallback((sectionIndex, patch) => {
    setSections((prev) => prev.map((s, i) => (i === sectionIndex ? { ...s, ...patch } : s)))
  }, [])

  const updateCell = useCallback((sectionIndex, rowIndex, cellIndex, patch) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s
        return {
          ...s,
          rows: s.rows.map((r, ri) => {
            if (ri !== rowIndex) return r
            return {
              ...r,
              cells: r.cells.map((c, ci) => (ci === cellIndex ? { ...c, ...patch } : c)),
            }
          }),
        }
      })
    )
  }, [])

  const addSection = useCallback(() => {
    setSections((prev) => [...prev, defaultSection()])
  }, [])

  const removeSection = useCallback((index) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addRow = useCallback((sectionIndex) => {
    setSections((prev) =>
      prev.map((s, i) => (i === sectionIndex ? { ...s, rows: [...s.rows, defaultRow()] } : s))
    )
  }, [])

  const addCell = useCallback((sectionIndex, rowIndex) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s
        return {
          ...s,
          rows: s.rows.map((r, ri) =>
            ri === rowIndex ? { ...r, cells: [...r.cells, defaultCell('text')] } : r
          ),
        }
      })
    )
  }, [])

  const removeRow = useCallback((sectionIndex, rowIndex) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s
        const rows = s.rows.filter((_, j) => j !== rowIndex)
        return { ...s, rows: rows.length > 0 ? rows : [defaultRow()] }
      })
    )
  }, [])

  const removeCell = useCallback((sectionIndex, rowIndex, cellIndex) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s
        return {
          ...s,
          rows: s.rows.map((r, ri) => {
            if (ri !== rowIndex) return r
            const cells = r.cells.filter((_, j) => j !== cellIndex)
            return { ...r, cells: cells.length > 0 ? cells : [defaultCell('text')] }
          }),
        }
      })
    )
  }, [])

  const duplicateRow = useCallback((sectionIndex, rowIndex) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s
        const row = s.rows[rowIndex]
        const copy = { cells: row.cells.map((c) => ({ ...c })) }
        const rows = [...s.rows]
        rows.splice(rowIndex + 1, 0, copy)
        return { ...s, rows }
      })
    )
  }, [])

  const duplicateCell = useCallback((sectionIndex, rowIndex, cellIndex) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s
        return {
          ...s,
          rows: s.rows.map((r, ri) => {
            if (ri !== rowIndex) return r
            const cell = r.cells[cellIndex]
            const cells = [...r.cells]
            cells.splice(cellIndex + 1, 0, { ...cell })
            return { ...r, cells }
          }),
        }
      })
    )
  }, [])

  const handleSave = useCallback(async () => {
    const name = templateName.trim()
    if (!name) {
      setSaveError(t('templates.templateName') + '?')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const html = templateModelToHtml({ templateName: name, sections })
      const body = isEditMode && initialTemplateId
        ? { id: initialTemplateId, name, html }
        : { name, html }
      const res = await fetch(`${API_BASE}?action=save-template`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        onSave()
      } else {
        setSaveError(data.error || t('templates.saveFailed'))
      }
    } catch {
      setSaveError(t('templates.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [templateName, sections, onSave, isEditMode, initialTemplateId])

  const model = { templateName: templateName.trim() || 'Untitled', sections }
  const previewHtml = templateModelToHtml(model)
  const previewBody = extractBodyContent(previewHtml)

  return (
    <div
      className="note-template-modal template-editor-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="note-template-modal-content template-editor-content">
        <div className="template-editor-header">
          <h3>{isEditMode ? t('templates.editTemplate') : t('templates.createInEditor')}</h3>
        </div>

        {loadError && (
          <div className="template-editor-error template-editor-load-error">{loadError}</div>
        )}

        <div className="template-editor-scroll">
          <div className="template-editor-layout">
            <div className="template-editor-form">
              <div className="template-editor-field">
                <label>{t('templates.templateName')}</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t('templates.templateNamePlaceholder')}
                />
              </div>

              {sections.map((section, sIdx) => (
                <div key={sIdx} className="template-editor-section-block">
                  <div className="template-editor-section-header">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                      placeholder={t('templates.sectionTitle')}
                    />
                    <TemplateEmojiPicker
                      value={section.emoji || ''}
                      onChange={(emoji) => updateSection(sIdx, { emoji })}
                    />
                    <button
                      type="button"
                      className="template-editor-btn-remove"
                      onClick={() => removeSection(sIdx)}
                      title={t('templates.removeSection')}
                    >
                      ✕
                    </button>
                  </div>

                  {section.rows.map((row, rIdx) => (
                    <div key={rIdx} className="template-editor-row-block">
                      <div className="template-editor-row-actions">
                        <span className="template-editor-row-label">Row {rIdx + 1}</span>
                        <button
                          type="button"
                          className="template-editor-btn-small"
                          onClick={() => duplicateRow(sIdx, rIdx)}
                          title={t('templates.duplicateRow')}
                        >
                          {t('templates.duplicateRow')}
                        </button>
                        <button
                          type="button"
                          className="template-editor-btn-remove-row"
                          onClick={() => removeRow(sIdx, rIdx)}
                          title={t('templates.removeRow')}
                        >
                          ✕
                        </button>
                      </div>
                      {row.cells.map((cell, cIdx) => (
                        <div key={cIdx} className="template-editor-cell">
                          <div className="template-editor-cell-actions">
                            <button
                              type="button"
                              className="template-editor-btn-small"
                              onClick={() => duplicateCell(sIdx, rIdx, cIdx)}
                              title={t('templates.duplicateCell')}
                            >
                              {t('templates.duplicateCell')}
                            </button>
                            {row.cells.length > 1 && (
                              <button
                                type="button"
                                className="template-editor-btn-remove-row"
                                onClick={() => removeCell(sIdx, rIdx, cIdx)}
                                title={t('templates.removeRow')}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="template-editor-row">
                            <select
                              value={cell.type}
                              onChange={(e) =>
                                updateCell(sIdx, rIdx, cIdx, { ...defaultCell(e.target.value), type: e.target.value })
                              }
                            >
                              {ROW_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {t('templates.' + opt.labelKey)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={cell.label}
                              onChange={(e) => updateCell(sIdx, rIdx, cIdx, { label: e.target.value })}
                              placeholder={t('templates.rowLabel')}
                            />
                            <input
                              type="text"
                              value={cell.fieldId}
                              onChange={(e) => updateCell(sIdx, rIdx, cIdx, { fieldId: e.target.value })}
                              placeholder={t('templates.rowFieldIdPlaceholder')}
                            />
                            {(cell.type === 'text' || cell.type === 'textWithRoll') && (
                              <>
                                <select
                                  value={cell.size}
                                  onChange={(e) => updateCell(sIdx, rIdx, cIdx, { size: e.target.value })}
                                >
                                  <option value="normal">{t('templates.inputSizeNormal')}</option>
                                  <option value="wide">{t('templates.inputSizeWide')}</option>
                                </select>
                                <select
                                  value={cell.style}
                                  onChange={(e) => updateCell(sIdx, rIdx, cIdx, { style: e.target.value })}
                                >
                                  <option value="plain">{t('templates.inputStylePlain')}</option>
                                  <option value="box">{t('templates.inputStyleBox')}</option>
                                  <option value="circle">{t('templates.inputStyleCircle')}</option>
                                </select>
                              </>
                            )}
                            {cell.type === 'textWithRoll' && (
                              <>
                                <input
                                  type="text"
                                  value={cell.rollFormula}
                                  onChange={(e) => updateCell(sIdx, rIdx, cIdx, { rollFormula: e.target.value })}
                                  placeholder={t('templates.rollFormulaPlaceholder')}
                                />
                                <div className="template-editor-roll-label-wrap">
                                  <input
                                    type="text"
                                    value={cell.rollLabel}
                                    onChange={(e) => updateCell(sIdx, rIdx, cIdx, { rollLabel: e.target.value })}
                                    placeholder={t('templates.rollLabelPlaceholder')}
                                    title={t('templates.rollLabelHelp')}
                                  />
                                  <span className="template-editor-field-hint">{t('templates.rollLabelHelp')}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="template-editor-btn-add-row"
                        onClick={() => addCell(sIdx, rIdx)}
                      >
                        + {t('templates.addCell')}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="template-editor-btn-add-row"
                    onClick={() => addRow(sIdx)}
                  >
                    + {t('templates.addRow')}
                  </button>
                </div>
              ))}

              <button type="button" className="template-editor-btn-add-section" onClick={addSection}>
                + {t('templates.addSection')}
              </button>
            </div>

            <div className="template-editor-preview">
              <div
                className="note-template-renderer template-editor-preview-renderer"
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />
            </div>
          </div>
        </div>

        {saveError && <div className="template-editor-error">{saveError}</div>}
        <div className="note-template-modal-footer template-editor-footer">
          <button type="button" onClick={onCancel} className="note-template-cancel">
            {t('templates.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="template-editor-btn-save"
            disabled={saving}
          >
            {saving ? '...' : t('templates.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateEditor
