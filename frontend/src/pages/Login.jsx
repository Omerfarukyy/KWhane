// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi'
import '../styles/auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await signIn({ email, password, rememberMe })

      if (error) {
        throw new Error(error.message || 'Giriş hatası')
      }

      toast.success('Giriş başarılı! Hoş geldiniz! 🎉', {
        duration: 3000,
        position: 'top-center',
      })

      // Small delay for better UX
      setTimeout(() => {
        navigate('/')
      }, 500)
    } catch (err) {
      toast.error(err.message || 'Giriş yapılırken bir hata oluştu', {
        duration: 4000,
        position: 'top-center',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="auth-background" />
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="auth-card w-full max-w-md p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">
              Hoş Geldiniz 👋
            </h2>
            <p className="text-gray-400">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="auth-input-group">
              <HiMail className="auth-input-icon" size={20} />
              <input
                type="email"
                required
                value={email}
                placeholder="Email adresiniz"
                className="auth-input"
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="auth-input-group">
              <HiLockClosed className="auth-input-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                placeholder="Şifreniz"
                className="auth-input"
                style={{ paddingRight: '3rem' }}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
              </button>
            </div>

            {/* Remember Me Checkbox */}
            <div className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="rememberMe">Beni hatırla</label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Hesabın yok mu?{' '}
            <Link
              to="/register"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}