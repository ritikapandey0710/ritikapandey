import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import App from './App'
import { initSentry, SentryErrorBoundary } from './lib/sentry'

// Initialize Sentry error monitoring before rendering. No-op without DSN.
initSentry();

const queryClient = new QueryClient();

// Simple fallback UI shown when an uncaught React render error occurs.
const ErrorFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="text-center">
      <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">Please refresh the page.</p>
    </div>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </SentryErrorBoundary>
  </React.StrictMode>
)

