import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OwnerGate } from './OwnerGate.tsx';
import { ErrorBoundary } from '../src/ErrorBoundary.tsx';
import './styles.css';
const root = document.getElementById('root');
if (!root) throw new Error('Admin root is missing.');
createRoot(root).render(<StrictMode><ErrorBoundary><OwnerGate/></ErrorBoundary></StrictMode>);
