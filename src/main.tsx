import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {AuthProvider} from './lib/AuthContext';
import {ErrorBoundary} from './components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// Global error filter to trap and swallow Google Maps authentication and CORS cross-origin script errors
if (typeof window !== 'undefined') {
  // 1. Capture phase listener to stop propagation immediately before other platform script listeners hear about it
  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    const filename = String(event.filename || '');
    
    const isGoogleMapsError = 
      msg.includes('Google Maps') || 
      msg.includes('gm_authFailure') ||
      msg.includes('RefererNotAllowedMapError') ||
      filename.includes('googleapis.com') ||
      filename.includes('google.com/maps') ||
      (msg === 'Script error.' && (!filename || filename.includes('googleapis') || filename.includes('google')));

    if (isGoogleMapsError) {
      console.warn('⚠️ Intercepted Google Maps error during capture phase:', msg);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  // 2. Standard window.onerror handler
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msgStr = String(message || '');
    const srcStr = String(source || '');
    
    const isGoogleMapsError = 
      msgStr.includes('Google Maps') || 
      msgStr.includes('gm_authFailure') ||
      msgStr.includes('RefererNotAllowedMapError') ||
      srcStr.includes('googleapis.com') ||
      srcStr.includes('google.com/maps') ||
      (msgStr === 'Script error.' && (!srcStr || srcStr.includes('googleapis') || srcStr.includes('google')));

    if (isGoogleMapsError) {
      console.warn('⚠️ Swallowed Google Maps window.onerror:', msgStr);
      return true; // Swallows error completely
    }

    if (originalOnError) {
      return originalOnError.apply(window, [message, source, lineno, colno, error]);
    }
    return false;
  };

  // 3. Unhandled rejection trapping
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = reason ? String(reason.message || reason) : '';
    const stackStr = reason && reason.stack ? String(reason.stack) : '';

    if (
      reasonStr.includes('Google Maps') ||
      reasonStr.includes('RefererNotAllowedMapError') ||
      stackStr.includes('googleapis.com') ||
      stackStr.includes('google.com')
    ) {
      console.warn('⚠️ Swallowed Google Maps unhandled Promise rejection:', reasonStr);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

