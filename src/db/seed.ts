import syllabus from '../seed/syllabus.json'
import { db } from './db'
import { addKeyPoint, addNode, saveNote, saveQuestion } from './repo'

const EXAMPLE_NOTE = [
  'A short example note. Edit or delete it. Each `##` heading becomes a **subtopic** in the sidebar.',
  '',
  '## FCFS (First Come First Served)',
  '',
  '- Non-preemptive; processes run in arrival order.',
  '- Suffers from the ==convoy effect==: short jobs wait behind a long one.',
  '',
  '## Shortest Job First',
  '',
  '==SJF gives the minimum average waiting time== but can starve long jobs. Average waiting time:',
  '',
  '$$',
  String.raw`\bar{W} = \frac{1}{n}\sum_{i=1}^{n} W_i`,
  '$$',
  '',
  '## Round Robin',
  '',
  'Each process gets a time quantum $q$. With $n$ ready processes, no process waits more than $(n-1)q$.',
  '',
  '```c',
  'while (!queue_empty(q)) {',
  '    struct proc *p = dequeue(q);',
  '    run(p, QUANTUM);',
  '    if (!p->done) enqueue(q, p);',
  '}',
  '```',
  '',
].join('\n')

/** Fills an empty database with the syllabus subjects and one example topic. */
export async function seedIfEmpty() {
  await db.transaction('rw', [db.nodes, db.notes, db.keyPoints, db.questions], async () => {
    if ((await db.nodes.count()) > 0) return
    for (const name of syllabus.subjects) {
      const subject = await addNode(null, name)
      if (name === 'Operating Systems') {
        const unit = await addNode(subject.id, 'Unit 1: Process Management')
        const chapter = await addNode(unit.id, 'CPU Scheduling')
        const topic = await addNode(chapter.id, 'Scheduling Algorithms')
        await saveNote(topic.id, EXAMPLE_NOTE)
        await addKeyPoint('Round Robin with a very large quantum behaves like FCFS.', topic.id)
        await saveQuestion({
          nodeId: chapter.id,
          text: 'Which scheduling algorithm can cause starvation?',
          options: ['FCFS', 'Shortest Job First', 'Round Robin'],
          correct: 1,
          explanation: 'Long jobs may wait forever if shorter jobs keep arriving.',
        })
        await saveQuestion({
          nodeId: chapter.id,
          text: 'The convoy effect is associated with which algorithm?',
          options: ['FCFS', 'SJF', 'Round Robin', 'Priority'],
          correct: 0,
          explanation: 'Short processes queue up behind one long CPU-bound process.',
        })
      }
    }
  })
}
