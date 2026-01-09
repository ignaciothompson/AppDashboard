import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('Bootstrap error:', err);
    document.body.innerHTML = `
      <div style="color: red; padding: 20px; font-family: monospace; background: #111;">
        <h1>Application Failed to Start</h1>
        <p>${err?.message || err}</p>
        <pre>${err?.stack || ''}</pre>
      </div>
    `;
  });

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  // Optionally display this too if the app hasn't loaded
  if (!document.querySelector('app-root')?.children.length) {
       document.body.innerHTML += `
      <div style="color: orange; padding: 20px; font-family: monospace; border-top: 1px solid #333; background: #111;">
        <h2>Unhandled Rejection</h2>
        <p>${event.reason?.message || event.reason}</p>
      </div>
    `;
  }
});
