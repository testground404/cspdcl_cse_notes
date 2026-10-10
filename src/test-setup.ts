import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

afterEach(cleanup)
