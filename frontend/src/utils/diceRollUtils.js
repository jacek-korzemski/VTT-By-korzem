/**
 * Shared dice roll parsing and execution for templates and macros.
 * Dispatches 'vtt:dice-roll' so App can add to history and sync.
 */

/** Returns true if string contains dice notation ndx (e.g. 2d6, d20, 1d4 or 2d6+1) */
function isDiceNotation(str) {
  if (str == null || typeof str !== 'string') return false
  return /\d*d\d+/.test(str.trim())
}

export function parseRollExpression(expr, getFieldValue) {
  const diceRegex = /(\d*)d(\d+)/g
  const fieldRegex = /@(\w+)/g
  const conditionalRegex = /\+@(\w+)\?@(\w+)/g

  let modifier = 0
  const diceList = []

  const withoutConditionals = expr.replace(conditionalRegex, (_, valField, condField) => {
    const condVal = getFieldValue(condField)
    if (condVal === true || condVal === 'on' || condVal === 'true') {
      const val = parseInt(getFieldValue(valField), 10) || 0
      modifier += val
    }
    return ''
  })

  const withoutFields = withoutConditionals.replace(fieldRegex, (_, name) => {
    const raw = getFieldValue(name)
    const str = String(raw ?? '').trim()
    if (isDiceNotation(str)) {
      return str
    }
    const val = parseInt(str, 10) || 0
    modifier += val
    return ''
  })

  let match
  while ((match = diceRegex.exec(withoutFields)) !== null) {
    const count = parseInt(match[1], 10) || 1
    const sides = parseInt(match[2], 10)
    for (let i = 0; i < count; i++) {
      diceList.push({ type: `d${sides}`, sides })
    }
  }

  const remaining = withoutFields.replace(/(\d*)d(\d+)/g, '').replace(/\s/g, '')
  const numberMatches = remaining.match(/[+-]?\d+/g)
  if (numberMatches) {
    numberMatches.forEach((s) => { modifier += parseInt(s, 10) })
  }

  return { diceList, modifier }
}

/**
 * Build roll data object (for history/API). Does not dispatch.
 */
export function buildRollData(diceList, modifier, label, getFieldValue) {
  if (diceList.length === 0) return null

  const rolls = diceList.map(die => ({
    type: die.type,
    sides: die.sides,
    result: Math.floor(Math.random() * die.sides) + 1
  }))

  const total = rolls.reduce((sum, r) => sum + r.result, 0) + modifier
  const playerName = typeof localStorage !== 'undefined' ? localStorage.getItem('vtt_player_name') || 'Anonymous' : 'Anonymous'

  let resolvedLabel = label || ''
  if (resolvedLabel && getFieldValue) {
    resolvedLabel = resolvedLabel.replace(/@(\w+)/g, (_, name) => {
      const v = getFieldValue(name)
      return (v === true || v === false) ? '' : (v || '')
    }).trim()
  }

  return {
    player: resolvedLabel ? `${playerName} (${resolvedLabel})` : playerName,
    type: 'standard',
    dice: rolls,
    modifier,
    total,
    timestamp: Date.now()
  }
}

/**
 * Parse expression, roll dice, build rollData and dispatch 'vtt:dice-roll'.
 */
export function executeDiceRoll(expr, label, getFieldValue) {
  const { diceList, modifier } = parseRollExpression(expr, getFieldValue)
  const rollData = buildRollData(diceList, modifier, label, getFieldValue)
  if (!rollData) return

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vtt:dice-roll', { detail: rollData }))
  }
}
