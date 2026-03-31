import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useThemeStore } from './stores/themeStore'

// Initialize theme class before first render
const savedTheme = useThemeStore.getState().theme
document.documentElement.classList.toggle('dark', savedTheme === 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
