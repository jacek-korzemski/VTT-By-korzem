import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import { createPortal } from 'react-dom'

// Fantasy/RPG Emoji pogrupowane tematycznie
const EMOJI_GROUPS = [
  {
    name: '⚔️',
    title: 'Weapons & Armor',
    emojis: ['⚔️', '🗡️', '🏹', '🛡️', '🪓', '🔱', '💣', '🧨']
  },
  {
    name: '🔮',
    title: 'Magic & Items',
    emojis: ['🔮', '🪄', '✨', '⚗️', '🧪', '📜', '📖', '🗝️', '🔑', '🕯️', '🪔', '💎', '💍', '📿', '⚱️']
  },
  {
    name: '🧙',
    title: 'Characters',
    emojis: ['🧙', '🧙‍♂️', '🧙‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧛', '🧟', '👻', '💀', '☠️', '👹', '👺', '🤴', '👸', '👑']
  },
  {
    name: '🐉',
    title: 'Creatures',
    emojis: ['🐉', '🐲', '🦇', '🕷️', '🦂', '🐺', '🦅', '🦉', '🐍', '🐗', '🦌', '🐻', '🦁', '🐊', '🦈']
  },
  {
    name: '🏰',
    title: 'Places',
    emojis: ['🏰', '🏛️', '⛪', '🗻', '🌋', '🏔️', '🌲', '🌳', '🏕️', '⛺', '🪨', '🌙', '⭐', '🌟', '☀️']
  },
  {
    name: '🔥',
    title: 'Elements',
    emojis: ['🔥', '❄️', '⚡', '💧', '🌊', '💨', '🌪️', '☁️', '🌈', '☄️', '💥', '💫']
  },
  {
    name: '💰',
    title: 'Treasure',
    emojis: ['💰', '💎', '🏆', '🎁', '📦', '🗃️', '⚜️', '🔶', '🔷', '💵', '🪙']
  },
  {
    name: '❤️',
    title: 'Status',
    emojis: ['❤️', '💔', '🖤', '💜', '💙', '💚', '💛', '🧡', '❤️‍🔥', '✅', '❌', '⚠️', '💤', '💢', '💯', '🎲']
  }
]

