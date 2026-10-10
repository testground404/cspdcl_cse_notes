export type DiagramTheme = 'light' | 'dark'

type Mermaid = typeof import('mermaid').default

// Mermaid is large, so it is only downloaded when a note actually contains a diagram.
let loading: Promise<Mermaid> | null = null
const load = () => (loading ??= import('mermaid').then((m) => m.default))

const cache = new Map<string, string>()
let counter = 0
let queue: Promise<unknown> = Promise.resolve()

const VARIABLES: Record<DiagramTheme, Record<string, string>> = {
  light: {
    background: '#ffffff',
    primaryColor: '#f7f7f7',
    primaryTextColor: '#171717',
    primaryBorderColor: '#171717',
    secondaryColor: '#efefef',
    tertiaryColor: '#f7f7f7',
    lineColor: '#737373',
    textColor: '#171717',
    clusterBkg: '#fafafa',
    clusterBorder: '#a3a3a3',
    edgeLabelBackground: '#ffffff',
  },
  dark: {
    background: '#0f0f0f',
    primaryColor: '#1c1c1c',
    primaryTextColor: '#ededed',
    primaryBorderColor: '#a3a3a3',
    secondaryColor: '#222222',
    tertiaryColor: '#161616',
    lineColor: '#8f8f8f',
    textColor: '#ededed',
    clusterBkg: '#141414',
    clusterBorder: '#444444',
    edgeLabelBackground: '#0f0f0f',
  },
}

/**
 * Turns every `.mermaid-diagram` inside root into an SVG. Diagrams drawn before (same source
 * and theme) are filled in immediately; new ones are drawn one at a time in the background.
 * If a diagram cannot be drawn its source stays visible.
 */
export function renderDiagrams(root: HTMLElement, theme: DiagramTheme): Promise<void> {
  const pending: { el: HTMLElement; source: string }[] = []
  for (const el of root.querySelectorAll<HTMLElement>('.mermaid-diagram')) {
    const source = decodeURIComponent(el.dataset.mermaid ?? '')
    const cached = cache.get(`${theme}\n${source}`)
    if (cached) el.innerHTML = cached
    else pending.push({ el, source })
  }
  if (!pending.length) return Promise.resolve()

  queue = queue.then(async () => {
    const mermaid = await load()
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: VARIABLES[theme],
      fontFamily: "'Inter Variable', system-ui, sans-serif",
    })
    for (const { el, source } of pending) {
      if (!el.isConnected) continue
      const id = `mermaid-${counter++}`
      try {
        const { svg } = await mermaid.render(id, source)
        cache.set(`${theme}\n${source}`, svg)
        if (el.isConnected) el.innerHTML = svg
      } catch {
        el.classList.add('mermaid-error')
        // Failed renders can leave a stray element behind.
        document.getElementById(`d${id}`)?.remove()
        document.getElementById(id)?.remove()
      }
    }
  })
  return queue as Promise<void>
}
