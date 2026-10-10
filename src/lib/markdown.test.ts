import { describe, expect, test } from 'vitest'
import mlNote from '../seed/ml-definition-and-scope.md?raw'
import { extractHighlights, extractSubtopics, highlightId, renderMarkdown } from './markdown'

describe('extractSubtopics', () => {
  test('returns ## and ### headings with their level and skips code fences', () => {
    const src = [
      '# Title',
      '## FCFS',
      'text',
      '```',
      '## not a heading',
      '```',
      '### Deep',
      '#### Deeper',
      '## Round Robin ##',
    ].join('\n')
    expect(extractSubtopics(src).map((s) => [s.title, s.level])).toEqual([
      ['FCFS', 2],
      ['Deep', 3],
      ['Round Robin', 2],
    ])
  })

  test('duplicate headings get distinct ids that match the rendered page', () => {
    const src = '## Example\n\ntext\n\n## Example\n\n### Example'
    const slugs = extractSubtopics(src).map((s) => s.slug)
    expect(new Set(slugs).size).toBe(3)
    const html = renderMarkdown(src)
    for (const slug of slugs) expect(html).toContain(`id="${slug}"`)
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

describe('note format', () => {
  test('front matter is not rendered, listed or counted', () => {
    const src =
      '---\nid: U0.C1.T1\ntitle: Definition\nprerequisites: []\n---\n\n## Overview\n\n==key=='
    const html = renderMarkdown(src)
    expect(html).not.toContain('U0.C1.T1')
    expect(html).not.toContain('<hr')
    expect(extractSubtopics(src).map((s) => s.title)).toEqual(['Overview'])
    expect(extractHighlights(src).map((h) => h.text)).toEqual(['key'])
  })

  test('a leading horizontal rule that is not front matter is kept', () => {
    expect(renderMarkdown('---\n\nHello\n\n---\n\nWorld')).toContain('<hr')
  })

  test('"(c)" is not turned into a copyright sign', () => {
    expect(renderMarkdown('(a) one (c) two')).not.toContain('©')
  })

  test('mermaid blocks become diagram containers that keep their source', () => {
    const html = renderMarkdown('```mermaid\nflowchart LR\n  A --> B\n```')
    expect(html).toContain('class="mermaid-diagram"')
    expect(decodeURIComponent(html.match(/data-mermaid="([^"]*)"/)![1])).toBe(
      'flowchart LR\n  A --> B\n',
    )
    expect(html).toContain('A --&gt; B')
  })

  test('Q:/A: pairs hide the answer behind "Show answer"', () => {
    const html = renderMarkdown('Q: What is 2+2?\nA: **4**, obviously.')
    expect(html).toContain('<p>What is 2+2?</p>')
    expect(html).toContain('<details class="answer"><summary>Show answer</summary>')
    expect(html).toContain('<p><strong>4</strong>, obviously.</p>')
    expect(html).not.toContain('Q:')
  })

  test('callout Recall/Answer pairs are revealed on demand too', () => {
    const html = renderMarkdown('> **Recall:** What is T?\n> **Answer:** The task.')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('Recall:')
    expect(html).toMatch(/<details class="answer">[\s\S]*The task\./)
  })

  test('multiple-choice options are put on separate lines', () => {
    const html = renderMarkdown(
      'Q: [MCQ · Easy · 1 mark] Which? (a) Alpha (b) Beta (c) Gamma\nA: **(b)**. Beta.',
    )
    expect(html.match(/<br>/g)).toHaveLength(3)
    expect(html).toContain('(c) Gamma')
  })

  test('marks inside answers still line up with the extracted highlights', () => {
    const src = 'Q: why?\nA: because ==reasons==.\n\n==after=='
    const ids = extractHighlights(src).map((h) => highlightId(h.index))
    const html = renderMarkdown(src)
    expect(ids).toHaveLength(2)
    for (const id of ids) expect(html).toContain(`<mark id="${id}">`)
  })
})

describe('the Machine Learning placeholder note', () => {
  test('renders fully: no metadata, all diagrams, answers hidden, headings linked', () => {
    const html = renderMarkdown(mlNote)
    expect(html).not.toContain('critique_score')
    expect(html).not.toContain('©')
    expect(html.match(/class="mermaid-diagram"/g)).toHaveLength(3)
    expect(html.match(/<details class="answer">/g)).toHaveLength(
      (mlNote.match(/^A: /gm) ?? []).length + (mlNote.match(/^> \*\*Answer:\*\*/gm) ?? []).length,
    )
    const subtopics = extractSubtopics(mlNote)
    expect(subtopics.filter((s) => s.level === 2).map((s) => s.title)).toContain('Key concepts')
    expect(subtopics.map((s) => s.title)).toContain('The formal definition (Mitchell, 1997)')
    expect(new Set(subtopics.map((s) => s.slug)).size).toBe(subtopics.length)
    for (const s of subtopics) expect(html).toContain(`id="${s.slug}"`)
  })
})
