import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// sync dark class from persisted store before first paint
try {
  const raw = localStorage.getItem('volleyvision-store')
  const parsed = raw ? JSON.parse(raw) : null
  const dark = parsed?.state?.darkMode ?? true
  document.documentElement.classList.toggle('dark', dark)
} catch {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
