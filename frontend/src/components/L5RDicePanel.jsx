import React, { useState, useCallback } from 'react'
import { t } from '../lang'
import { 
  RING_DICE_IMAGES, 
  SKILL_DICE_IMAGES, 
  RING_PREVIEW, 
  SKILL_PREVIEW 
} from '../assets/l5r'

// Ring Die (d6) - mapowanie ścianek
const RING_DIE_FACES = [
  { faceId: 1, success: 0, opportunity: 0, strife: false, explosive: false },
  { faceId: 2, success: 0, opportunity: 1, strife: true, explosive: false },
  { faceId: 3, success: 0, opportunity: 1, strife: false, explosive: false },
  { faceId: 4, success: 1, opportunity: 0, strife: true, explosive: false },
  { faceId: 5, success: 1, opportunity: 0, strife: false, explosive: false },
  { faceId: 6, success: 1, opportunity: 0, strife: true, explosive: true },
]

// Skill Die (d12) - mapowanie ścianek
const SKILL_DIE_FACES = [
  { faceId: 1, success: 0, opportunity: 0, strife: false, explosive: false },
  { faceId: 2, success: 0, opportunity: 0, strife: false, explosive: false },
  { faceId: 3, success: 0, opportunity: 1, strife: false, explosive: false },
  { faceId: 4, success: 0, opportunity: 1, strife: false, explosive: false },
  { faceId: 5, success: 0, opportunity: 1, strife: false, explosive: false },
  { faceId: 6, success: 1, opportunity: 0, strife: true, explosive: false },
  { faceId: 7, success: 1, opportunity: 0, strife: true, explosive: false },
  { faceId: 8, success: 1, opportunity: 0, strife: false, explosive: false },
  { faceId: 9, success: 1, opportunity: 0, strife: false, explosive: false },
  { faceId: 10, success: 1, opportunity: 1, strife: false, explosive: false },
  { faceId: 11, success: 1, opportunity: 0, strife: true, explosive: true },
  { faceId: 12, success: 1, opportunity: 0, strife: false, explosive: true },
]

function rollDie(faces) {
  const faceIndex = Math.floor(Math.random() * faces.length)
  return { ...faces[faceIndex] }
}

