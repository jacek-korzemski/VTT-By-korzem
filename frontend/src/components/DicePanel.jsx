import React, { useState, useEffect, useCallback } from 'react'
import { RING_DICE_IMAGES, SKILL_DICE_IMAGES } from '../assets/l5r'
import { t } from '../lang'
import L5RDicePanel from './L5RDicePanel'

const DICE_TYPES = [
  { type: 'd4', sides: 4, color: '#e74c3c' },
  { type: 'd6', sides: 6, color: '#3498db' },
  { type: 'd8', sides: 8, color: '#2ecc71' },
  { type: 'd10', sides: 10, color: '#9b59b6' },
  { type: 'd12', sides: 12, color: '#f39c12' },
  { type: 'd20', sides: 20, color: '#e94560' },
  { type: 'd100', sides: 100, color: '#1abc9c' },
]

function DicePanel({ isOpen, onToggle, rollHistory, onRoll }) {
  const [mode, setMode] = useState('standard') // 'standard' | 'l5r'
  const [selectedDice, setSelectedDice] = useState([])
  const [modifier, setModifier] = useState(0)
  const [playerName, setPlayerName] = useState('')
  const [isRolling, setIsRolling] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('vtt_player_name')
    if (saved) setPlayerName(saved)
  }, [])

  const handleNameChange = useCallback((e) => {
    const name = e.target.value
    setPlayerName(name)
    localStorage.setItem('vtt_player_name', name)
  }, [])

  const addDie = useCallback((dieType) => {
    setSelectedDice(prev => [...prev, {
      ...dieType,
      id: Date.now() + Math.random()
    }])
  }, [])

  const removeDie = useCallback((id) => {
    setSelectedDice(prev => prev.filter(d => d.id !== id))
  }, [])

  const clearDice = useCallback(() => {
    setSelectedDice([])
    setModifier(0)
  }, [])

  const rollDice = useCallback(() => {
    if (selectedDice.length === 0) return

    setIsRolling(true)

    setTimeout(() => {
      const rolls = selectedDice.map(die => ({
        type: die.type,
        sides: die.sides,
        result: Math.floor(Math.random() * die.sides) + 1
      }))

      const total = rolls.reduce((sum, r) => sum + r.result, 0) + modifier

      const rollData = {
        player: playerName || 'Anonymous',
        type: 'standard',
        dice: rolls,
        modifier: modifier,
        total: total,
        timestamp: Date.now()
      }

      onRoll(rollData)
      setIsRolling(false)
    }, 500)
  }, [selectedDice, modifier, playerName, onRoll])

  const getDiceCounts = () => {
    const counts = {}
    selectedDice.forEach(d => {
      counts[d.type] = (counts[d.type] || 0) + 1
    })
    return counts
  }

  const formatRoll = (roll) => {
    if (roll.type === 'l5r') {
      return t('l5r.rollResult', {
        success: roll.totals.success,
        opportunity: roll.totals.opportunity,
        strife: roll.totals.strife
      })
    }

    const diceCounts = {}
    roll.dice.forEach(d => {
      diceCounts[d.type] = diceCounts[d.type] || []
      diceCounts[d.type].push(d.result)
    })

    const parts = Object.entries(diceCounts).map(([type, results]) => 
      `${results.length}${type} [${results.join(', ')}]`
    )

    let formula = parts.join(' + ')
    if (roll.modifier !== 0) {
      formula += roll.modifier > 0 ? ` + ${roll.modifier}` : ` - ${Math.abs(roll.modifier)}`
    }

    return formula
  }

  const formatTotal = (roll) => {
    if (roll.type === 'l5r') {
      return `✓${roll.totals.success} 🌀${roll.totals.opportunity} 💢${roll.totals.strife}`
    }
    return `= ${roll.total}`
  }

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return t('dice.now')
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}${t('dice.minutesAgo')}`
    const hours = Math.floor(minutes / 60)
    return `${hours}${t('dice.hoursAgo')}`
  }

  return (
    <>
      <button 
        className={`dice-panel-toggle ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        title={t('dice.title')}
      >
        🎲
      </button>

      <div className={`dice-panel ${isOpen ? 'open' : ''}`}>
        <div className="dice-panel-header">
          <h2>🎲 {t('dice.title')}</h2>
        </div>

        {/* Nazwa gracza */}
        <div className="dice-player-name">
          <input
            type="text"
            placeholder={t('dice.playerPlaceholder')}
            value={playerName}
            onChange={handleNameChange}
            maxLength={20}
          />
        </div>

        {/* Przełącznik trybu */}
        <div className="dice-mode-switch">
          <button 
            className={mode === 'standard' ? 'active' : ''}
            onClick={() => setMode('standard')}
          >
            {t('dice.standardMode')}
          </button>
          <button 
            className={mode === 'l5r' ? 'active' : ''}
            onClick={() => setMode('l5r')}
          >
            L5R
          </button>
        </div>

        {/* Tryb standardowy */}
        {mode === 'standard' && (
          <>
            <div className="dice-types">
              {DICE_TYPES.map(die => (
                <button
                  key={die.type}
                  className="dice-type-btn"
                  style={{ '--dice-color': die.color }}
                  onClick={() => addDie(die)}
                  title={`${t('dice.addDie').split(' ')[0]} ${die.type}`}
                >
                  {die.type}
                </button>
              ))}
            </div>

            <div className="dice-selected">
              {selectedDice.length === 0 ? (
                <p className="dice-placeholder">{t('dice.addDie')}</p>
              ) : (
                <div className="dice-pool">
                  {selectedDice.map(die => (
                    <span
                      key={die.id}
                      className="die-chip"
                      style={{ '--dice-color': DICE_TYPES.find(d => d.type === die.type)?.color }}
                      onClick={() => removeDie(die.id)}
                    >
                      {die.type}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {selectedDice.length > 0 && (
              <div className="dice-summary">
                {Object.entries(getDiceCounts()).map(([type, count]) => (
                  <span key={type} className="dice-count">{count}{type}</span>
                ))}
              </div>
            )}

            <div className="dice-modifier">
              <label>{t('dice.modifier')}</label>
              <div className="modifier-controls">
                <button onClick={() => setModifier(m => m - 1)}>−</button>
                <input
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                />
                <button onClick={() => setModifier(m => m + 1)}>+</button>
              </div>
            </div>

            <div className="dice-actions">
              <button 
                className="roll-btn"
                onClick={rollDice}
                disabled={selectedDice.length === 0 || isRolling}
              >
                {isRolling ? `🎲 ${t('dice.rolling')}` : `🎲 ${t('dice.roll')}`}
              </button>
              <button 
                className="clear-btn"
                onClick={clearDice}
                disabled={selectedDice.length === 0 && modifier === 0}
              >
                ✕
              </button>
            </div>
          </>
        )}

        {/* Tryb L5R */}
        {mode === 'l5r' && (
          <L5RDicePanel playerName={playerName} onRoll={onRoll} />
        )}

        {/* Historia rzutów */}
        <div className="dice-history">
          <h3>{t('dice.history')}</h3>
          <div className="history-list">
            {rollHistory.length === 0 ? (
              <p className="history-empty">{t('dice.historyEmpty')}</p>
            ) : (
              rollHistory.slice().reverse().map((roll, idx) => (
                <div key={roll.id || idx} className={`history-item ${roll.type === 'l5r' ? 'l5r-roll' : ''}`}>
                  <div className="history-header">
                    <span className="history-player">{roll.player}</span>
                    {roll.type === 'l5r' && <span className="history-badge">L5R</span>}
                    <span className="history-time">{timeAgo(roll.timestamp)}</span>
                  </div>
                  <div className="history-formula">{formatRoll(roll)}</div>
                  <div className="history-total">{formatTotal(roll)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default DicePanel