/**
 * Generates full HTML document for note templates from structured model.
 * Output is compatible with NoteEditor (data-field, data-roll, tpl-table classes).
 * Sections have rows; each row has cells (columns).
 */

function escapeHtml(str) {
  if (str == null) return ''
  const s = String(str)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inputClass(size, style) {
  const sizeClass = size === 'wide' ? ' wide' : ''
  const styleClass = style === 'box' ? ' box sm' : style === 'circle' ? ' circle' : ' plain' + (size === 'normal' ? ' sm' : '')
  return (styleClass + sizeClass).trim()
}

/** One cell => one <td>. */
function renderCell(cell) {
  const type = cell.type || 'text'
  const label = escapeHtml(cell.label || '')
  const fieldId = escapeHtml((cell.fieldId || '').trim() || 'field')
  const size = cell.size === 'wide' ? 'wide' : 'normal'
  const style = cell.style || 'plain'

  if (type === 'checkbox') {
    return `<td><input data-field="${fieldId}" type="checkbox"> ${label}</td>`
  }
  if (type === 'textarea') {
    return `<td><strong>${label}</strong><br><textarea data-field="${fieldId}" class="plain wide" rows="2"></textarea></td>`
  }
  if (type === 'textWithRoll') {
    const formula = escapeHtml((cell.rollFormula || 'd20').trim())
    const rollLabel = escapeHtml((cell.rollLabel || '').trim())
    const cls = inputClass(size, style)
    return `<td class="center"><strong>${label}</strong><br><input data-field="${fieldId}" type="text" class="${cls}"> <button data-roll="${formula}" data-roll-label="${rollLabel}" class="roll-btn">🎲</button></td>`
  }
  if (type === 'text') {
    const cls = inputClass(size, style)
    return `<td class="center"><strong>${label}</strong><br><input data-field="${fieldId}" type="text" class="${cls}"></td>`
  }
  return '<td></td>'
}

function renderRowOfCells(cells) {
  if (!cells || cells.length === 0) return ''
  const parts = cells.map((cell) => renderCell(cell))
  return `    <tr>\n      ${parts.join('\n      ')}\n    </tr>`
}

/**
 * @param {Object} model
 * @param {string} model.templateName
 * @param {Array<{ title: string, emoji?: string, rows: Array<{ cells: Array<Object> }> }>} model.sections
 * @param {string} [lang='en']
 * @returns {string} Full HTML document
 */
export function templateModelToHtml(model, lang = 'en') {
  const title = escapeHtml(model.templateName || 'Untitled template')
  const sections = model.sections || []
  const bodyParts = []

  for (const section of sections) {
    const sectionTitle = escapeHtml(section.title || 'Section')
    const emoji = section.emoji != null && String(section.emoji).trim() !== '' ? escapeHtml(String(section.emoji).trim()) + ' ' : ''
    const rows = section.rows || []

    let tableRows = []
    const numCols = Math.max(1, ...rows.map((r) => (r.cells && r.cells.length) || 0))
    tableRows.push(`    <tr>\n      <td colspan="${numCols}" class="section-header">${emoji}${sectionTitle}</td>\n    </tr>`)

    for (const row of rows) {
      const cells = row.cells || []
      if (cells.length === 0) continue
      const rowHtml = renderRowOfCells(cells)
      if (rowHtml) tableRows.push(rowHtml)
    }

    bodyParts.push('  <table class="tpl-table">\n' + tableRows.join('\n') + '\n  </table>')
  }

  const bodyContent = bodyParts.length > 0 ? '\n\n' + bodyParts.join('\n\n') + '\n\n' : '\n\n'

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">

<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>

<body>${bodyContent}</body>

</html>
`
}
