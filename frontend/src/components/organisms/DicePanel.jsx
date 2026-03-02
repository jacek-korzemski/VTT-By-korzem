import React, { useState, useEffect, useCallback } from 'react'
import { t } from '../../lang'
import L5RDicePanel from '../molecules/L5RDicePanel'
import { parseRollExpression } from '../../utils/diceRollUtils'
import { useNotesTemplate } from '../../contexts/NotesTemplateContext'

const DICE_TYPES = [
  { type: 'd4', sides: 4, color: '#e74c3c' },
  { type: 'd6', sides: 6, color: '#3498db' },
  { type: 'd8', sides: 8, color: '#2ecc71' },
  { type: 'd10', sides: 10, color: '#9b59b6' },
  { type: 'd12', sides: 12, color: '#f39c12' },
  { type: 'd20', sides: 20, color: '#e94560' },
  { type: 'd100', sides: 100, color: '#1abc9c' },
]

const MACRO_STORAGE_KEY = 'vtt_macros'

function loadMacros() {
  try {
    const raw = localStorage.getItem(MACRO_STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function DicePanel({ isOpen, onToggle, rollHistory, onRoll }) {
  const [mode, setMode] = useState('standard')
  const [selectedDice, setSelectedDice] = useState([])
  const [modifier, setModifier] = useState(0)
  const [playerName, setPlayerName] = useState('')
  const [isRolling, setIsRolling] = useState(false)
  const [macros, setMacros] = useState([])
  const { getFieldValue: ctxGetFieldValue } = useNotesTemplate() || {}

  useEffect(() => {
    const saved = localStorage.getItem('vtt_player_name')
    if (saved) setPlayerName(saved)
  }, [])

  useEffect(() => {
    setMacros(loadMacros())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      const list = loadMacros()
      setMacros(list)
      if (list.length === 0 && mode === 'macros') {
        setMode('standard')
      }
    }
    window.addEventListener('vtt:macros-changed', handler)
    return () => window.removeEventListener('vtt:macros-changed', handler)
  }, [mode])

  useEffect(() => {
    if (isOpen) {
      setMacros(loadMacros())
    }
  }, [isOpen])

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

  const applyMacro = useCallback((macro) => {
    if (!macro || !macro.expression) return

    const getFieldValue = macro.sourceNoteId && ctxGetFieldValue
      ? (fieldName) => ctxGetFieldValue(macro.sourceNoteId, fieldName)
      : () => ''

    const { diceList, modifier: exprModifier } = parseRollExpression(macro.expression, getFieldValue)

    if (diceList.length === 0) {
      return
    }

    const withIds = diceList.map(die => ({
      ...die,
      id: Date.now() + Math.random()
    }))

    setSelectedDice(withIds)
    setModifier(exprModifier)
  }, [ctxGetFieldValue])

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

        <div className="dice-panel-content">
        <div className="dice-player-name">
          <input
            type="text"
            placeholder={t('dice.playerPlaceholder')}
            value={playerName}
            onChange={handleNameChange}
            maxLength={20}
          />
        </div>

        <div className="dice-mode-switch">
          <button 
            className={mode === 'standard' ? 'active' : ''}
            onClick={() => setMode('standard')}
          >
            {t('dice.standardMode')}
          </button>
          {macros.length > 0 && (
            <button
              className={mode === 'macros' ? 'active' : ''}
              onClick={() => setMode('macros')}
            >
              Makra
            </button>
          )}
          <button 
            className={mode === 'l5r' ? 'active' : ''}
            onClick={() => setMode('l5r')}
          >
            L5R
          </button>
        </div>

        {(mode === 'standard' || mode === 'macros') && (
          <>
            <div className="dice-types">
              {mode === 'standard' && DICE_TYPES.map(die => (
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
              {mode === 'macros' && (
                <>
                  {macros.length === 0 ? (
                    <p className="dice-placeholder">{t('macros.noMacros')}</p>
                  ) : (
                    <div className="dice-macros">
                      {macros
                        .slice()
                        .sort((a, b) => {
                          const aName = (a.name || a.expression || '').toLowerCase()
                          const bName = (b.name || b.expression || '').toLowerCase()
                          return aName.localeCompare(bName)
                        })
                        .map(macro => (
                        <button
                          key={macro.id}
                          className="dice-macro-btn"
                          onClick={() => applyMacro(macro)}
                        >
                          {macro.icon && <span className="dice-macro-icon">{macro.icon}</span>}
                          <span className="dice-macro-label">{macro.name || macro.expression}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
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
                  {modifier !== 0 && (
                    <span className="dice-pool-modifier">
                      {modifier > 0 ? `+${modifier}` : modifier}
                    </span>
                  )}
                </div>
              )}
            </div>

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

        {mode === 'l5r' && (
          <L5RDicePanel playerName={playerName} onRoll={onRoll} />
        )}

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
      </div>
    </>
  )
}

export default DicePanel
