/* Temporary preview entry for visual checks. Deleted before reporting. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { LocalStorageAdapter } from '@/services/storage/StorageAdapter';
import '@/design-system/index.css';
import HomePage from './HomePage';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders storage={new LocalStorageAdapter()}>
        <HomePage />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
