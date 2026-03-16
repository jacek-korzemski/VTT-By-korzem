import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE } from '../../../config'
import { t } from '../../lang'
import TemplateEditor from './TemplateEditor'
import { executeDiceRoll, getEffectiveRollExpression } from '../../utils/diceRollUtils'
import { detectTemplateKind, htmlToModel } from '../../utils/templateEditorUtils'

function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return bodyMatch ? bodyMatch[1] : html
}

function TemplateManager() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewName, setPreviewName] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState(null)
  const [editHtml, setEditHtml] = useState(null)
  const [showCustomWarning, setShowCustomWarning] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const previewContainerRef = useRef(null)
  const fileInputRef = useRef(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API_BASE}?action=list-templates`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates || [])
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleDelete = useCallback(async (template) => {
    if (!confirm(t('templates.deleteConfirm'))) return
    try {
      const res = await fetch(`${API_BASE}?action=delete-template`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id }),
      })
      const data = await res.json()
      if (data.success) {
        if (previewId === template.id) {
          setPreviewId(null)
          setPreviewHtml('')
          setPreviewName('')
        }
        fetchTemplates()
      } else {
        alert(data.error || t('templates.deleteFailed'))
      }
    } catch (err) {
      alert(t('templates.deleteFailed'))
    }
  }, [fetchTemplates, previewId])

  const handlePreview = useCallback(async (template) => {
    try {
      const res = await fetch(`${API_BASE}?action=get-template&id=${encodeURIComponent(template.id)}`, {
        credentials: 'include',
      })
      const html = await res.text()
      setPreviewName(template.name)
      setPreviewHtml(html)
      setPreviewId(template.id)
    } catch {
      setError(true)
    }
  }, [])

  const closePreview = useCallback(() => {
    setPreviewId(null)
    setPreviewHtml('')
    setPreviewName('')
    setShowCustomWarning(false)
  }, [])

  const handleEditTemplate = useCallback(() => {
    const kind = detectTemplateKind(previewHtml)
    if (kind === 'editor' || kind === 'custom-clone') {
      const model = htmlToModel(previewHtml)
      if (!model) {
        alert(t('templates.cannotLoadForEdit'))
        return
      }
      setEditTemplateId(previewId)
      setEditHtml(previewHtml)
      closePreview()
      setShowEditor(true)
    } else {
      setShowCustomWarning(true)
    }
  }, [previewHtml, previewId, closePreview])

  const handleCustomOpenReadOnly = useCallback(() => {
    setShowCustomWarning(false)
  }, [])

  const handleDuplicateAndEdit = useCallback(async () => {
    if (!previewId) return
    setCloning(true)
    try {
      const res = await fetch(`${API_BASE}?action=clone-template`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: previewId }),
      })
      const data = await res.json()
      if (!data.success || !data.template?.id) {
        alert(data.error || t('templates.saveFailed'))
        return
      }
      const newId = data.template.id
      const getRes = await fetch(`${API_BASE}?action=get-template&id=${encodeURIComponent(newId)}`, {
        credentials: 'include',
      })
      const newHtml = await getRes.text()
      closePreview()
      setEditTemplateId(newId)
      setEditHtml(newHtml)
      setShowEditor(true)
    } catch {
      alert(t('templates.saveFailed'))
    } finally {
      setCloning(false)
    }
  }, [previewId, closePreview])

  // Bind preview container for dice rolls (same logic as NoteEditor)
  useEffect(() => {
    if (!previewContainerRef.current || !previewHtml) return
    const container = previewContainerRef.current
    const getFieldValue = (fieldName) => {
      const el = container.querySelector(`[data-field="${fieldName}"]`)
      if (!el) return ''
      if (el.type === 'checkbox') return el.checked
      return el.value || ''
    }
    container.querySelectorAll('[data-roll]').forEach((btn) => {
      const clone = btn.cloneNode(true)
      btn.parentNode.replaceChild(clone, btn)
      clone.addEventListener('click', (e) => {
        e.preventDefault()
        const expr = getEffectiveRollExpression(clone)
        const label = clone.getAttribute('data-roll-label') || ''
        executeDiceRoll(expr, label, getFieldValue)
      })
    })
  }, [previewId, previewHtml])

  const handleUploadFile = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setUploading(true)
      const formData = new FormData()
      formData.append('type', 'template')
      formData.append('file', file)
      fetch(`${API_BASE}?action=upload-asset`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            fetchTemplates()
          } else {
            alert(data.error || t('upload.genericError'))
          }
        })
        .catch(() => alert(t('upload.genericError')))
        .finally(() => {
          setUploading(false)
          e.target.value = ''
        })
    },
    [fetchTemplates]
  )

  const handleEditorSaved = useCallback(() => {
    setShowEditor(false)
    setEditTemplateId(null)
    setEditHtml(null)
    fetchTemplates()
  }, [fetchTemplates])

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false)
    setEditTemplateId(null)
    setEditHtml(null)
  }, [])

  return (
    <div className="template-manager">
      <div className="template-manager-actions">
        <button
          type="button"
          className="notes-add-btn template-manager-btn-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? t('upload.uploading') : t('templates.uploadFile')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          className="template-manager-file-input"
          onChange={handleUploadFile}
        />
        <button
          type="button"
          className="notes-add-btn template-manager-btn-create"
          onClick={() => setShowEditor(true)}
        >
          {t('templates.createInEditor')}
        </button>
      </div>

      {loading && <div className="template-manager-loading">{t('notes.templateLoading')}</div>}
      {error && <div className="template-manager-error">{t('notes.templateLoadError')}</div>}
      {!loading && !error && templates.length === 0 && (
        <div className="template-manager-empty">{t('notes.templateEmpty')}</div>
      )}
      {!loading && templates.length > 0 && (
        <ul className="template-manager-list">
          {templates.map((tmpl) => (
            <li key={tmpl.id} className="template-manager-item">
              <span className="template-manager-item-name">{tmpl.name}</span>
              <span className="template-manager-item-actions">
                <button
                  type="button"
                  className="macro-export-btn template-manager-btn-preview"
                  onClick={() => handlePreview(tmpl)}
                  title={t('templates.preview')}
                >
                  <span className="template-manager-icon-white">👁</span>
                </button>
                <button
                  type="button"
                  className="clear-btn template-manager-btn-delete"
                  onClick={() => handleDelete(tmpl)}
                  title={t('templates.delete')}
                >
                  <span className="template-manager-icon-white">🗑</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {previewId &&
        createPortal(
          <div
            className="note-template-modal template-manager-preview-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="note-template-modal-content template-manager-preview-content">
              <h3>{previewName}</h3>
              <div className="template-manager-preview-body" ref={previewContainerRef}>
                {previewHtml && (() => {
                  const body = extractBodyContent(previewHtml)
                  return <div dangerouslySetInnerHTML={{ __html: body }} className="note-template-renderer" />
                })()}
              </div>
              <div className="note-template-modal-footer">
                <button type="button" onClick={closePreview} className="note-template-cancel">
                  {t('notes.templateCancel')}
                </button>
                <button
                  type="button"
                  className="notes-add-btn template-manager-btn-edit"
                  onClick={handleEditTemplate}
                >
                  {t('templates.editTemplate')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showCustomWarning &&
        createPortal(
          <div
            className="note-template-modal template-manager-custom-warning-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="note-template-modal-content template-manager-custom-warning-content">
              <h3>{t('templates.templateCustomWarningTitle')}</h3>
              <p>{t('templates.templateCustomWarningMessage')}</p>
              <div className="note-template-modal-footer">
                <button type="button" onClick={handleCustomOpenReadOnly} className="note-template-cancel">
                  {t('templates.templateOpenReadOnly')}
                </button>
                <button
                  type="button"
                  className="notes-add-btn"
                  onClick={handleDuplicateAndEdit}
                  disabled={cloning}
                >
                  {cloning ? '...' : t('templates.templateDuplicateAndEdit')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showEditor &&
        createPortal(
          <TemplateEditor
            onSave={handleEditorSaved}
            onCancel={handleEditorCancel}
            initialTemplateId={editTemplateId || undefined}
            initialHtml={editHtml || undefined}
          />,
          document.body
        )}
    </div>
  )
}

export default TemplateManager
