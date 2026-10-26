import React from 'react';
import { createRoot } from 'react-dom/client';
import { StartupErrorBoundary } from './components/StartupErrorBoundary';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Renderer root element is missing');
createRoot(root).render(<React.StrictMode><StartupErrorBoundary><App /></StartupErrorBoundary></React.StrictMode>);
