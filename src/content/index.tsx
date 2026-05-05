import { createRoot } from 'react-dom/client';
import { ContentApp } from './app/ContentApp';

const ROOT_ID = 'nanochat-content-react-root';

const existing = document.getElementById(ROOT_ID);
if (existing) {
  createRoot(existing).render(<ContentApp />);
} else {
  const rootEl = document.createElement('div');
  rootEl.id = ROOT_ID;
  rootEl.style.display = 'contents';
  document.documentElement.appendChild(rootEl);
  createRoot(rootEl).render(<ContentApp />);
}
