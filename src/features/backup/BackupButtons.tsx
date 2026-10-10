import { useRef } from 'react'
import { exportBackup, importBackup } from '../../db/repo'

const btn =
  'rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'

export const LAST_BACKUP_KEY = 'last-backup-at'

export function BackupButtons() {
  const fileInput = useRef<HTMLInputElement>(null)

  const download = async () => {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cspdcl-notes-backup-${backup.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    try {
      localStorage.setItem(LAST_BACKUP_KEY, backup.exportedAt)
    } catch {
      // ignore
    }
  }

  const restore = async (file: File) => {
    if (!window.confirm('Restoring replaces ALL current notes with the backup. Continue?')) return
    try {
      await importBackup(JSON.parse(await file.text()))
      window.location.hash = '#/'
      window.alert('Backup restored.')
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  return (
    <div className="flex gap-2">
      <button type="button" className={btn} onClick={download} title="Download all notes as a file">
        Backup
      </button>
      <button type="button" className={btn} onClick={() => fileInput.current?.click()}>
        Restore
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void restore(file)
        }}
      />
    </div>
  )
}
