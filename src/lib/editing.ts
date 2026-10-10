/** Wraps the textarea's selection in ==…== and returns the new text and cursor range. */
export function toggleHighlight(text: string, start: number, end: number) {
  const selected = text.slice(start, end)
  const before = text.slice(0, start)
  const after = text.slice(end)
  if (before.endsWith('==') && after.startsWith('==')) {
    return { text: before.slice(0, -2) + selected + after.slice(2), start: start - 2, end: end - 2 }
  }
  return { text: `${before}==${selected}==${after}`, start: start + 2, end: end + 2 }
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A regex source matching the text as it appears in Markdown (any spacing, straight or curly quotes). */
function looseSource(text: string): string {
  return escapeRegExp(text.replace(/\s+/g, ' '))
    .replace(/ /g, '\\s+')
    .replace(/['\u2018\u2019]/g, "['\u2018\u2019]")
    .replace(/["\u201c\u201d]/g, '["\u201c\u201d]')
}

/**
 * Wraps text the reader selected in the rendered note with Markdown markers (`==`, `**`, `*`,
 * backticks) in the note's source. The rendered text can occur several times in the source, so
 * the words just before the selection are used to find the right one. Returns null when the
 * place cannot be found with certainty, e.g. when the selection crosses formatting.
 */
export function wrapSelection(
  source: string,
  selected: string,
  before: string,
  open: string,
  close = open,
): string | null {
  const text = selected.replace(/\s+/g, ' ').trim()
  if (!text) return null
  const context = before.replace(/\s+/g, ' ')
  for (const length of [60, 30, 12, 0]) {
    const lead = context.slice(-length).trimStart()
    if (length > 0 && !lead) continue
    const pattern = new RegExp(`(${lead ? looseSource(lead) : ''})(${looseSource(text)})`, 'gd')
    const matches = [...source.matchAll(pattern)]
    const span = matches.length === 1 ? matches[0].indices?.[2] : undefined
    if (span) {
      const [start, end] = span
      return source.slice(0, start) + open + source.slice(start, end) + close + source.slice(end)
    }
    if (matches.length === 0 && length === 0) return null
  }
  return null
}
