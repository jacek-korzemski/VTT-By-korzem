import React, { useCallback, useState, useRef, useEffect } from 'react'

function Token({ token, cellSize, isDragging, dragPosition, onDragStart, basePath, onTokenUpdate }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editSize, setEditSize] = useState(token.size ?? 1)
  const [editUpperLabel, setEditUpperLabel] = useState(token.upperLabel ?? '')
  const [editLowerLabel, setEditLowerLabel] = useState(token.lowerLabel ?? '')
  
  const dragStartPosRef = useRef(null)
  const dragStartTimeRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const isLongPressRef = useRef(false)
  const hasMovedRef = useRef(false)

  useEffect(() => {
    setEditSize(token.size ?? 1)
    setEditUpperLabel(token.upperLabel ?? '')
    setEditLowerLabel(token.lowerLabel ?? '')
  }, [token.id, token.size, token.upperLabel, token.lowerLabel])

  const handleMouseEnter = useCallback(() => {
    if (!isDragging && !isEditMode) {
      setIsHovered(true)
    }
  }, [isDragging, isEditMode])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const handleGearClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditMode(true)
    setIsHovered(false)
  }, [])

  const handleSave = useCallback(() => {
    if (onTokenUpdate) {
      onTokenUpdate(token.id, {
        size: editSize,
        upperLabel: editUpperLabel || null,
        lowerLabel: editLowerLabel || null
      })
    }
    setIsEditMode(false)
  }, [token.id, editSize, editUpperLabel, editLowerLabel, onTokenUpdate])

  const handleCancel = useCallback(() => {
    setEditSize(token.size ?? 1)
    setEditUpperLabel(token.upperLabel ?? '')
    setEditLowerLabel(token.lowerLabel ?? '')
    setIsEditMode(false)
  }, [token.size, token.upperLabel, token.lowerLabel])

  const handleIncreaseSize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setEditSize(prev => Math.min(prev * 1.2, 3))
  }, [])

  const handleDecreaseSize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setEditSize(prev => Math.max(prev * 0.8, 0.2))
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    if (isEditMode) return
    
    if (e.target.closest('.token-gear, .token-edit-controls, .token-size-controls, .token-labels, .token-save-controls')) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    dragStartTimeRef.current = Date.now()
    hasMovedRef.current = false
    
    const handleMouseMove = (moveEvent) => {
      if (dragStartPosRef.current) {
        const dx = Math.abs(moveEvent.clientX - dragStartPosRef.current.x)
        const dy = Math.abs(moveEvent.clientY - dragStartPosRef.current.y)
        if (dx > 3 || dy > 3) {
          hasMovedRef.current = true
          onDragStart(token, e)
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [token, onDragStart, isEditMode])

  const handleTouchStart = useCallback((e) => {
    if (isEditMode) return
    
    if (e.target.closest('.token-gear, .token-edit-controls, .token-size-controls, .token-labels, .token-save-controls')) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    
    dragStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    dragStartTimeRef.current = Date.now()
    hasMovedRef.current = false
    isLongPressRef.current = false
    
    longPressTimerRef.current = setTimeout(() => {
      if (!hasMovedRef.current) {
        isLongPressRef.current = true
        setIsEditMode(true)
        setIsHovered(false)
      }
    }, 500)
    
    const handleTouchMove = (moveEvent) => {
      if (dragStartPosRef.current && moveEvent.touches[0]) {
        const dx = Math.abs(moveEvent.touches[0].clientX - dragStartPosRef.current.x)
        const dy = Math.abs(moveEvent.touches[0].clientY - dragStartPosRef.current.y)
        if (dx > 10 || dy > 10) {
          hasMovedRef.current = true
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }
          if (!isLongPressRef.current) {
            onDragStart(token, e)
          }
        }
      }
    }
    
    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }, [token, onDragStart, isEditMode])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  const posX = isDragging && dragPosition 
    ? dragPosition.x 
    : token.x * cellSize + cellSize / 2
    
  const posY = isDragging && dragPosition 
    ? dragPosition.y 
    : token.y * cellSize + cellSize / 2

  const tokenSize = (token.size ?? 1) * 64
  const displaySize = isEditMode ? editSize * 64 : tokenSize

  return (
    <div
      className={`token ${isDragging ? 'dragging' : ''} ${isEditMode ? 'edit-mode' : ''}`}
      style={{
        left: posX,
        top: posY
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {(isEditMode || token.upperLabel) && (
        <div className="token-label token-label-upper">
          {isEditMode ? (
            <input
              type="text"
              className="token-label-input"
              value={editUpperLabel}
              onChange={(e) => setEditUpperLabel(e.target.value)}
              placeholder="Label górny"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span>{token.upperLabel}</span>
          )}
        </div>
      )}

      {isHovered && !isEditMode && !isDragging && (
        <button
          className="token-gear"
          onClick={handleGearClick}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onTouchStart={(e) => e.stopPropagation()}
          title="Edytuj token"
        >
          ⚙️
        </button>
      )}

      <div className="token-content">
        {isEditMode && (
          <div className="token-edit-controls">
            <div className="token-size-controls">
              <button
                className="token-size-btn token-size-decrease"
                onClick={handleDecreaseSize}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                title="Zmniejsz o 20%"
              >
                −
              </button>
              <button
                className="token-size-btn token-size-increase"
                onClick={handleIncreaseSize}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                title="Zwiększ o 20%"
              >
                +
              </button>
            </div>

            <div className="token-save-controls">
              <button
                className="token-save-btn token-save-confirm"
                onClick={handleSave}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                title="Zapisz zmiany"
              >
                ✓
              </button>
              <button
                className="token-save-btn token-save-cancel"
                onClick={handleCancel}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                title="Anuluj"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <img
          src={`${basePath}${token.src}`}
          alt=""
          draggable={false}
          style={{
            width: `${displaySize}px`,
            height: `${displaySize}px`
          }}
        />
      </div>

      {(isEditMode || token.lowerLabel) && (
        <div className="token-label token-label-lower">
          {isEditMode ? (
            <input
              type="text"
              className="token-label-input"
              value={editLowerLabel}
              onChange={(e) => setEditLowerLabel(e.target.value)}
              placeholder="Label dolny"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{token.lowerLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default Token
