import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter watches the address bar so App can pick the page to show. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
