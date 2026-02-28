import React, { createContext, useContext, useState, useRef, useCallback } from 'react'

const NotesTemplateContext = createContext(null)

export function useNotesTemplate() {
  const ctx = useContext(NotesTemplateContext)
  return ctx
}

export function NotesTemplateProvider({ children }) {
  const [sources, setSources] = useState([])
  const gettersRef = useRef({})

  const registerNoteTemplate = useCallback((noteId, { noteIndex, title, fieldNames, fieldLabels, getFieldValue }) => {
    gettersRef.current[noteId] = getFieldValue
    setSources(prev => {
      const rest = prev.filter(s => s.noteId !== noteId)
      return [...rest, { noteId, noteIndex, title, fieldNames, fieldLabels: fieldLabels || {} }].sort((a, b) => a.noteIndex - b.noteIndex)
    })
  }, [])

  const unregisterNoteTemplate = useCallback((noteId) => {
    delete gettersRef.current[noteId]
    setSources(prev => prev.filter(s => s.noteId !== noteId))
  }, [])

  const getFieldValue = useCallback((noteId, fieldName) => {
    const getter = gettersRef.current[noteId]
    if (!getter) return ''
    return getter(fieldName) ?? ''
  }, [])

  const value = {
    sources,
    getFieldValue,
    registerNoteTemplate,
    unregisterNoteTemplate
  }

  return (
    <NotesTemplateContext.Provider value={value}>
      {children}
    </NotesTemplateContext.Provider>
  )
}
