if (typeof window !== 'undefined') {
  try {
    if (window.parent) {
      window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
    }
  } catch (_) {}

  // Responder a cualquier mensaje de verificación de disponibilidad
  window.addEventListener('message', (e) => {
    if (e.data && (e.data.type === 'PING' || e.data.type === 'CHECK_READY' || e.data.type === 'PREVIEW_PING')) {
      try {
        if (window.parent) {
          window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
        }
      } catch (_) {}
    }
  });
}

import {createRoot} from 'react-dom/client';
import App from './App';
import {ErrorBoundary} from './ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = createRoot(rootElement);

root.render(
  <div
    style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
    }}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </div>,
);

// Notificar también después del montaje de React
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try {
      if (window.parent) {
        window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
      }
    } catch (_) {}
  }, 50);
}
