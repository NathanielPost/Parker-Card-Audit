import React from 'react';
import ReactDOM from 'react-dom/client';
import CardAudit from './components/CardAudit';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <CardAudit />
    </React.StrictMode>
  );
}
