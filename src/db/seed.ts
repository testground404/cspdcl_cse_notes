import syllabus from '../seed/syllabus.json'
import mlNote from '../seed/ml-definition-and-scope.md?raw'
import { readLocal, writeLocal } from '../app/storage'
import { db } from './db'
import { addKeyPoint, addNode, getChildren, saveNote, saveQuestion } from './repo'

/** Set once the Machine Learning example has been offered, so a deleted example stays deleted. */
const ML_EXAMPLE_KEY = 'seeded-ml-example'

/** Adds the Machine Learning example (subject → unit → chapter → topic) at the top of the list. */
async function addMlExample() {
  const subjects = await getChildren(null)
  const subject = await addNode(null, 'Machine Learning')
  if (subjects.length) await db.nodes.update(subject.id, { order: subjects[0].order - 1 })
  const unit = await addNode(subject.id, 'Unit 0')
  const chapter = await addNode(unit.id, 'Chapter 1')
  const topic = await addNode(chapter.id, 'Definition and scope')
  await saveNote(topic.id, mlNote)

  await addKeyPoint(
    'Learning = performance P on task T improves with experience E (Mitchell, 1997).',
    topic.id,
  )
  await addKeyPoint('Judge a model on unseen test data, never on its training data.', topic.id)

  const questions = [
    {
      text: 'Which of the following best describes machine learning?',
      options: [
        'Programs whose rules are written entirely by experts',
        'Programs that improve their performance at a task using data',
        'Any program that runs on a GPU',
        'Any program that stores data in a database',
      ],
      correct: 1,
      explanation:
        'The first option describes explicit programming; the last two mention hardware or storage, not learning from experience.',
    },
    {
      text: "In Mitchell's definition, which of the following is the performance measure P for a program that learns to filter spam?",
      options: [
        'The set of labelled emails it trains on',
        'The act of labelling an email',
        'The fraction of emails classified correctly on unseen emails',
        'The neural network used',
      ],
      correct: 2,
      explanation:
        'The labelled emails are the experience E; labelling an email is the task T; the network is the model family, which is not part of the definition.',
    },
    {
      text: 'A model has training accuracy 99 % and test accuracy 62 %. The most likely conclusion is:',
      options: [
        'It has generalised well',
        'It has probably memorised training examples and generalises poorly',
        'The test set is too small to be used',
        'Accuracy cannot be used as P',
      ],
      correct: 1,
      explanation:
        'A large gap between training and test performance is the signature of poor generalisation.',
    },
    {
      text: 'A retailer groups 10,000 customers by purchase history; no customer has been given a group label beforehand. Which statement is correct?',
      options: [
        'This is supervised learning, because the data are customer records',
        'E contains inputs only, so this is unsupervised learning and P cannot be accuracy against true groups',
        'T is predicting a price',
        'The test set is unnecessary because there are no labels',
      ],
      correct: 1,
      explanation:
        'Supervised learning needs correct outputs. Here there are none, and the structure found is judged by a measure such as group cohesion.',
    },
  ]
  for (const q of questions) await saveQuestion({ ...q, nodeId: topic.id })
}

/**
 * Fills an empty database with the placeholder subjects and the Machine Learning example. Existing
 * databases get the example once.
 */
export async function seedIfEmpty() {
  await db.transaction('rw', [db.nodes, db.notes, db.keyPoints, db.questions], async () => {
    if ((await db.nodes.count()) > 0) return
    for (const name of syllabus.subjects) await addNode(null, name)
    await addMlExample()
    writeLocal(ML_EXAMPLE_KEY, true)
  })

  if (readLocal(ML_EXAMPLE_KEY, false)) return
  writeLocal(ML_EXAMPLE_KEY, true)
  try {
    await db.transaction('rw', [db.nodes, db.notes, db.keyPoints, db.questions], addMlExample)
  } catch (error) {
    writeLocal(ML_EXAMPLE_KEY, false)
    throw error
  }
}
