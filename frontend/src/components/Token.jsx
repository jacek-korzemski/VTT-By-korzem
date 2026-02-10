import React, { useCallback } from 'react'

function Token({ token, cellSize, isDragging, dragPosition, onDragStart, basePath }) {
  
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    onDragStart(token, e)
  }, [token, onDragStart])

  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    onDragStart(token, e)
  }, [token, onDragStart])

  const posX = isDragging && dragPosition 
    ? dragPosition.x 
    : token.x * cellSize + cellSize / 2
    
  const posY = isDragging && dragPosition 
    ? dragPosition.y 
    : token.y * cellSize + cellSize / 2

  return (
    <div
      className={`token ${isDragging ? 'dragging' : ''}`}
      style={{
        left: posX,
        top: posY
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <img
        src={`${basePath}${token.src}`}
        alt=""
        draggable={false}
      />
    </div>
  )
}

export default Token