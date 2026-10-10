import { expect, test } from 'vitest'
import { highlightHref, nodeHref, parseHash } from './route'

test('parses every route and round-trips hrefs', () => {
  expect(parseHash('')).toEqual({ page: 'home' })
  expect(parseHash('#/highlights')).toEqual({ page: 'highlights' })
  expect(parseHash('#/tests')).toEqual({ page: 'tests' })
  expect(parseHash('#/tests/bank')).toEqual({ page: 'bank' })
  expect(parseHash(nodeHref('a b'))).toEqual({
    page: 'node',
    nodeId: 'a b',
    subtopic: null,
    highlight: null,
  })
  expect(parseHash(nodeHref('x', 'st-rr'))).toMatchObject({ subtopic: 'st-rr' })
  expect(parseHash(highlightHref('x', 3))).toMatchObject({ nodeId: 'x', highlight: 3 })
})
