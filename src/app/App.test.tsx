import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('renders the app shell with the syllabus subjects', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'CSPDCL CSE Notes' })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Syllabus' })).toHaveTextContent(
    'Operating Systems',
  )
})
