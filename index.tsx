import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

try {
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
} catch (e) {
  console.error("Mount Error:", e);
  document.body.innerHTML = `<div style="color:red;padding:20px;">
    <h1>Failed to Start App</h1>
    <p>${e instanceof Error ? e.message : String(e)}</p>
  </div>`;
}