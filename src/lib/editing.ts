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
