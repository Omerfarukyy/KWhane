// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PageTransition from '../components/PageTransition'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await signIn({ email, password })
      if (error) throw error
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <PageTransition>
      <div
        className="min-h-screen flex"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
      >
        {/* LEFT — Brand panel */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 auth-brand-panel border-r"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <span
              className="text-4xl font-semibold tracking-tight"
              style={{ color: 'var(--color-blue)' }}
            >
              KWhane
            </span>
            <p
              className="mt-4 text-base font-light leading-relaxed"
              style={{ color: 'var(--color-muted)' }}
            >
              Enerji kullanımını anlayan sistem.
            </p>
            <div className="mt-10 w-8 h-px" style={{ backgroundColor: 'var(--color-blue)' }} />
          </div>
        </div>

        {/* RIGHT — Form panel */}
        <div
          className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="w-full max-w-sm mx-auto">

            {/* Mobile-only brand */}
            <div className="lg:hidden mb-10">
              <span className="text-2xl font-semibold" style={{ color: 'var(--color-blue)' }}>
                KWhane
              </span>
            </div>

            <h2 className="text-2xl font-semibold mb-1">Giriş Yap</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
              Hesabınıza devam edin.
            </p>

            {error && (
              <div
                className="mb-6 px-4 py-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-2)',
                    color: 'var(--color-text)',
                  }}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
                  Şifre
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-2)',
                    color: 'var(--color-text)',
                  }}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ backgroundColor: 'var(--color-blue)', color: '#ffffff' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-blue-dim)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-blue)')}
              >
                Giriş Yap
              </button>
            </form>

            <p className="mt-8 text-sm" style={{ color: 'var(--color-muted)' }}>
              Hesabın yok mu?{' '}
              <Link
                to="/register"
                className="font-medium transition-colors"
                style={{ color: 'var(--color-blue)' }}
              >
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
