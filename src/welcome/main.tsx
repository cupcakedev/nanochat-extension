import { createRoot } from 'react-dom/client';
import WelcomeApp from './WelcomeApp';
import '@sidepanel/styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root container not found');
createRoot(root).render(<WelcomeApp />);
