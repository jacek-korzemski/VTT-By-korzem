import React, { useRef, useEffect, useCallback, useState } from 'react'
import { isRevealed, applyCircleBrush, GRID_SIZE } from '../../utils/fogBitmap'
import { CELL_SIZE } from '../../../config'

function FogOfWar({ 
  bitmap, 
  enabled,
  gmOpacity,
  isEditing,
  brushSize,
  revealMode,
  onBitmapChange,
  zoomLevel
}) {
  const canvasRef = useRef(null)
  const [isPainting, setIsPainting] = useState(false)
  const lastCellRef = useRef(null)

  useEffect(() => {
    if (!enabled || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const size = GRID_SIZE * CELL_SIZE
    
    ctx.clearRect(0, 0, size, size)
    
    const opacity = gmOpacity ? 0.5 : 1
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`
    
    for (let y = 0; y < GRID_SIZE; y++) {
      let startX = null
      
      for (let x = 0; x <= GRID_SIZE; x++) {
        const revealed = x < GRID_SIZE && isRevealed(bitmap, x, y)
        
        if (!revealed && startX === null) {
          startX = x
        } else if ((revealed || x === GRID_SIZE) && startX !== null) {
          ctx.fillRect(
            startX * CELL_SIZE, 
            y * CELL_SIZE, 
            (x - startX) * CELL_SIZE, 
            CELL_SIZE
          )
          startX = null
        }
      }
    }
  }, [bitmap, enabled, gmOpacity])

  const getCellFromEvent = useCallback((e) => {
    if (!canvasRef.current) return null
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    const x = Math.floor((e.clientX - rect.left) / zoomLevel / CELL_SIZE)
    const y = Math.floor((e.clientY - rect.top) / zoomLevel / CELL_SIZE)
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null
    return { x, y }
  }, [zoomLevel])

  const paint = useCallback((e) => {
    if (!isEditing || !onBitmapChange) return
    
    const cell = getCellFromEvent(e)
    if (!cell) return
    
    if (lastCellRef.current?.x === cell.x && lastCellRef.current?.y === cell.y) {
      return
    }
    lastCellRef.current = cell
    
    const newBitmap = applyCircleBrush(bitmap, cell.x, cell.y, brushSize - 1, revealMode)
    onBitmapChange(newBitmap)
  }, [bitmap, isEditing, brushSize, revealMode, onBitmapChange, getCellFromEvent])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || !isEditing) return
    e.preventDefault()
    e.stopPropagation()
    setIsPainting(true)
    lastCellRef.current = null
    paint(e)
  }, [isEditing, paint])

  const handleMouseMove = useCallback((e) => {
    if (!isPainting) return
    paint(e)
  }, [isPainting, paint])

  const handleMouseUp = useCallback(() => {
    setIsPainting(false)
    lastCellRef.current = null
  }, [])

  useEffect(() => {
    if (isPainting) {
      window.addEventListener('mouseup', handleMouseUp)
      return () => window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPainting, handleMouseUp])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={GRID_SIZE * CELL_SIZE}
      height={GRID_SIZE * CELL_SIZE}
      className={`fog-canvas ${isEditing ? 'editing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}

export default FogOfWar
