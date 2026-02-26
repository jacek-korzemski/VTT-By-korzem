import React, { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE, BASE_PATH } from '../../../config'
import { t } from '../../lang'
import {
  getLocalPdfMeta,
  saveLocalPdf,
  loadLocalPdfBlob,
  deleteLocalPdf,
} from '../../utils/pdfStorage'

function PdfPanel() {
  const [serverPdfs, setServerPdfs] = useState([])
  const [localPdfs, setLocalPdfs] = useState([])
  const [activePdf, setActivePdf] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [missingIds, setMissingIds] = useState(new Set())
  const blobUrlRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}?action=list-papers`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setServerPdfs(data.papers || [])
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLocalPdfs(getLocalPdfMeta())
  }, [])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const openServerPdf = useCallback((pdf) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setActivePdf({ type: 'server', id: pdf.id, name: pdf.name })
    setPdfUrl(`${BASE_PATH}${pdf.src}`)
  }, [])

  const openLocalPdf = useCallback(async (meta) => {
    if (missingIds.has(meta.id)) return

    setLoading(true)
    setActivePdf({ type: 'local', id: meta.id, name: meta.name })

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    const blob = await loadLocalPdfBlob(meta.id)
    if (blob) {
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setPdfUrl(url)
    } else {
      setMissingIds(prev => new Set([...prev, meta.id]))
      setPdfUrl(null)
    }
    setLoading(false)
  }, [missingIds])

  const handleAddLocal = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'

    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      setLoading(true)
      try {
        const meta = await saveLocalPdf(file)
        setLocalPdfs(getLocalPdfMeta())

        const blob = await loadLocalPdfBlob(meta.id)
        if (blob) {
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setActivePdf({ type: 'local', id: meta.id, name: meta.name })
          setPdfUrl(url)
        }
      } catch (err) {
        console.error('Failed to save PDF:', err)
      }
      setLoading(false)
    }
    input.click()
  }, [])

  const handleRemoveLocal = useCallback(async (e, meta) => {
    e.stopPropagation()
    if (!confirm(t('pdf.removeConfirm'))) return

    await deleteLocalPdf(meta.id)
    setLocalPdfs(getLocalPdfMeta())
    setMissingIds(prev => {
      const next = new Set(prev)
      next.delete(meta.id)
      return next
    })

    if (activePdf?.id === meta.id) {
      setActivePdf(null)
      setPdfUrl(null)
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [activePdf])

  const hasPdfs = serverPdfs.length > 0 || localPdfs.length > 0

  return (
    <div className="pdf-panel">
      <div className="pdf-sidebar">
        {serverPdfs.length > 0 && (
          <div className="pdf-section">
            <div className="pdf-section-title">{t('pdf.serverPdfs')}</div>
            {serverPdfs.map(pdf => (
              <button
                key={pdf.id}
                className={`pdf-item ${activePdf?.id === pdf.id ? 'active' : ''}`}
                onClick={() => openServerPdf(pdf)}
                title={pdf.name}
              >
                <span className="pdf-item-icon">📄</span>
                <span className="pdf-item-name">{pdf.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="pdf-section">
          <div className="pdf-section-title">{t('pdf.localPdfs')}</div>
          {localPdfs.map(meta => {
            const isMissing = missingIds.has(meta.id)
            return (
              <button
                key={meta.id}
                className={`pdf-item ${activePdf?.id === meta.id ? 'active' : ''} ${isMissing ? 'missing' : ''}`}
                onClick={() => openLocalPdf(meta)}
                title={isMissing ? `${t('pdf.removed')}: ${meta.name}` : meta.name}
                disabled={isMissing}
              >
                <span className="pdf-item-icon">{isMissing ? '⚠️' : '📄'}</span>
                <span className="pdf-item-name">
                  {isMissing ? <em>{t('pdf.removed')}: {meta.name}</em> : meta.name}
                </span>
                <span
                  className="pdf-item-remove"
                  onClick={(e) => handleRemoveLocal(e, meta)}
                  title={t('pdf.remove')}
                >
                  ✕
                </span>
              </button>
            )
          })}
          <button className="pdf-add-btn" onClick={handleAddLocal}>
            + {t('pdf.addLocal')}
          </button>
        </div>
      </div>

      <div className="pdf-viewer">
        {loading && <div className="pdf-placeholder">{t('pdf.loading')}</div>}
        {!loading && !pdfUrl && (
          <div className="pdf-placeholder">
            {hasPdfs ? t('pdf.selectPdf') : t('pdf.noPdfs')}
          </div>
        )}
        {!loading && pdfUrl && (
          <iframe src={pdfUrl} title={activePdf?.name || 'PDF'} />
        )}
      </div>
    </div>
  )
}

export default PdfPanel
