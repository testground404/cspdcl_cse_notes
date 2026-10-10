import { expect, test } from 'vitest'
import { toggleHighlight } from './editing'

test('toggleHighlight wraps a selection and unwraps it again', () => {
  const wrapped = toggleHighlight('the convoy effect', 4, 10)
  expect(wrapped.text).toBe('the ==convoy== effect')
  expect(wrapped.text.slice(wrapped.start, wrapped.end)).toBe('convoy')
  const unwrapped = toggleHighlight(wrapped.text, wrapped.start, wrapped.end)
  expect(unwrapped.text).toBe('the convoy effect')
  expect(unwrapped.text.slice(unwrapped.start, unwrapped.end)).toBe('convoy')
})
