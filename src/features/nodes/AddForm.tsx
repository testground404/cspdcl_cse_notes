import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ui } from '../../ui/styles'

/** A quiet "+ Add …" link that turns into a one-line form. */
export function AddForm({
  label,
  placeholder,
  onAdd,
}: {
  label: string
  placeholder: string
  onAdd: (name: string) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd(name)
    setName('')
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${ui.button} text-muted hover:text-ink`}
      >
        <Plus size={15} /> {label}
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="flex max-w-xl gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setName('')
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={ui.input}
      />
      <button type="submit" disabled={!name.trim()} className={ui.primary}>
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)} className={ui.button}>
        Done
      </button>
    </form>
  )
}
