import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './gaya.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA: service worker hanya di hasil build, supaya saat pengembangan tidak ada cache basi.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
