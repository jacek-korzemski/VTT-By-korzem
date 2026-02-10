import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import Token from './Token'
import MapElement from './MapElement'
import FogOfWar from './FogOfWar'
import { GRID_SIZE, CELL_SIZE } from '../../config'

const Grid = forwardRef(function Grid(props, ref) {
  // Destrukturyzacja props
  const {
    background,
    mapElements,
    tokens,
    selectedAsset,
    selectedType,
    isEraserActive,
    fogBitmap,
    fogEnabled,
    fogEditMode,
    fogRevealMode,
    fogBrushSize,
    fogGmOpacity,
    onFogBitmapChange,
    onCellClick,
    onTokenMove,
    onRemoveMapElement,
    onRemoveToken,
    basePath,
    zoomLevel,
    pingMode,
    pingAnimation,
    onSendPing
  } = props

  const gridRef = useRef(null)
  const [draggedToken, setDraggedToken] = useState(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 })

  // Expose gridRef via forwarded ref
  useImperativeHandle(ref, () => gridRef.current, [])

  const getClientCoords = useCallback((e) => {
    if (e.touches?.[0]) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
    }
    return { clientX: e.clientX, clientY: e.clientY }
  }, [])

  const getClientCoordsFromChange = useCallback((e) => {
    if (e.changedTouches?.[0]) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY }
    }
    return { clientX: e.clientX, clientY: e.clientY }
  }, [])

  const getCellFromMousePosition = useCallback((clientX, clientY) => {
    if (!gridRef.current) return null
    
    const rect = gridRef.current.getBoundingClientRect()
    const scrollLeft = gridRef.current.scrollLeft
    const scrollTop = gridRef.current.scrollTop
    
    const x = Math.floor(((clientX - rect.left) / zoomLevel + scrollLeft / zoomLevel) / CELL_SIZE)
    const y = Math.floor(((clientY - rect.top) / zoomLevel + scrollTop / zoomLevel) / CELL_SIZE)
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null
    
    return { x, y }
  }, [zoomLevel])

  const getPixelPosition = useCallback((clientX, clientY) => {
    if (!gridRef.current) return null
    
    const rect = gridRef.current.getBoundingClientRect()
    const scrollLeft = gridRef.current.scrollLeft
    const scrollTop = gridRef.current.scrollTop
    
    return {
      x: (clientX - rect.left) / zoomLevel + scrollLeft / zoomLevel,
      y: (clientY - rect.top) / zoomLevel + scrollTop / zoomLevel
    }
  }, [zoomLevel])

  const canStartPanning = useCallback((e) => {
    if (e.target.closest('.token')) return false
    if (e.target.closest('.map-element.erasable')) return false
    if (e.target.closest('.fog-canvas.editing')) return false
    if (selectedAsset) return false
    if (isEraserActive) return false
    if (fogEditMode) return false
    if (pingMode) return false
    return true
  }, [selectedAsset, isEraserActive, fogEditMode, pingMode])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    
    if (e.target.closest('.token') && !isEraserActive && !fogEditMode) {
      return
    }
    
    if (canStartPanning(e)) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      setScrollStart({
        x: gridRef.current?.scrollLeft || 0,
        y: gridRef.current?.scrollTop || 0
      })
    }
  }, [canStartPanning, isEraserActive, fogEditMode])

  const handleMouseMove = useCallback((e) => {
    if (isPanning && gridRef.current) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      gridRef.current.scrollLeft = scrollStart.x - dx
      gridRef.current.scrollTop = scrollStart.y - dy
      return
    }
    
    if (draggedToken) {
      e.preventDefault()
      const pos = getPixelPosition(e.clientX, e.clientY)
      if (pos) {
        setDragPosition(pos)
      }
    }
  }, [isPanning, panStart, scrollStart, draggedToken, getPixelPosition])

  const handleTouchMove = useCallback((e) => {
    if (draggedToken) {
      e.preventDefault()
      const { clientX, clientY } = getClientCoords(e)
      const pos = getPixelPosition(clientX, clientY)
      if (pos) {
        setDragPosition(pos)
      }
    }
  }, [draggedToken, getPixelPosition, getClientCoords])

  const handleTouchEnd = useCallback((e) => {
    if (draggedToken) {
      e.preventDefault()
      const { clientX, clientY } = getClientCoordsFromChange(e)
      const cell = getCellFromMousePosition(clientX, clientY)
      if (cell) {
        onTokenMove(draggedToken.id, cell.x, cell.y)
      }
      setDraggedToken(null)
    }
  }, [draggedToken, getCellFromMousePosition, getClientCoordsFromChange, onTokenMove])

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false)
      return
    }
    
    if (draggedToken) {
      e.preventDefault()
      const cell = getCellFromMousePosition(e.clientX, e.clientY)
      if (cell) {
        onTokenMove(draggedToken.id, cell.x, cell.y)
      }
      setDraggedToken(null)
    }
  }, [isPanning, draggedToken, getCellFromMousePosition, onTokenMove])

  const handleGridClick = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.closest('.token')) return
    if (e.target.closest('.map-element')) return
    if (e.target.closest('.fog-canvas')) return
    if (draggedToken) return
    if (fogEditMode) return
    if (isPanning) return
    
    const cell = getCellFromMousePosition(e.clientX, e.clientY)
    if (!cell) return
    
    // Obsługa pinga
    if (pingMode && onSendPing) {
      onSendPing(cell.x, cell.y)
      return
    }
    
    if (selectedAsset) {
      onCellClick(cell.x, cell.y)
    }
  }, [getCellFromMousePosition, selectedAsset, onCellClick, draggedToken, fogEditMode, isPanning, pingMode, onSendPing])

  const handleTokenDragStart = useCallback((token, e) => {
    if (isEraserActive) return
    if (fogEditMode) return
    if (pingMode) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const { clientX, clientY } = getClientCoords(e)
    const pos = getPixelPosition(clientX, clientY)
    if (pos) {
      setDraggedToken(token)
      setDragPosition(pos)
    }
  }, [getPixelPosition, getClientCoords, isEraserActive, fogEditMode, pingMode])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    
    if (isEraserActive) return
    if (fogEditMode) return
    if (pingMode) return
    
    const cell = getCellFromMousePosition(e.clientX, e.clientY)
    if (!cell) return

    const token = tokens.find(t => t.x === cell.x && t.y === cell.y)
    if (token) {
      onRemoveToken(token.id)
      return
    }

    const element = mapElements.find(el => el.x === cell.x && el.y === cell.y)
    if (element) {
      onRemoveMapElement(element.id)
    }
  }, [getCellFromMousePosition, tokens, mapElements, onRemoveToken, onRemoveMapElement, isEraserActive, fogEditMode, pingMode])

  const handleDragStart = useCallback((e) => {
    e.preventDefault()
  }, [])

  const handleMapElementClick = useCallback((elementId) => {
    if (isEraserActive) {
      onRemoveMapElement(elementId)
    }
  }, [isEraserActive, onRemoveMapElement])

  const handleMouseLeave = useCallback(() => {
    setDraggedToken(null)
    setIsPanning(false)
  }, [])

  const backgroundStyle = background ? {
    backgroundImage: `url(${basePath}${background.src})`,
    backgroundPosition: 'top left',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'auto'
  } : {}

  const containerClasses = [
    'grid-container',
    isEraserActive && 'eraser-mode',
    fogEditMode && 'fog-edit-mode',
    pingMode && 'ping-mode',
    isPanning && 'panning',
    (!selectedAsset && !isEraserActive && !fogEditMode && !pingMode) && 'can-pan'
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={containerClasses}
      ref={gridRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setDraggedToken(null)}
      onClick={handleGridClick}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      <div 
        className="grid-zoom-wrapper"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE,
        }}
      >
        <div 
          className={`grid ${background ? 'has-background' : ''}`}
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
            ...backgroundStyle
          }}
        >
          {mapElements.map(element => (
            <MapElement
              key={element.id}
              element={element}
              cellSize={CELL_SIZE}
              basePath={basePath}
              isEraserActive={isEraserActive}
              onEraserClick={handleMapElementClick}
            />
          ))}
          
          {tokens.map(token => (
            <Token
              key={token.id}
              token={token}
              cellSize={CELL_SIZE}
              isDragging={draggedToken?.id === token.id}
              dragPosition={draggedToken?.id === token.id ? dragPosition : null}
              onDragStart={handleTokenDragStart}
              basePath={basePath}
            />
          ))}
          
          {/* Animacja Ping */}
          {pingAnimation && (
            <div 
              className="ping-animation"
              style={{
                left: pingAnimation.x * CELL_SIZE + CELL_SIZE / 2,
                top: pingAnimation.y * CELL_SIZE + CELL_SIZE / 2,
              }}
            >
              <span className="ping-dot" />
              <span className="ping-ring ping-ring-1" />
              <span className="ping-ring ping-ring-2" />
              <span className="ping-ring ping-ring-3" />
            </div>
          )}
          
          <FogOfWar
            bitmap={fogBitmap}
            enabled={fogEnabled}
            gmOpacity={fogGmOpacity}
            isEditing={fogEditMode}
            brushSize={fogBrushSize}
            revealMode={fogRevealMode}
            onBitmapChange={onFogBitmapChange}
            zoomLevel={zoomLevel}
          />
        </div>
      </div>
    </div>
  )
})

export default Grid