import eruda from "eruda"

// defer init until after dom/react mount so AR camera can initialize first
requestAnimationFrame(() => eruda.init())

// preload background images immediately to reduce paint flash on load
;(function preloadBackgrounds() {
  const urls = ["/cyber-background.png", "/cyber-background-desktop.png"]
  for (const url of urls) {
    const img = new Image()
    img.src = url
  }
})()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
