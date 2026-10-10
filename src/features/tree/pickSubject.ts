import type { Syllabus } from '../../app/useSyllabus'

/**
 * The subject whose contents the panel shows: the one the current page belongs to, otherwise
 * the one visited last (so the panel stays filled on pages like Highlights and Tests).
 */
export function pickSubject(
  syllabus: Syllabus,
  nodeId: string | null,
  lastId: string | null,
): string | null {
  const fromPage = syllabus.subjectOf(nodeId)?.id
  if (fromPage) return fromPage
  return lastId && syllabus.nodes.get(lastId)?.kind === 'subject' ? lastId : null
}
