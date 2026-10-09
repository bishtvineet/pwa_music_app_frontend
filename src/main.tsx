import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker after initial paint so first launch is instant
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerSW({ immediate: false });
  });
}