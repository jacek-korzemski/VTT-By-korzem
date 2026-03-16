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
    const formula = escapeHtml((cell.rollFormula || '').trim())
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
  <meta name="vtt-template" content="editor;v=1">
  <title>${title}</title>
</head>

<body>${bodyContent}</body>

</html>
`
}

/**
 * Detect template kind from HTML (editor vs custom) using vtt-template meta.
 * @param {string} html - Full HTML document or fragment
 * @returns {'editor' | 'custom' | 'custom-clone'}
 */
export function detectTemplateKind(html) {
  if (typeof html !== 'string') return 'custom'
  const metaMatch = html.match(/<meta[^>]+name=["']vtt-template["'][^>]*content=["']([^"']*)["']/i)
  if (!metaMatch) return 'custom'
  const content = (metaMatch[1] || '').trim().toLowerCase()
  const parts = content.split(';').map((p) => p.trim())
  const hasEditor = parts.includes('editor')
  const fromCustomClone = parts.some((p) => p.startsWith('source=') && p.includes('custom-clone'))
  if (hasEditor && fromCustomClone) return 'custom-clone'
  if (hasEditor) return 'editor'
  return 'custom'
}

/**
 * Parse HTML (from templateModelToHtml or similar) into editor model.
 * Expects tables with class tpl-table, section-header row, and cells with data-field / data-roll.
 * @param {string} html - Full HTML document or fragment
 * @returns {{ templateName: string, sections: Array<{ title: string, emoji?: string, rows: Array<{ cells: Array<Object> }> }> } | null}
 */
export function htmlToModel(html) {
  if (typeof html !== 'string' || html.trim() === '') return null
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null
  if (!parser) return null
  const doc = parser.parseFromString(html, 'text/html')
  const tables = doc.querySelectorAll('table.tpl-table')
  if (!tables || tables.length === 0) return null

  const templateName =
    (doc.querySelector('title') && doc.querySelector('title').textContent.trim()) || 'Untitled template'
  const sections = []

  for (const table of tables) {
    const section = { title: 'Section', emoji: '', rows: [] }
    const trs = table.querySelectorAll('tr')
    if (trs.length === 0) continue

    const headerTr = trs[0]
    const headerTd = headerTr.querySelector('td.section-header')
    if (headerTd) {
      const raw = (headerTd.textContent || '').trim()
      const emojiMatch = raw.match(/^(\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+\s*)/u)
      if (emojiMatch) {
        section.emoji = emojiMatch[1].trim()
        section.title = raw.slice(emojiMatch[0].length).trim() || 'Section'
      } else {
        section.title = raw || 'Section'
      }
    }

    for (let i = 1; i < trs.length; i++) {
      const row = { cells: [] }
      const tds = trs[i].querySelectorAll('td')
      for (const td of tds) {
        const cell = parseCell(td)
        if (cell) row.cells.push(cell)
      }
      if (row.cells.length > 0) section.rows.push(row)
    }

    sections.push(section)
  }

  if (sections.length === 0) return null
  return { templateName, sections }
}

function parseCell(td) {
  const checkbox = td.querySelector('input[type="checkbox"][data-field]')
  if (checkbox) {
    const fieldId = (checkbox.getAttribute('data-field') || 'field').trim()
    const label = (td.textContent || '').trim()
    return { type: 'checkbox', label, fieldId }
  }

  const textarea = td.querySelector('textarea[data-field]')
  if (textarea) {
    const fieldId = (textarea.getAttribute('data-field') || 'field').trim()
    const strong = td.querySelector('strong')
    const label = strong ? (strong.textContent || '').trim() : ''
    const size = (textarea.getAttribute('class') || '').includes('wide') ? 'wide' : 'normal'
    return { type: 'textarea', label, fieldId, size, style: 'plain' }
  }

  const input = td.querySelector('input[type="text"][data-field]')
  const rollBtn = td.querySelector('button[data-roll]')
  if (input) {
    const fieldId = (input.getAttribute('data-field') || 'field').trim()
    const strong = td.querySelector('strong')
    const label = strong ? (strong.textContent || '').trim() : ''
    const cls = input.getAttribute('class') || ''
    const size = cls.includes('wide') ? 'wide' : 'normal'
    let style = 'plain'
    if (cls.includes('box')) style = 'box'
    else if (cls.includes('circle')) style = 'circle'
    if (rollBtn) {
      const rollFormula = (rollBtn.getAttribute('data-roll') || '').trim()
      const rollLabel = (rollBtn.getAttribute('data-roll-label') || '').trim()
      return { type: 'textWithRoll', label, fieldId, rollFormula, rollLabel, size, style }
    }
    return { type: 'text', label, fieldId, size, style }
  }

  return null
}
