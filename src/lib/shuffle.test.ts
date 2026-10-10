import { expect, test } from 'vitest'
import { shuffle } from './shuffle'

test('shuffle keeps every item exactly once and does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5, 6]
  const out = shuffle(input)
  expect([...out].sort()).toEqual(input)
  expect(input).toEqual([1, 2, 3, 4, 5, 6])
})
