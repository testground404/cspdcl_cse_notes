import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/jetbrains-mono'
import 'katex/dist/katex.min.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { applyStoredTheme } from './app/theme.ts'

applyStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
