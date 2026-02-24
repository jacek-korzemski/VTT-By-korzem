import React, { useCallback } from 'react'

function MapElement({ element, cellSize, basePath, isEraserActive, onEraserClick }) {
  const centerX = element.x * cellSize + cellSize / 2
  const centerY = element.y * cellSize + cellSize / 2

  
  const handleClick = useCallback((e) => {
    if (isEraserActive) {
      e.preventDefault()
      e.stopPropagation()
      onEraserClick(element.id)
    }
  }, [isEraserActive, onEraserClick, element.id])

  return (
    <div
      className={`map-element ${isEraserActive ? 'erasable' : ''}`}
      style={{
        left: centerX,
        top: centerY
      }}
      onClick={handleClick}
    >
      <img
        src={`${basePath}${element.src}`}
        alt=""
        draggable={false}
      />
    </div>
  )
}

export default MapElement
