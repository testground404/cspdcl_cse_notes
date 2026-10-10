import { useEffect, useState } from 'react'

export type Route =
  | { page: 'home' }
  | { page: 'node'; nodeId: string; subtopic: string | null; highlight: number | null }
  | { page: 'highlights' }
  | { page: 'tests' }
  | { page: 'bank' }

/**
 * Hash routes work on GitHub Pages without server rewrites:
 * #/n/<id>[/<subtopic>] · #/n/<id>/hl/<index> · #/highlights · #/tests · #/tests/bank
 */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if (parts[0] === 'n' && parts[1]) {
    if (parts[2] === 'hl' && parts[3] && /^\d+$/.test(parts[3])) {
      return { page: 'node', nodeId: parts[1], subtopic: null, highlight: Number(parts[3]) }
    }
    return { page: 'node', nodeId: parts[1], subtopic: parts[2] || null, highlight: null }
  }
  if (parts[0] === 'highlights') return { page: 'highlights' }
  if (parts[0] === 'tests') return parts[1] === 'bank' ? { page: 'bank' } : { page: 'tests' }
  return { page: 'home' }
}

export function nodeHref(id: string, subtopic?: string): string {
  return `#/n/${encodeURIComponent(id)}${subtopic ? `/${encodeURIComponent(subtopic)}` : ''}`
}

export function highlightHref(topicId: string, index: number): string {
  return `#/n/${encodeURIComponent(topicId)}/hl/${index}`
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
