// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeProvider'
import { LanguageProvider } from './contexts/LanguageProvider'
import { Toaster } from 'react-hot-toast'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

// ─── Auth guard — redirect to /auth if not logged in ────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#080808', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid rgba(59,130,246,0.2)',
          borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: '#555', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          Bağlanıyor…
        </span>
      </div>
    )
  }
  if (!user) return <Navigate to="/auth" replace />
  return children
}

const toastStyle = {
  background: '#111111',
  color: '#ffffff',
  border: '1px solid #1e1e1e',
  borderRadius: '0.75rem',
  padding: '1rem',
  fontSize: '0.9rem',
  fontWeight: '500',
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
}

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
                style: toastStyle,
                success: { iconTheme: { primary: '#3b82f6', secondary: '#ffffff' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
              }}
            />
            <Routes>
              <Route path="/auth"  element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
