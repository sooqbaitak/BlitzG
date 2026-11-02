import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Keep old links such as /#/product/example working after switching to clean URLs.
// This runs before BrowserRouter reads the initial location and does not reload the page.
if (window.location.hash.startsWith('#/')) {
  const legacyRoute = new URL(window.location.hash.slice(1), window.location.origin);
  if (legacyRoute.origin === window.location.origin) {
    window.history.replaceState(null, '', `${legacyRoute.pathname}${legacyRoute.search}${legacyRoute.hash}`);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
