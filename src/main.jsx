import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './style.css'

// Register the PWA service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nuovo aggiornamento disponibile. Ricaricare?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App pronta per l'uso offline");
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
