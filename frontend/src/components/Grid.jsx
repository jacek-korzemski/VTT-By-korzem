import React, { useRef, useState, useCallback, useEffect } from 'react'
import Token from './Token'
import MapElement from './MapElement'
import FogOfWar from './FogOfWar'
import { GRID_SIZE, CELL_SIZE } from '../../config'

function Grid({
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
  zoomLevel  // NOWE
}) {
  const gridRef = useRef(null)
  const [draggedToken, setDraggedToken] = useState(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  
  // NOWE: Stan dla panningu
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 })

  // Uwzględnij zoom w obliczeniach pozycji
  const getCellFromMousePosition = useCallback((clientX, clientY) => {
    if (!gridRef.current) return null
    
    const rect = gridRef.current.getBoundingClientRect()
    const scrollLeft = gridRef.current.scrollLeft
    const scrollTop = gridRef.current.scrollTop
    
    // Uwzględnij zoom
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
    
    // Uwzględnij zoom
    return {
      x: (clientX - rect.left) / zoomLevel + scrollLeft / zoomLevel,
      y: (clientY - rect.top) / zoomLevel + scrollTop / zoomLevel
    }
  }, [zoomLevel])

  // NOWE: Sprawdź czy można rozpocząć panning
  const canStartPanning = useCallback((e) => {
    // Nie pannuj gdy klikamy na interaktywne elementy
    if (e.target.closest('.token')) return false
    if (e.target.closest('.map-element.erasable')) return false
    if (e.target.closest('.fog-canvas.editing')) return false
    // Nie pannuj gdy mamy wybrane narzędzie lub tryb edycji
    if (selectedAsset) return false
    if (isEraserActive) return false
    if (fogEditMode) return false
    return true
  }, [selectedAsset, isEraserActive, fogEditMode])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    
    // Sprawdź czy to token - obsługuj przeciąganie tokenu
    if (e.target.closest('.token') && !isEraserActive && !fogEditMode) {
      return // Token sam obsłuży swój mousedown
    }
    
    // Sprawdź czy można pannować
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

  // Zaktualizowany handleMouseMove
  const handleMouseMove = useCallback((e) => {
    // Panning
    if (isPanning && gridRef.current) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      gridRef.current.scrollLeft = scrollStart.x - dx
      gridRef.current.scrollTop = scrollStart.y - dy
      return
    }
    
    // Przeciąganie tokenu
    if (draggedToken) {
      e.preventDefault()
      const pos = getPixelPosition(e.clientX, e.clientY)
      if (pos) {
        setDragPosition(pos)
      }
    }
  }, [isPanning, panStart, scrollStart, draggedToken, getPixelPosition])

  // Zaktualizowany handleMouseUp
  const handleMouseUp = useCallback((e) => {
    // Zakończ panning
    if (isPanning) {
      setIsPanning(false)
      return
    }
    
    // Zakończ przeciąganie tokenu
    if (draggedToken) {
      e.preventDefault()
      const cell = getCellFromMousePosition(e.clientX, e.clientY)
      if (cell) {
        onTokenMove(draggedToken.id, cell.x, cell.y)
      }
      setDraggedToken(null)
    }
  }, [isPanning, draggedToken, getCellFromMousePosition, onTokenMove])

  // Kliknięcie na grid (tylko jeśli nie było panningu)
  const handleGridClick = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.closest('.token')) return
    if (e.target.closest('.map-element')) return
    if (e.target.closest('.fog-canvas')) return
    if (draggedToken) return
    if (fogEditMode) return
    if (isPanning) return
    
    const cell = getCellFromMousePosition(e.clientX, e.clientY)
    if (cell && selectedAsset) {
      onCellClick(cell.x, cell.y)
    }
  }, [getCellFromMousePosition, selectedAsset, onCellClick, draggedToken, fogEditMode, isPanning])

  const handleTokenDragStart = useCallback((token, e) => {
    if (isEraserActive) return
    if (fogEditMode) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const pos = getPixelPosition(e.clientX, e.clientY)
    if (pos) {
      setDraggedToken(token)
      setDragPosition(pos)
    }
  }, [getPixelPosition, isEraserActive, fogEditMode])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    
    if (isEraserActive) return
    if (fogEditMode) return
    
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
  }, [getCellFromMousePosition, tokens, mapElements, onRemoveToken, onRemoveMapElement, isEraserActive, fogEditMode])

  const handleDragStart = useCallback((e) => {
    e.preventDefault()
  }, [])

  const handleMapElementClick = useCallback((elementId) => {
    if (isEraserActive) {
      onRemoveMapElement(elementId)
    }
  }, [isEraserActive, onRemoveMapElement])

  // Cleanup przy wyjściu kursora
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

  // Klasy dla kursora
  const containerClasses = [
    'grid-container',
    isEraserActive && 'eraser-mode',
    fogEditMode && 'fog-edit-mode',
    isPanning && 'panning',
    (!selectedAsset && !isEraserActive && !fogEditMode) && 'can-pan'
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={containerClasses}
      ref={gridRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleGridClick}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      {/* Wrapper dla zoom */}
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
}

export default Grid