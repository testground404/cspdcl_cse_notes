import { useState, type FormEvent } from 'react'

export function AddForm({
  placeholder,
  buttonLabel,
  onAdd,
}: {
  placeholder: string
  buttonLabel: string
  onAdd: (name: string) => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd(name)
    setName('')
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </form>
  )
}
