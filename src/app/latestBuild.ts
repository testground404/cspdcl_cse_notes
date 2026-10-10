/** Asks the server which build is live. Returns null when it cannot be told. */
export async function fetchLatestBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!response.ok) return null
    const data = (await response.json()) as { id?: unknown }
    return typeof data.id === 'string' ? data.id : null
  } catch {
    return null
  }
}
