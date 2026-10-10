import { useRef } from 'react'
import { writeLocal } from '../../app/storage'
import { exportBackup, importBackup } from '../../db/repo'

export const LAST_BACKUP_KEY = 'last-backup-at'

export function useBackup() {
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
    writeLocal(LAST_BACKUP_KEY, backup.exportedAt)
  }

  const restore = async (file: File) => {
    if (!window.confirm('Restoring replaces ALL current data with the backup. Continue?')) return
    try {
      await importBackup(JSON.parse(await file.text()))
      window.location.hash = '#/'
      window.alert('Backup restored.')
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  const restoreInput = (
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
  )

  return { download, restoreInput, chooseRestoreFile: () => fileInput.current?.click() }
}
