import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react'

const CLOSE_DELAY_MS = 200

/**
 * A button with a floating panel. The panel opens on mouse hover, and on click, tap or keyboard so
 * it also works where there is no hover; it closes on Escape, an outside click or focus leaving.
 */
export function HoverPopover({
  id,
  label,
  buttonClassName,
  button,
  children,
  align = 'left',
}: {
  id: string
  /** Accessible name, for buttons that only show an icon. */
  label?: string
  buttonClassName: string
  button: (open: boolean) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const cancelClose = () => window.clearTimeout(timer.current)
  const closeSoon = () => {
    cancelClose()
    timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }
  useEffect(() => cancelClose, [])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        cancelClose()
        setOpen(true)
      }}
      onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
      onBlur={(e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        // After hovering, a mouse click should not slam the panel shut again.
        onClick={(e) =>
          (e.nativeEvent as PointerEvent).pointerType === 'mouse'
            ? setOpen(true)
            : setOpen((o) => !o)
        }
        className={buttonClassName}
      >
        {button(open)}
      </button>
      {open && (
        <div
          id={id}
          className={`absolute top-full z-40 pt-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
