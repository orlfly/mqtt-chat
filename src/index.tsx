import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress ResizeObserver loop error (benign browser-level warning)
const resizeObserverLoopError = 'ResizeObserver loop completed with undelivered notifications';
window.addEventListener('error', (e) => {
  if (e.message === resizeObserverLoopError || e.message?.includes?.(resizeObserverLoopError)) {
    e.stopImmediatePropagation();
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);