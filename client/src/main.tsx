import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import App from './App'
import { initSentry, SentryErrorBoundary } from './lib/sentry'

// Initialize Sentry
initSentry()

// Theme initialization: detect system preference or use saved preference
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  }
}

// Initialize theme on initial load
initializeTheme()

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SentryErrorBoundary>
          <App />
        </SentryErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)