function L5RDicePanel({ playerName, onRoll }) {
  const [phase, setPhase] = useState('setup')
  const [ringCount, setRingCount] = useState(2)
  const [skillCount, setSkillCount] = useState(2)
  const [rolledDice, setRolledDice] = useState([])
  const [keptDice, setKeptDice] = useState([])
  const [selectedForKeep, setSelectedForKeep] = useState(new Set())
  const [selectedForExplode, setSelectedForExplode] = useState(new Set())

  // Pobierz obrazek dla kości
  const getDieImage = (die) => {
    if (die.type === 'ring') {
      return RING_DICE_IMAGES[die.faceId]
    }
    return SKILL_DICE_IMAGES[die.faceId]
  }

  const handleRoll = useCallback(() => {
    const dice = []
    
    for (let i = 0; i < ringCount; i++) {
      dice.push({
        id: `ring_${Date.now()}_${i}`,
        type: 'ring',
        ...rollDie(RING_DIE_FACES)
      })
    }
    
    for (let i = 0; i < skillCount; i++) {
      dice.push({
        id: `skill_${Date.now()}_${i}`,
        type: 'skill',
        ...rollDie(SKILL_DIE_FACES)
      })
    }
    
    setRolledDice(dice)
    setKeptDice([])
    setSelectedForKeep(new Set())
    setSelectedForExplode(new Set())
    setPhase('rolled')
  }, [ringCount, skillCount])

  const toggleKeepSelection = useCallback((dieId) => {
    setSelectedForKeep(prev => {
      const next = new Set(prev)
      if (next.has(dieId)) {
        next.delete(dieId)
      } else {
        next.add(dieId)
      }
      return next
    })
  }, [])

  const toggleExplodeSelection = useCallback((dieId) => {
    setSelectedForExplode(prev => {
      const next = new Set(prev)
      if (next.has(dieId)) {
        next.delete(dieId)
      } else {
        next.add(dieId)
      }
      return next
    })
  }, [])

  const handleKeepDice = useCallback(() => {
    const kept = rolledDice.filter(d => selectedForKeep.has(d.id))
    const remaining = rolledDice.filter(d => !selectedForKeep.has(d.id))
    
    const hasExplosive = kept.some(d => d.explosive && !d.exploded)
    
    setKeptDice(prev => [...prev, ...kept])
    setRolledDice(remaining)
    setSelectedForKeep(new Set())
    
    if (hasExplosive) {
      setPhase('explode')
    } else if (remaining.length === 0) {
      setPhase('kept')
    }
  }, [rolledDice, selectedForKeep])

  const handleExplode = useCallback(() => {
    const toExplode = keptDice.filter(d => d.explosive && !d.exploded && selectedForExplode.has(d.id))
    
    const newDice = toExplode.map((die, i) => {
      const faces = die.type === 'ring' ? RING_DIE_FACES : SKILL_DIE_FACES
      return {
        id: `${die.type}_explode_${Date.now()}_${i}`,
        type: die.type,
        fromExplosion: true,
        ...rollDie(faces)
      }
    })
    
    const updatedKept = keptDice.map(d => 
      selectedForExplode.has(d.id) ? { ...d, exploded: true } : d
    )
    
    setKeptDice(updatedKept)
    setRolledDice(newDice)
    setSelectedForExplode(new Set())
    setSelectedForKeep(new Set())
    setPhase('rolled')
  }, [keptDice, selectedForExplode])

  const handleSkipExplode = useCallback(() => {
    if (rolledDice.length === 0) {
      setPhase('kept')
    } else {
      setPhase('rolled')
    }
    setSelectedForExplode(new Set())
  }, [rolledDice.length])

  const handleFinish = useCallback(() => {
    const totals = keptDice.reduce((acc, die) => ({
      success: acc.success + die.success,
      opportunity: acc.opportunity + die.opportunity,
      strife: acc.strife + (die.strife ? 1 : 0)
    }), { success: 0, opportunity: 0, strife: 0 })
    
    const rollData = {
      player: playerName || 'Anonymous',
      type: 'l5r',
      dice: keptDice.map(d => ({
        type: d.type,
        faceId: d.faceId,
        success: d.success,
        opportunity: d.opportunity,
        strife: d.strife,
        exploded: d.exploded || false
      })),
      totals,
      timestamp: Date.now()
    }
    
    onRoll(rollData)
    handleReset()
  }, [keptDice, playerName, onRoll])

  const handleReset = useCallback(() => {
    setPhase('setup')
    setRolledDice([])
    setKeptDice([])
    setSelectedForKeep(new Set())
    setSelectedForExplode(new Set())
  }, [])

  // Komponent pojedynczej kości z obrazkiem
  const DieDisplay = ({ die, selected, onClick, disabled }) => {
    const imageSrc = getDieImage(die)
    
    const tooltipParts = []
    if (die.success) tooltipParts.push(`${t('l5r.success')}: ${die.success}`)
    if (die.opportunity) tooltipParts.push(`${t('l5r.opportunity')}: ${die.opportunity}`)
    if (die.strife) tooltipParts.push(t('l5r.strife'))
    if (die.explosive && !die.exploded) tooltipParts.push(t('l5r.explosive'))
    if (die.exploded) tooltipParts.push(t('l5r.exploded'))
    
    return (
      <div 
        className={`l5r-die ${die.type} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${die.explosive && !die.exploded ? 'can-explode' : ''}`}
        onClick={() => !disabled && onClick?.(die.id)}
        title={tooltipParts.join(' | ') || t('l5r.blank')}
      >
        <img 
          src={imageSrc} 
          alt={tooltipParts.join(', ') || 'blank'} 
          className="die-image"
          draggable={false}
        />
        {die.explosive && !die.exploded && (
          <span className="die-explosive-badge">💥</span>
        )}
        {die.exploded && (
          <span className="die-exploded-badge">✓</span>
        )}
        {die.fromExplosion && (
          <span className="die-from-explosion-badge">★</span>
        )}
      </div>
    )
  }

  return (
    <div className="l5r-dice-panel">
      {/* Faza setup */}
      {phase === 'setup' && (
        <div className="l5r-setup">
          <div className="l5r-dice-selector">
            <div className="l5r-selector-row">
              <div className="l5r-selector-label">
                <img src={RING_PREVIEW} alt="Ring" className="selector-die-icon" />
                <label>{t('l5r.ringDice')}:</label>
              </div>
              <div className="l5r-counter">
                <button onClick={() => setRingCount(Math.max(0, ringCount - 1))}>−</button>
                <span>{ringCount}</span>
                <button onClick={() => setRingCount(Math.min(10, ringCount + 1))}>+</button>
              </div>
            </div>
            <div className="l5r-selector-row">
              <div className="l5r-selector-label">
                <img src={SKILL_PREVIEW} alt="Skill" className="selector-die-icon" />
                <label>{t('l5r.skillDice')}:</label>
              </div>
              <div className="l5r-counter">
                <button onClick={() => setSkillCount(Math.max(0, skillCount - 1))}>−</button>
                <span>{skillCount}</span>
                <button onClick={() => setSkillCount(Math.min(10, skillCount + 1))}>+</button>
              </div>
            </div>
          </div>
          
          <button 
            className="l5r-roll-btn"
            onClick={handleRoll}
            disabled={ringCount + skillCount === 0}
          >
            🎲 {t('l5r.roll')}
          </button>
        </div>
      )}

      {/* Faza rolled */}
      {phase === 'rolled' && (
        <div className="l5r-rolled">
          <p className="l5r-instruction">{t('l5r.selectToKeep')}</p>
          
          {keptDice.length > 0 && (
            <div className="l5r-kept-section">
              <h4>{t('l5r.kept')}</h4>
              <div className="l5r-dice-pool kept">
                {keptDice.map(die => (
                  <DieDisplay key={die.id} die={die} disabled />
                ))}
              </div>
            </div>
          )}
          
          <div className="l5r-available-section">
            <h4>{t('l5r.available')}</h4>
            <div className="l5r-dice-pool">
              {rolledDice.map(die => (
                <DieDisplay 
                  key={die.id} 
                  die={die}
                  selected={selectedForKeep.has(die.id)}
                  onClick={toggleKeepSelection}
                />
              ))}
            </div>
          </div>
          
          <div className="l5r-actions">
            <button 
              className="l5r-keep-btn"
              onClick={handleKeepDice}
              disabled={selectedForKeep.size === 0}
            >
              ✓ {t('l5r.keepSelected')} ({selectedForKeep.size})
            </button>
            
            {/* NOWE: Przycisk zakończenia gdy mamy już zatrzymane kości */}
            {keptDice.length > 0 && (
              <button 
                className="l5r-finish-early-btn"
                onClick={() => setPhase('kept')}
              >
                ⏭ {t('l5r.finishKeeping')}
              </button>
            )}
            
            <button className="l5r-reset-btn" onClick={handleReset}>
              ↺ {t('l5r.reset')}
            </button>
          </div>
        </div>
      )}

      {/* Faza explode */}
      {phase === 'explode' && (
        <div className="l5r-explode">
          <p className="l5r-instruction">{t('l5r.selectToExplode')}</p>
          
          <div className="l5r-kept-section">
            <h4>{t('l5r.kept')}</h4>
            <div className="l5r-dice-pool">
              {keptDice.map(die => (
                <DieDisplay 
                  key={die.id} 
                  die={die}
                  selected={die.explosive && !die.exploded && selectedForExplode.has(die.id)}
                  onClick={die.explosive && !die.exploded ? toggleExplodeSelection : undefined}
                  disabled={!die.explosive || die.exploded}
                />
              ))}
            </div>
          </div>
          
          <div className="l5r-actions">
            <button 
              className="l5r-explode-btn"
              onClick={handleExplode}
              disabled={selectedForExplode.size === 0}
            >
              💥 {t('l5r.explode')} ({selectedForExplode.size})
            </button>
            <button className="l5r-skip-btn" onClick={handleSkipExplode}>
              ⏭ {t('l5r.skipExplode')}
            </button>
          </div>
        </div>
      )}

      {/* Faza kept */}
      {phase === 'kept' && (
        <div className="l5r-summary">
          <h4>{t('l5r.result')}</h4>
          
          <div className="l5r-dice-pool final">
            {keptDice.map(die => (
              <DieDisplay key={die.id} die={die} disabled />
            ))}
          </div>
          
          <div className="l5r-totals">
            <div className="l5r-total success">
              <span className="total-label">{t('l5r.success')}</span>
              <span className="total-value">{keptDice.reduce((s, d) => s + d.success, 0)}</span>
            </div>
            <div className="l5r-total opportunity">
              <span className="total-label">{t('l5r.opportunity')}</span>
              <span className="total-value">{keptDice.reduce((s, d) => s + d.opportunity, 0)}</span>
            </div>
            <div className="l5r-total strife">
              <span className="total-label">{t('l5r.strife')}</span>
              <span className="total-value">{keptDice.filter(d => d.strife).length}</span>
            </div>
          </div>
          
          <div className="l5r-actions">
            <button className="l5r-finish-btn" onClick={handleFinish}>
              ✓ {t('l5r.saveResult')}
            </button>
            <button className="l5r-reset-btn" onClick={handleReset}>
              ↺ {t('l5r.rollAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default L5RDicePanel