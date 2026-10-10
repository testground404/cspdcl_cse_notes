import { describe, expect, test } from 'vitest'
import { extractSubtopics, renderMarkdown } from './markdown'

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
