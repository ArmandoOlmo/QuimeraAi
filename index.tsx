import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/main.css'; // Tailwind v4 + Theme (OKLCH from tweakcn)
import App from './App';
import './i18n'; // Inicializar i18next

// Help Center utilities (available in browser console for seeding)
import './utils/seedHelpArticles';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
