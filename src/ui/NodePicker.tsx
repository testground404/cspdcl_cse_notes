import type { NodeKind } from '../db/db'
import type { Syllabus } from '../app/useSyllabus'
import { ui } from './styles'

/** A select listing the syllabus in tree order, indented by depth. */
export function NodePicker({
  syllabus,
  value,
  onChange,
  noneLabel,
  kinds,
  id,
}: {
  syllabus: Syllabus
  value: string | null
  onChange: (id: string | null) => void
  noneLabel: string
  kinds?: NodeKind[]
  id?: string
}) {
  const options = syllabus.ordered.filter((n) => !kinds || kinds.includes(n.kind))
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={ui.input}
    >
      <option value="">{noneLabel}</option>
      {options.map((n) => (
        <option key={n.id} value={n.id}>
          {'   '.repeat(syllabus.path(n.id).length - 1)}
          {n.name}
        </option>
      ))}
    </select>
  )
}
