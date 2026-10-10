import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { db, type Question } from '../../db/db'
import { deleteQuestion, saveQuestion, validateQuestion, type QuestionInput } from '../../db/repo'
import { renderInlineMarkdown } from '../../lib/markdown'
import type { Syllabus } from '../../app/useSyllabus'
import { NodePicker } from '../../ui/NodePicker'
import { ui } from '../../ui/styles'

const LETTERS = 'ABCDEF'
const MAX_OPTIONS = 6

const emptyQuestion = (nodeId: string | null): QuestionInput => ({
  nodeId,
  text: '',
  options: ['', '', '', ''],
  correct: 0,
  explanation: '',
})

function QuestionForm({
  syllabus,
  initial,
  editingId,
  onDone,
}: {
  syllabus: Syllabus
  initial: QuestionInput
  editingId?: string
  onDone: (lastNodeId: string | null) => void
}) {
  const [q, setQ] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  const setOption = (i: number, value: string) =>
    setQ({ ...q, options: q.options.map((o, j) => (j === i ? value : o)) })
  const removeOption = (i: number) =>
    setQ({
      ...q,
      options: q.options.filter((_, j) => j !== i),
      correct: q.correct === i ? 0 : q.correct > i ? q.correct - 1 : q.correct,
    })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = validateQuestion(q)
    if (problem) {
      setError(problem)
      return
    }
    await saveQuestion(q, editingId)
    setError(null)
    if (editingId) onDone(q.nodeId)
    else {
      // Keep the same scope so several questions for one chapter are quick to add.
      setQ(emptyQuestion(q.nodeId))
      setSavedCount((c) => c + 1)
    }
  }

  return (
    <form onSubmit={submit} className="mb-10 max-w-2xl space-y-4 rounded-lg border border-line p-5">
      <div>
        <label htmlFor="q-node" className={ui.label}>
          File under
        </label>
        <NodePicker
          id="q-node"
          syllabus={syllabus}
          value={q.nodeId}
          onChange={(nodeId) => setQ({ ...q, nodeId })}
          noneLabel="Not filed (general)"
        />
      </div>
      <div>
        <label htmlFor="q-text" className={ui.label}>
          Question
        </label>
        <textarea
          id="q-text"
          rows={3}
          autoFocus
          value={q.text}
          onChange={(e) => setQ({ ...q, text: e.target.value })}
          placeholder="Which scheduling algorithm can cause starvation?"
          className={ui.input}
        />
      </div>
      <fieldset>
        <legend className={ui.label}>Options (select the correct one)</legend>
        <div className="space-y-2">
          {q.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={q.correct === i}
                onChange={() => setQ({ ...q, correct: i })}
                aria-label={`Option ${LETTERS[i]} is correct`}
                className="accent-[var(--ink)]"
              />
              <span className="w-4 text-xs text-muted">{LETTERS[i]}</span>
              <input
                value={option}
                onChange={(e) => setOption(i, e.target.value)}
                aria-label={`Option ${LETTERS[i]}`}
                className={ui.input}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={q.options.length <= 2}
                aria-label={`Remove option ${LETTERS[i]}`}
                className="p-1 text-muted hover:text-ink disabled:invisible"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        {q.options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => setQ({ ...q, options: [...q.options, ''] })}
            className={`${ui.button} mt-1 text-muted`}
          >
            <Plus size={14} /> Option
          </button>
        )}
      </fieldset>
      <div>
        <label htmlFor="q-expl" className={ui.label}>
          Explanation (optional, shown after answering)
        </label>
        <textarea
          id="q-expl"
          rows={2}
          value={q.explanation}
          onChange={(e) => setQ({ ...q, explanation: e.target.value })}
          className={ui.input}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button type="submit" className={ui.primary}>
          {editingId ? 'Save changes' : 'Add question'}
        </button>
        <button type="button" onClick={() => onDone(q.nodeId)} className={ui.button}>
          {editingId ? 'Cancel' : 'Done'}
        </button>
        {savedCount > 0 && !editingId && (
          <span key={savedCount} className="fade-out text-xs text-muted">
            Added
          </span>
        )}
      </div>
      <p className="text-xs text-muted">
        Markdown, math ($x^2$) and `code` work in questions and options.
      </p>
    </form>
  )
}

function QuestionRow({
  q,
  syllabus,
  onEdit,
}: {
  q: Question
  syllabus: Syllabus
  onEdit: () => void
}) {
  return (
    <li className="group border-b border-line py-4 last:border-0">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="mb-2 text-[15px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(q.text) }}
          />
          <ol className="space-y-0.5 text-sm">
            {q.options.map((o, i) => (
              <li key={i} className={i === q.correct ? 'font-semibold' : 'text-muted'}>
                {LETTERS[i]}. <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(o) }} />
                {i === q.correct && ' ✓'}
              </li>
            ))}
          </ol>
          <div className="mt-2 text-xs text-muted">{syllabus.label(q.nodeId) || 'Not filed'}</div>
        </div>
        <div className="flex shrink-0 gap-1 self-start opacity-60 group-hover:opacity-100">
          <button type="button" onClick={onEdit} className={`${ui.button} text-xs`}>
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this question?')) void deleteQuestion(q.id)
            }}
            className={`${ui.button} text-xs`}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}

export function QuestionBankPage({ syllabus }: { syllabus: Syllabus }) {
  const questions = useLiveQuery(() => db.questions.orderBy('createdAt').reverse().toArray(), [])
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [form, setForm] = useState<{ id?: string; initial: QuestionInput } | null>(null)
  const [lastNodeId, setLastNodeId] = useState<string | null>(null)
  if (!questions) return null

  const shown = questions.filter(
    (q) => !subjectId || syllabus.subjectOf(q.nodeId)?.id === subjectId,
  )

  return (
    <div className="max-w-3xl">
      <nav className="mb-2 text-xs text-muted">
        <a href="#/tests" className="hover:text-ink">
          Tests
        </a>{' '}
        › Question bank
      </nav>
      <h1 className={`${ui.h1} mb-2`}>Question bank</h1>
      <p className={`${ui.muted} mb-6`}>
        Your own multiple-choice questions. Tests are drawn from here.
      </p>

      {form ? (
        <QuestionForm
          key={form.id ?? 'new'}
          syllabus={syllabus}
          initial={form.initial}
          editingId={form.id}
          onDone={(nodeId) => {
            setLastNodeId(nodeId)
            setForm(null)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setForm({ initial: emptyQuestion(lastNodeId ?? subjectId) })}
          className={`${ui.primary} mb-8`}
        >
          <Plus size={15} /> Add question
        </button>
      )}

      <div className="mb-2 flex items-center gap-3">
        <select
          aria-label="Subject"
          value={subjectId ?? ''}
          onChange={(e) => setSubjectId(e.target.value || null)}
          className={ui.select}
        >
          <option value="">All subjects</option>
          {(syllabus.children.get(null) ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted tabular-nums">
          {shown.length} question{shown.length === 1 ? '' : 's'}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className={`${ui.muted} mt-6`}>No questions yet.</p>
      ) : (
        <ul>
          {shown.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              syllabus={syllabus}
              onEdit={() => {
                setForm({ id: q.id, initial: q })
                window.scrollTo({ top: 0 })
                document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
