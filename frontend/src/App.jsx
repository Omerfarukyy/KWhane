// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeProvider'
import { LanguageProvider } from './contexts/LanguageProvider'
import { Toaster } from 'react-hot-toast'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Toaster
              position="top-center"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#111111',
                  color: '#ffffff',
                  border: '1px solid #1e1e1e',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                },
                success: {
                  iconTheme: { primary: '#3b82f6', secondary: '#ffffff' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
                },
              }}
            />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
