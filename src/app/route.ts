import { useEffect, useState } from 'react'

export interface Route {
  nodeId: string | null
  subtopic: string | null
}

/** Hash routes work on GitHub Pages without server rewrites: #/n/<id>[/<subtopic>]. */
export function parseHash(hash: string): Route {
  const [, kind, id, subtopic] = hash.replace(/^#/, '').split('/')
  if (kind === 'n' && id) {
    return {
      nodeId: decodeURIComponent(id),
      subtopic: subtopic ? decodeURIComponent(subtopic) : null,
    }
  }
  return { nodeId: null, subtopic: null }
}

export function nodeHref(id: string, subtopic?: string): string {
  return `#/n/${encodeURIComponent(id)}${subtopic ? `/${encodeURIComponent(subtopic)}` : ''}`
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
