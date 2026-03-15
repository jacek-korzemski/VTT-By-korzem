import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

// Lokalne debugowanie: gdy localStorage.dev_gm === '1', każdy request do API dostaje nagłówek X-Dev-GM
// (cookie dev_gm nie jest wysyłane przy cross-origin, np. Vite 5173 → API na innym porcie)
if (import.meta.env.DEV) {
  const apiPath = import.meta.env.VITE_API_PATH || 'api.php'
  const origFetch = window.fetch
  window.fetch = function (url, opts) {
    let finalOpts = opts || {}
    const urlStr = typeof url === 'string' ? url : (url && url.url)
    if (urlStr && urlStr.includes(apiPath) && localStorage.getItem('dev_gm') === '1') {
      finalOpts = { ...finalOpts, headers: { ...(finalOpts.headers || {}), 'X-Dev-GM': '1' } }
    }
    return origFetch.call(this, url, finalOpts)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)