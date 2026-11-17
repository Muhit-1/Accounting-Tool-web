import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth-context'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTheme, getThemeKey } from './lib/theme-store'
import { ToastProvider } from './components/ToastProvider'

// The person's theme goes on the page before anything is drawn (Mint ledger when they never chose one).
applyTheme(getThemeKey())

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
