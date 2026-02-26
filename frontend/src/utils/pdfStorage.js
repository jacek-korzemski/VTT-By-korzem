const DB_NAME = 'vtt_pdf_storage'
const STORE_NAME = 'pdfs'
const DB_VERSION = 1
const META_KEY = 'vtt_local_pdfs'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function getLocalPdfMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalPdfMeta(list) {
  localStorage.setItem(META_KEY, JSON.stringify(list))
}

export async function saveLocalPdf(file) {
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const arrayBuffer = await file.arrayBuffer()

  const db = await openDB()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(arrayBuffer, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  const meta = {
    id,
    name: file.name,
    size: file.size,
    dateAdded: Date.now(),
  }

  const list = getLocalPdfMeta()
  list.push(meta)
  saveLocalPdfMeta(list)

  return meta
}

export async function loadLocalPdfBlob(id) {
  try {
    const db = await openDB()
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    if (!result) return null
    return new Blob([result], { type: 'application/pdf' })
  } catch {
    return null
  }
}

export async function deleteLocalPdf(id) {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }

  const list = getLocalPdfMeta().filter(p => p.id !== id)
  saveLocalPdfMeta(list)
}
