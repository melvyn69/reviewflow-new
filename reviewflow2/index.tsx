
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import GoogleOAuthCallback from './pages/oauth/google/callback';
import './src/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const isOAuthCallback = typeof window !== 'undefined' && (
  window.location.pathname === '/oauth/google/callback' ||
  (window.location.hash && window.location.hash.includes('/oauth/google/callback'))
);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isOAuthCallback ? <GoogleOAuthCallback /> : <App />}
  </React.StrictMode>
);
