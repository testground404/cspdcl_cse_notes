import { describe, expect, test } from 'vitest'
import { toggleHighlight, wrapSelection } from './editing'

test('toggleHighlight wraps a selection and unwraps it again', () => {
  const wrapped = toggleHighlight('the convoy effect', 4, 10)
  expect(wrapped.text).toBe('the ==convoy== effect')
  expect(wrapped.text.slice(wrapped.start, wrapped.end)).toBe('convoy')
  const unwrapped = toggleHighlight(wrapped.text, wrapped.start, wrapped.end)
  expect(unwrapped.text).toBe('the convoy effect')
  expect(unwrapped.text.slice(unwrapped.start, unwrapped.end)).toBe('convoy')
})

describe('wrapSelection', () => {
  const note = 'The model learns. The model is a function.\n\nA second model appears here.'

  test('wraps text that occurs once', () => {
    expect(wrapSelection(note, 'function', 'The model is a ', '==')).toBe(
      'The model learns. The model is a ==function==.\n\nA second model appears here.',
    )
  })

  test('uses the words before the selection to pick between repeats', () => {
    expect(wrapSelection(note, 'model', 'A second ', '==')).toBe(
      'The model learns. The model is a function.\n\nA second ==model== appears here.',
    )
    expect(wrapSelection(note, 'model', 'learns. The ', '**')).toContain('learns. The **model** is')
  })

  test('refuses when the place is still ambiguous or not found', () => {
    expect(wrapSelection(note, 'model', '', '==')).toBeNull()
    expect(wrapSelection(note, 'absent words', 'The ', '==')).toBeNull()
    expect(wrapSelection(note, '   ', '', '==')).toBeNull()
  })

  test('copes with line breaks, curly quotes and regex characters', () => {
    const src = 'He said "yes" (maybe)\nand left.'
    expect(wrapSelection(src, '\u201cyes\u201d (maybe) and', 'He said ', '==')).toBe(
      'He said =="yes" (maybe)\nand== left.',
    )
  })
})
