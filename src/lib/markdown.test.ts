import { describe, expect, test } from 'vitest'
import { extractHighlights, extractSubtopics, highlightId, renderMarkdown } from './markdown'

describe('extractSubtopics', () => {
  test('returns ## headings and skips code fences and other levels', () => {
    const src = [
      '# Title',
      '## FCFS',
      'text',
      '```',
      '## not a heading',
      '```',
      '### Deep',
      '## Round Robin ##',
    ].join('\n')
    expect(extractSubtopics(src).map((s) => s.title)).toEqual(['FCFS', 'Round Robin'])
  })

  test('slugs match the ids in the rendered HTML', () => {
    const src = '## Shortest Job First (SJF)\n\nbody'
    const [sub] = extractSubtopics(src)
    expect(renderMarkdown(src)).toContain(`id="${sub.slug}"`)
  })
})

describe('renderMarkdown', () => {
  test('renders math and highlighted code', () => {
    const html = renderMarkdown('$x^2$\n\n```c\nint x = 1;\n```')
    expect(html).toContain('katex')
    expect(html).toContain('hljs')
  })

  test('does not render raw HTML or scripts', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
  })
})

describe('highlights', () => {
  test('extracts ==marked== text with its subtopic, skipping code', () => {
    const src = [
      'Intro ==first point==.',
      '',
      '## Round Robin',
      '',
      'Uses a ==time quantum $q$== and',
      '`==not this==`',
      '',
      '```',
      '==nor this==',
      '```',
    ].join('\n')
    const hl = extractHighlights(src)
    expect(hl.map((h) => h.text)).toEqual(['first point', 'time quantum $q$'])
    expect(hl[0].subtopic).toBeNull()
    expect(hl[1].subtopic?.title).toBe('Round Robin')
  })

  test('rendered marks carry ids matching the extraction order', () => {
    const src = '==a== text ==b==\n\n## S\n\n==c=='
    const html = renderMarkdown(src)
    const ids = extractHighlights(src).map((h) => highlightId(h.index))
    for (const id of ids) expect(html).toContain(`<mark id="${id}">`)
    expect(ids).toHaveLength(3)
  })
})
