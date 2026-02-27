import React, { useState, useEffect, useCallback, useRef, Component } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { API_BASE, BASE_PATH } from '../../../config'
import { t } from '../../lang'
import {
  getLocalPdfMeta,
  saveLocalPdf,
  loadLocalPdfBlob,
  deleteLocalPdf,
} from '../../utils/pdfStorage'

try {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
} catch {
  pdfjs.GlobalWorkerOptions.workerSrc = ''
}

class PdfErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('PDF render crash:', error, info?.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="pdf-placeholder" style={{ flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: '#e94560' }}>
            PDF render error: {this.state.error?.message || 'Unknown'}
          </div>
          <button
            onClick={this.reset}
            style={{
              padding: '0.4rem 1rem',
              background: 'rgba(74,222,128,0.15)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '4px',
              color: '#4ade80',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PdfPanel() {
  const [serverPdfs, setServerPdfs] = useState([])
  const [localPdfs, setLocalPdfs] = useState([])
  const [activePdf, setActivePdf] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [missingIds, setMissingIds] = useState(new Set())
  const [numPages, setNumPages] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const blobUrlRef = useRef(null)
  const serverCacheRef = useRef(new Map())
  const viewerRef = useRef(null)
  const [viewerWidth, setViewerWidth] = useState(null)

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
      serverCacheRef.current.forEach(url => URL.revokeObjectURL(url))
      serverCacheRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const el = viewerRef.current
    if (!el) return

    const updateWidth = () => setViewerWidth(el.clientWidth)
    updateWidth()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateWidth())
      observer.observe(el)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n)
  }, [])

  const openServerPdf = useCallback(async (pdf) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setNumPages(null)
    setActivePdf({ type: 'server', id: pdf.id, name: pdf.name })
    setSidebarOpen(false)

    const cached = serverCacheRef.current.get(pdf.id)
    if (cached) {
      setPdfUrl(cached)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}?action=get-paper&id=${encodeURIComponent(pdf.id)}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      serverCacheRef.current.set(pdf.id, url)
      setPdfUrl(url)
    } catch (err) {
      console.error('Failed to load server PDF:', err)
      setPdfUrl(null)
    }
    setLoading(false)
  }, [])

  const openLocalPdf = useCallback(async (meta) => {
    if (missingIds.has(meta.id)) return

    setLoading(true)
    setNumPages(null)
    setActivePdf({ type: 'local', id: meta.id, name: meta.name })
    setSidebarOpen(false)

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
      setNumPages(null)
      try {
        const meta = await saveLocalPdf(file)
        setLocalPdfs(getLocalPdfMeta())

        const blob = await loadLocalPdfBlob(meta.id)
        if (blob) {
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setActivePdf({ type: 'local', id: meta.id, name: meta.name })
          setSidebarOpen(false)
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
      setNumPages(null)
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [activePdf])

  const errorBoundaryRef = useRef(null)

  useEffect(() => {
    errorBoundaryRef.current?.reset()
  }, [pdfUrl])

  const hasPdfs = serverPdfs.length > 0 || localPdfs.length > 0
  const MAX_CANVAS_WIDTH = 1024
  const pageWidth = viewerWidth
    ? Math.min(viewerWidth - 20, MAX_CANVAS_WIDTH)
    : undefined

  return (
    <div className="pdf-panel">
      <div className={`pdf-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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

      <button
        className={`pdf-sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(prev => !prev)}
        title={sidebarOpen ? t('pdf.collapseSidebar') : t('pdf.expandSidebar')}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      <div className="pdf-viewer" ref={viewerRef}>
        {loading && <div className="pdf-placeholder">{t('pdf.loading')}</div>}
        {!loading && !pdfUrl && (
          <div className="pdf-placeholder">
            {hasPdfs ? t('pdf.selectPdf') : t('pdf.noPdfs')}
          </div>
        )}
        {!loading && pdfUrl && (
          <PdfErrorBoundary ref={errorBoundaryRef}>
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="pdf-placeholder">{t('pdf.loading')}</div>}
            >
              {numPages && Array.from({ length: numPages }, (_, i) => (
                <LazyPage
                  key={i + 1}
                  pageNumber={i + 1}
                  width={pageWidth}
                  scrollRoot={viewerRef}
                />
              ))}
            </Document>
          </PdfErrorBoundary>
        )}
      </div>
    </div>
  )
}

function LazyPage({ pageNumber, width, scrollRoot }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { root: scrollRoot?.current, rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRoot])

  const placeholderHeight = width ? Math.round(width * 1.414) : 800

  return (
    <div ref={ref} style={{ minHeight: visible ? undefined : placeholderHeight }}>
      {visible && (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      )}
    </div>
  )
}

export default PdfPanel
