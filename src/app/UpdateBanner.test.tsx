import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fetchLatestBuildId } from './latestBuild'
import { UpdateBanner } from './UpdateBanner'

afterEach(() => vi.unstubAllGlobals())

const serve = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => body }))

describe('UpdateBanner', () => {
  test('asks the server for the live build without using the cache', async () => {
    serve({ id: 'abc1234' })
    expect(await fetchLatestBuildId()).toBe('abc1234')
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('version.json?t=')
    expect(options).toMatchObject({ cache: 'no-store' })
  })

  test('returns null when the answer is missing or unusable', async () => {
    serve({}, false)
    expect(await fetchLatestBuildId()).toBeNull()
    serve({ id: 7 })
    expect(await fetchLatestBuildId()).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchLatestBuildId()).toBeNull()
  })

  test('shows a banner when a different build is live', async () => {
    serve({ id: 'a-newer-build' })
    render(<UpdateBanner />)
    expect(await screen.findByText(/new version is available/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  test('stays hidden when this is the live build', async () => {
    serve({ id: __BUILD_ID__ })
    render(<UpdateBanner />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
