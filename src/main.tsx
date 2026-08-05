import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BrandingProvider } from '@/lib/branding';
import { ThemeProvider } from '@/lib/theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </ThemeProvider>
  </StrictMode>
);
