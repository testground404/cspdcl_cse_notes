/** Shared class names so buttons and inputs look the same everywhere. */
export const ui = {
  button:
    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent',
  primary:
    'inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-inverse hover:opacity-85 disabled:opacity-30',
  outline:
    'inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-hover disabled:opacity-40',
  input:
    'w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none',
  select:
    'rounded-md border border-line bg-canvas px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none',
  label: 'mb-1 block text-xs font-medium text-muted',
  sectionLabel: 'text-[11px] font-semibold tracking-[0.08em] text-muted uppercase',
  h1: 'text-2xl font-semibold tracking-tight text-ink',
  muted: 'text-sm text-muted',
}
