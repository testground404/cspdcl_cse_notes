import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'
import type { SyllabusNode } from '../../db/db'
import { buildSyllabus } from '../../app/useSyllabus'
import { pickSubject } from './pickSubject'
import { TreePanel } from './TreePanel'

const node = (
  id: string,
  parentId: string | null,
  kind: SyllabusNode['kind'],
  order = 0,
): SyllabusNode => ({
  id,
  parentId,
  kind,
  name: id,
  order,
})
const syllabus = buildSyllabus([
  node('OS', null, 'subject'),
  node('DBMS', null, 'subject', 1),
  node('Unit 1', 'OS', 'unit'),
  node('Scheduling', 'Unit 1', 'chapter'),
  node('Round Robin', 'Scheduling', 'topic'),
  node('Unit 2', 'OS', 'unit', 1),
  node('Memory', 'Unit 2', 'chapter'),
  node('Paging', 'Memory', 'topic'),
])

beforeEach(() => localStorage.clear())

describe('pickSubject', () => {
  test('uses the page, else the last visited subject, else nothing', () => {
    expect(pickSubject(syllabus, 'Round Robin', 'DBMS')).toBe('OS')
    expect(pickSubject(syllabus, null, 'DBMS')).toBe('DBMS')
    expect(pickSubject(syllabus, null, 'Round Robin')).toBeNull()
    expect(pickSubject(syllabus, null, 'deleted')).toBeNull()
    expect(pickSubject(syllabus, null, null)).toBeNull()
  })
})

describe('TreePanel', () => {
  const at = (nodeId: string) => ({
    page: 'node' as const,
    nodeId,
    subtopic: null,
    highlight: null,
  })

  test('shows the subject’s units, chapters and topics and marks the open topic', () => {
    render(<TreePanel route={at('Round Robin')} syllabus={syllabus} />)
    const panel = screen.getByRole('complementary', { name: 'Subject contents' })
    for (const name of [
      'OS',
      'Unit 1',
      'Scheduling',
      'Round Robin',
      'Unit 2',
      'Memory',
      'Paging',
    ]) {
      expect(within(panel).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(panel).queryByRole('link', { name: 'DBMS' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Round Robin' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('a unit can be folded away and opened again', () => {
    render(<TreePanel route={at('Round Robin')} syllabus={syllabus} />)
    const panel = screen.getByRole('complementary', { name: 'Subject contents' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse Unit 2' }))
    expect(within(panel).queryByRole('link', { name: 'Memory' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Scheduling' })).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Expand Unit 2' }))
    expect(within(panel).getByRole('link', { name: 'Memory' })).toBeInTheDocument()
  })

  test('opening a topic inside a folded unit unfolds it', () => {
    const { rerender } = render(<TreePanel route={at('Round Robin')} syllabus={syllabus} />)
    const panel = screen.getByRole('complementary', { name: 'Subject contents' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse Unit 2' }))
    rerender(<TreePanel route={at('Paging')} syllabus={syllabus} />)
    expect(within(panel).getByRole('link', { name: 'Paging' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('stays filled on other pages using the last visited subject', () => {
    const { unmount } = render(<TreePanel route={at('Paging')} syllabus={syllabus} />)
    unmount()
    render(<TreePanel route={{ page: 'highlights' }} syllabus={syllabus} />)
    expect(screen.getByRole('link', { name: 'Unit 1' })).toBeInTheDocument()
  })

  test('asks for a subject when none has been visited', () => {
    render(<TreePanel route={{ page: 'home' }} syllabus={syllabus} />)
    expect(screen.getByText(/Choose a subject/)).toBeInTheDocument()
  })
})
