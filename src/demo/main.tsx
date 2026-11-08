import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import '../App.css';
import { DemoApp } from './DemoApp';

const rootElement = document.getElementById('demo-root') || document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <DemoApp />
    </StrictMode>
  );
}
