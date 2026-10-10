import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'
import type { SyllabusNode } from '../../db/db'
import { buildSyllabus } from '../../app/useSyllabus'
import { TopBar } from './TopBar'

const subject = (id: string, order: number): SyllabusNode => ({
  id,
  parentId: null,
  kind: 'subject',
  name: id,
  order,
})
const syllabus = buildSyllabus([
  subject('OS', 0),
  subject('DBMS', 1),
  { id: 'Unit 1', parentId: 'OS', kind: 'unit', name: 'Unit 1', order: 0 },
])

beforeEach(() => localStorage.clear())

describe('TopBar', () => {
  test('has Notes, Test and Highlights in the middle and an account menu on the right', () => {
    render(<TopBar route={{ page: 'home' }} syllabus={syllabus} />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Highlights' })).toHaveAttribute(
      'href',
      '#/highlights',
    )
    expect(within(nav).getByRole('link', { name: 'Test' })).toHaveAttribute('href', '#/tests')
    expect(within(nav).getByRole('button', { name: 'Notes' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  test('marks the current section', () => {
    render(<TopBar route={{ page: 'bank' }} syllabus={syllabus} />)
    expect(screen.getByRole('link', { name: 'Test' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Highlights' })).not.toHaveAttribute('aria-current')
  })

  test('the account menu offers backup, restore and the theme toggle', () => {
    render(<TopBar route={{ page: 'home' }} syllabus={syllabus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Account and settings' }))
    const menu = document.getElementById('account-menu')!
    expect(within(menu).getByRole('button', { name: /Back up everything/ })).toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: /Restore a backup/ })).toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: /Dark mode|Light mode/ })).toBeInTheDocument()
  })

  test('the Notes menu lists only subjects, opens on click and closes on Escape', () => {
    render(<TopBar route={{ page: 'home' }} syllabus={syllabus} />)
    const button = screen.getByRole('button', { name: 'Notes' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById('notes-menu')!
    expect(within(menu).getByRole('link', { name: 'OS' })).toHaveAttribute('href', '#/n/OS')
    expect(within(menu).getByRole('link', { name: 'DBMS' })).toBeInTheDocument()
    expect(within(menu).queryByRole('link', { name: 'Unit 1' })).not.toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  test('choosing a subject closes the menu and marks the current subject', () => {
    render(
      <TopBar
        route={{ page: 'node', nodeId: 'Unit 1', subtopic: null, highlight: null }}
        syllabus={syllabus}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    const menu = document.getElementById('notes-menu')!
    expect(within(menu).getByRole('link', { name: 'OS' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(within(menu).getByRole('link', { name: 'DBMS' }))
    expect(document.getElementById('notes-menu')).toBeNull()
  })

  test('on a phone the menu button reveals the same links', () => {
    render(<TopBar route={{ page: 'home' }} syllabus={syllabus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const nav = screen.getByRole('navigation', { name: 'Main (mobile)' })
    expect(within(nav).getByRole('link', { name: 'Highlights' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Test' })).toBeInTheDocument()
  })
})
