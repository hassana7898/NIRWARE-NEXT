import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { App } from './App';
import './index.css';
import { OfflineQueueManager } from './pwa/offline-queue';
import { api } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

// Sync offline mutations when online event fires
window.addEventListener('online', () => {
  OfflineQueueManager.processQueue(async (endpoint, opts) => {
    return api.post(endpoint, opts.body, opts.headers?.['Idempotency-Key']);
  }).then((res) => {
    if (res.syncedCount > 0) {
      queryClient.invalidateQueries();
    }
  });
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
