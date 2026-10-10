import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Question, type TestAnswer } from '../../db/db'
import { getQuestionsInScope, saveAttempt } from '../../db/repo'
import { renderInlineMarkdown } from '../../lib/markdown'
import { shuffle } from '../../lib/shuffle'
import type { Syllabus } from '../../app/useSyllabus'
import { NodePicker } from '../../ui/NodePicker'
import { ui } from '../../ui/styles'

const LETTERS = 'ABCDEF'
const COUNTS = [5, 10, 20, 50]

interface Run {
  scopeId: string | null
  scopeName: string
  startedAt: number
  questions: Question[]
  answers: TestAnswer[]
}

function Setup({ syllabus, onStart }: { syllabus: Syllabus; onStart: (run: Run) => void }) {
  const [scopeId, setScopeId] = useState<string | null>(null)
  const [count, setCount] = useState(10)
  const available = useLiveQuery(async () => (await getQuestionsInScope(scopeId)).length, [scopeId])
  const total = available

  const start = async () => {
    const pool = await getQuestionsInScope(scopeId)
    if (!pool.length) return
    onStart({
      scopeId,
      scopeName: scopeId ? (syllabus.nodes.get(scopeId)?.name ?? 'Deleted') : 'All subjects',
      startedAt: Date.now(),
      questions: shuffle(pool).slice(0, count),
      answers: [],
    })
  }

  return (
    <section className="mb-12 max-w-xl space-y-4">
      <div>
        <label htmlFor="t-scope" className={ui.label}>
          Questions from
        </label>
        <NodePicker
          id="t-scope"
          syllabus={syllabus}
          value={scopeId}
          onChange={setScopeId}
          noneLabel="All subjects"
        />
      </div>
      <div>
        <span className={ui.label}>Number of questions</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Number of questions">
          {COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={count === c}
              onClick={() => setCount(c)}
              className={`rounded-md border px-3 py-1 text-sm tabular-nums ${
                count === c ? 'border-ink bg-ink text-inverse' : 'border-line hover:bg-hover'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={start} disabled={!total} className={ui.primary}>
          Start test
        </button>
        <span className="text-xs text-muted">
          {total === undefined
            ? ''
            : total === 0
              ? 'No questions here yet.'
              : `${Math.min(count, total)} of ${total} available question${total === 1 ? '' : 's'}`}
        </span>
      </div>
      {total === 0 && (
        <p className={ui.muted}>
          Add questions in the{' '}
          <a href="#/tests/bank" className="underline">
            question bank
          </a>{' '}
          first.
        </p>
      )}
    </section>
  )
}

function Runner({ run, onFinish }: { run: Run; onFinish: (answers: TestAnswer[]) => void }) {
  const [answers, setAnswers] = useState<TestAnswer[]>([])
  const index = answers.length
  const [chosen, setChosen] = useState<number | null>(null)
  const q = run.questions[Math.min(index, run.questions.length - 1)]
  const answered = chosen !== null
  const last = index === run.questions.length - 1

  const next = () => {
    if (chosen === null) return
    const all = [...answers, { questionId: q.id, chosen, correct: chosen === q.correct }]
    setChosen(null)
    if (last) onFinish(all)
    else setAnswers(all)
  }

  return (
    <section className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3 text-xs text-muted">
        <span className="tabular-nums">
          Question {index + 1} of {run.questions.length}
        </span>
        <div className="h-0.5 flex-1 bg-line">
          <div
            className="h-full bg-ink transition-all"
            style={{ width: `${(index / run.questions.length) * 100}%` }}
          />
        </div>
      </div>
      <div
        className="mb-6 font-serif text-[19px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(q.text) }}
      />
      <ul className="mb-6 space-y-2">
        {q.options.map((o, i) => {
          const isCorrect = i === q.correct
          const isChosen = i === chosen
          let state = 'border-line hover:border-ink'
          if (answered) {
            if (isCorrect) state = 'border-ink bg-hover font-semibold'
            else if (isChosen) state = 'border-line text-muted line-through'
            else state = 'border-line text-muted'
          }
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setChosen(i)}
                className={`flex w-full items-baseline gap-3 rounded-lg border px-4 py-3 text-left text-[15px] ${state}`}
              >
                <span className="text-xs text-muted">{LETTERS[i]}</span>
                <span
                  className="flex-1"
                  dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(o) }}
                />
                {answered && isCorrect && <span className="text-xs">✓ Correct answer</span>}
                {answered && isChosen && !isCorrect && (
                  <span className="text-xs">✗ Your answer</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {answered && (
        <div className="space-y-4">
          <p className="font-medium">{chosen === q.correct ? 'Right.' : 'Not quite.'}</p>
          {q.explanation && (
            <div
              className="border-l-2 border-line pl-4 font-serif text-[15px] leading-relaxed text-muted"
              dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(q.explanation) }}
            />
          )}
          <button type="button" onClick={next} autoFocus className={ui.primary}>
            {last ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
    </section>
  )
}

function Results({
  run,
  answers,
  syllabus,
  onAgain,
}: {
  run: Run
  answers: TestAnswer[]
  syllabus: Syllabus
  onAgain: () => void
}) {
  const right = answers.filter((a) => a.correct).length
  const byId = new Map(run.questions.map((q) => [q.id, q]))
  const wrong = answers.filter((a) => !a.correct)
  return (
    <section className="max-w-2xl">
      <p className="mb-1 text-sm text-muted">{run.scopeName}</p>
      <p className="mb-8 text-4xl font-semibold tracking-tight tabular-nums">
        {right} / {answers.length}
        <span className="ml-3 text-base font-normal text-muted">
          {Math.round((right / answers.length) * 100)}%
        </span>
      </p>
      {wrong.length > 0 && (
        <>
          <h2 className={`${ui.sectionLabel} mb-3`}>To review</h2>
          <ul className="mb-8">
            {wrong.map((a) => {
              const q = byId.get(a.questionId)!
              return (
                <li key={a.questionId} className="border-b border-line py-3 last:border-0">
                  <div
                    className="mb-1 text-[15px]"
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(q.text) }}
                  />
                  <div className="text-sm">
                    <span className="text-muted">Answer: </span>
                    <span
                      className="font-semibold"
                      dangerouslySetInnerHTML={{
                        __html: renderInlineMarkdown(q.options[q.correct]),
                      }}
                    />
                  </div>
                  <div className="text-sm text-muted">
                    You chose:{' '}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: renderInlineMarkdown(q.options[a.chosen]),
                      }}
                    />
                  </div>
                  {q.nodeId && syllabus.nodes.has(q.nodeId) && (
                    <a
                      href={`#/n/${encodeURIComponent(q.nodeId)}`}
                      className="text-xs text-muted underline"
                    >
                      {syllabus.label(q.nodeId)}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
      <button type="button" onClick={onAgain} className={ui.primary}>
        New test
      </button>
    </section>
  )
}

function History() {
  const attempts = useLiveQuery(
    () => db.attempts.orderBy('finishedAt').reverse().limit(20).toArray(),
    [],
  )
  if (!attempts?.length) return null
  return (
    <section className="max-w-xl">
      <h2 className={`${ui.sectionLabel} mb-2`}>Past results</h2>
      <ul>
        {attempts.map((a) => {
          const right = a.answers.filter((x) => x.correct).length
          return (
            <li
              key={a.id}
              className="flex items-baseline gap-4 border-b border-line py-2 text-sm last:border-0"
            >
              <span className="flex-1 truncate">{a.scopeName}</span>
              <span className="text-xs text-muted">
                {new Date(a.finishedAt).toLocaleDateString()}
              </span>
              <span className="w-16 text-right tabular-nums">
                {right}/{a.answers.length}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function TestsPage({ syllabus }: { syllabus: Syllabus }) {
  const [run, setRun] = useState<Run | null>(null)
  const [finished, setFinished] = useState<TestAnswer[] | null>(null)

  const finish = async (answers: TestAnswer[]) => {
    if (!run) return
    await saveAttempt({
      scopeId: run.scopeId,
      scopeName: run.scopeName,
      startedAt: run.startedAt,
      finishedAt: Date.now(),
      answers,
    })
    setFinished(answers)
  }

  return (
    <div>
      <div className="mb-8 flex items-baseline gap-4">
        <h1 className={ui.h1}>{run && !finished ? 'Test' : 'Tests'}</h1>
        {run && !finished ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Stop this test? Your answers so far are not saved.')) setRun(null)
            }}
            className={`${ui.button} ml-auto text-muted`}
          >
            Stop
          </button>
        ) : (
          <a href="#/tests/bank" className="ml-auto text-sm text-muted hover:text-ink">
            Question bank →
          </a>
        )}
      </div>
      {!run ? (
        <>
          <Setup syllabus={syllabus} onStart={setRun} />
          <History />
        </>
      ) : finished ? (
        <Results
          run={run}
          answers={finished}
          syllabus={syllabus}
          onAgain={() => {
            setRun(null)
            setFinished(null)
          }}
        />
      ) : (
        <Runner key={run.startedAt} run={run} onFinish={finish} />
      )}
    </div>
  )
}
