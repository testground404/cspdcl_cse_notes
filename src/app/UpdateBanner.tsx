import { useEffect, useState } from 'react'
import { fetchLatestBuildId } from './latestBuild'

const CHECK_EVERY_MS = 5 * 60 * 1000

/**
 * Tells the reader when a newer version of the app has been published, because a page that stays
 * open (or is held in the browser's cache) otherwise keeps running old code.
 */
export function UpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null)

  useEffect(() => {
    if (__BUILD_ID__ === 'dev') return
    let active = true
    const check = async () => {
      const id = await fetchLatestBuildId()
      if (active && id && id !== __BUILD_ID__) setLatest(id)
    }
    void check()
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    const onVisible = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [])

  if (!latest) return null

  const reload = () => {
    // A changed address makes the browser fetch the page again instead of reusing its saved copy.
    const url = new URL(window.location.href)
    url.searchParams.set('v', latest)
    window.location.replace(url.toString())
  }

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-[13px] text-inverse shadow-xl"
    >
      A new version is available.
      <button
        type="button"
        onClick={reload}
        className="rounded-md bg-inverse px-2.5 py-1 text-[12px] font-semibold text-ink hover:opacity-85"
      >
        Reload
      </button>
    </div>
  )
}