const SimpleWYSIWYG = forwardRef(function SimpleWYSIWYG(props, ref) {
  const {
    height = '100%',
    placeholder = 'Start typing...',
    initialContent = '',
    onChange,
    className = ''
  } = props

  const editorRef = useRef(null)
  const savedSelectionRef = useRef(null)
  const emojiContainerRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const emojiPanelRef = useRef(null)
  const emojiOpenedWithCursorInEditorRef = useRef(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [emojiPanelPosition, setEmojiPanelPosition] = useState(null)
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(0)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    underline: false
  })

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent
    }
  }, [])

  const handleChange = useCallback(() => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const updateToolbarState = useCallback(() => {
    setToolbarState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    })
  }, [])

  const executeCommand = useCallback((command, value) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value || '')
    handleChange()
    updateToolbarState()
  }, [handleChange, updateToolbarState])

  const saveSelection = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editor) {
      savedSelectionRef.current = null
      return
    }
    try {
      const range = selection.getRangeAt(0)
      const node = range.commonAncestorContainer
      if (node && (editor === node || editor.contains(node))) {
        savedSelectionRef.current = range.cloneRange()
      } else {
        savedSelectionRef.current = null
      }
    } catch {
      savedSelectionRef.current = null
    }
  }, [])

  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(savedSelectionRef.current)
    }
  }, [])

  // Wstaw emoji – w pozycji kursora (jeśli był w edytorze przy otwarciu panelu), inaczej na końcu
  const insertEmoji = useCallback((emoji) => {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()

    if (!emojiOpenedWithCursorInEditorRef.current) {
      editor.innerHTML += emoji
      handleChange()
      editor.focus()
      return
    }

    restoreSelection()
    const selection = window.getSelection()
    let range = null
    let selectionInOurEditor = false
    try {
      if (selection?.rangeCount) {
        range = selection.getRangeAt(0)
        const node = range.commonAncestorContainer
        selectionInOurEditor = node && (editor === node || editor.contains(node))
      }
    } catch {
      selectionInOurEditor = false
    }

    if (selectionInOurEditor) {
      range.deleteContents()
      const textNode = document.createTextNode(emoji)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      editor.innerHTML += emoji
    }

    handleChange()
    editor.focus()
  }, [restoreSelection, handleChange])

  const insertTable = useCallback(() => {
    restoreSelection()
    
    const table = document.createElement('table')
    table.className = 'swysiwyg-table'
    
    for (let i = 0; i < tableRows; i++) {
      const tr = document.createElement('tr')
      for (let j = 0; j < tableCols; j++) {
        const td = document.createElement('td')
        td.innerHTML = '&nbsp;'
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(table)
      range.setStartAfter(table)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    setShowTableModal(false)
    handleChange()
  }, [tableRows, tableCols, restoreSelection, handleChange])

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          executeCommand('bold')
          break
        case 'i':
          e.preventDefault()
          executeCommand('italic')
          break
        case 'u':
          e.preventDefault()
          executeCommand('underline')
          break
      }
    }
  }, [executeCommand])

  // Pozycjonowanie panelu emoji tuż przy przycisku; pomiar po layoutcie (rAF)
  useEffect(() => {
    if (!showEmojiPanel) {
      setEmojiPanelPosition(null)
      return
    }
    const anchor = emojiButtonRef.current || emojiContainerRef.current
    if (!anchor) return

    const run = () => {
      const rect = anchor.getBoundingClientRect()
      const MARGIN = 8
      const PANEL_MAX_WIDTH = 280
      const PANEL_MAX_HEIGHT = 280

      const spaceBelow = window.innerHeight - rect.bottom - MARGIN
      const spaceAbove = rect.top - MARGIN
      const openUp = spaceBelow < 120 && spaceAbove >= spaceBelow

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
      if (left + PANEL_MAX_WIDTH > window.innerWidth - MARGIN) {
        left = window.innerWidth - PANEL_MAX_WIDTH - MARGIN
      }
      if (left < MARGIN) left = MARGIN

      setEmojiPanelPosition({ top, bottom, left, maxHeight })
    }

    const id = requestAnimationFrame(() => run())
    return () => cancelAnimationFrame(id)
  }, [showEmojiPanel])

  // Zamknij emoji panel gdy klikniemy poza (kontener lub panel w portalu)
  useEffect(() => {
    if (!showEmojiPanel) return

    const handleClickOutside = (e) => {
      if (!e.target.closest('.swysiwyg-emoji-container') && !e.target.closest('.swysiwyg-emoji-panel')) {
        setShowEmojiPanel(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPanel])

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.innerHTML || '',
    setContent: (html) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html
        handleChange()
      }
    },
    getPlainText: () => editorRef.current?.innerText || '',
    clear: () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = ''
        handleChange()
      }
    },
    focus: () => editorRef.current?.focus()
  }), [handleChange])

  return (
    <div className={`swysiwyg-wrapper ${className}`}>
      {/* Toolbar */}
      <div className="swysiwyg-toolbar">
        <div className="swysiwyg-toolbar-group">
          <button
            type="button"
            className={toolbarState.bold ? 'active' : ''}
            onClick={() => executeCommand('bold')}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={toolbarState.italic ? 'active' : ''}
            onClick={() => executeCommand('italic')}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={toolbarState.underline ? 'active' : ''}
            onClick={() => executeCommand('underline')}
            title="Underline (Ctrl+U)"
          >
            <u>U</u>
          </button>
        </div>

        <div className="swysiwyg-toolbar-group">
          <select
            onChange={(e) => {
              if (e.target.value) {
                executeCommand('fontSize', e.target.value)
                e.target.value = ''
              }
            }}
            title="Font size"
          >
            <option value="">Size</option>
            <option value="1">XS</option>
            <option value="2">S</option>
            <option value="3">M</option>
            <option value="4">L</option>
            <option value="5">XL</option>
            <option value="6">XXL</option>
          </select>
        </div>

        <div className="swysiwyg-toolbar-group">
          <label className="swysiwyg-color-picker" title="Text color">
            <span className="swysiwyg-color-icon">A</span>
            <input
              type="color"
              defaultValue="#ffffff"
              onInput={(e) => executeCommand('foreColor', e.target.value)}
            />
          </label>
        </div>

        <div className="swysiwyg-toolbar-group">
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            title="Bullet list"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            title="Numbered list"
          >
            1.
          </button>
        </div>

        <div className="swysiwyg-toolbar-group">
          <button
            type="button"
            onClick={() => {
              saveSelection()
              setShowTableModal(true)
            }}
            title="Insert table"
          >
            ▦
          </button>
        </div>

        {/* Emoji button – zapis selekcji tylko gdy kursor już w edytorze, potem fokus i panel */}
        <div ref={emojiContainerRef} className="swysiwyg-toolbar-group swysiwyg-emoji-container">
          <button
            ref={emojiButtonRef}
            type="button"
            className={showEmojiPanel ? 'active' : ''}
            onClick={() => {
              saveSelection()
              emojiOpenedWithCursorInEditorRef.current = savedSelectionRef.current != null
              editorRef.current?.focus()
              setShowEmojiPanel(prev => !prev)
            }}
            title="Insert emoji"
          >
            😀
          </button>
        </div>
      </div>

      {/* Emoji Panel – w portalu, zawsze na wierzchu i w granicach viewportu */}
      {showEmojiPanel && emojiPanelPosition &&
        createPortal(
          <div
            ref={emojiPanelRef}
            className="swysiwyg-emoji-panel swysiwyg-emoji-panel-portal"
            style={{
              position: 'fixed',
              ...(emojiPanelPosition.top !== undefined && { top: emojiPanelPosition.top }),
              ...(emojiPanelPosition.bottom !== undefined && { bottom: emojiPanelPosition.bottom }),
              left: emojiPanelPosition.left,
              maxHeight: emojiPanelPosition.maxHeight ?? 260,
              zIndex: 999999
            }}
          >
            <div className="swysiwyg-emoji-tabs">
              {EMOJI_GROUPS.map((group, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={activeEmojiGroup === idx ? 'active' : ''}
                  onClick={() => setActiveEmojiGroup(idx)}
                  title={group.title}
                >
                  {group.name}
                </button>
              ))}
            </div>
            <div className="swysiwyg-emoji-grid">
              {EMOJI_GROUPS[activeEmojiGroup].emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

      {/* Editor */}
      <div className="swysiwyg-editor-container" style={{ height }}>
        <div
          ref={editorRef}
          className="swysiwyg-editor"
          contentEditable
          suppressContentEditableWarning={true}
          data-placeholder={placeholder}
          onInput={handleChange}
          onBlur={handleChange}
          onKeyDown={handleKeyDown}
          onMouseUp={updateToolbarState}
          onKeyUp={updateToolbarState}
        />
      </div>

      {/* Table Modal */}
      {showTableModal && (
        <div 
          className="swysiwyg-modal active"
          onClick={(e) => e.target === e.currentTarget && setShowTableModal(false)}
        >
          <div className="swysiwyg-modal-content">
            <h3>Insert Table</h3>
            <div className="swysiwyg-modal-form">
              <label>
                Rows:
                <input
                  type="number"
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                  min={1}
                  max={20}
                />
              </label>
              <label>
                Columns:
                <input
                  type="number"
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                  min={1}
                  max={10}
                />
              </label>
            </div>
            <div className="swysiwyg-modal-buttons">
              <button
                type="button"
                className="swysiwyg-btn-cancel"
                onClick={() => setShowTableModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="swysiwyg-btn-insert"
                onClick={insertTable}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default SimpleWYSIWYG