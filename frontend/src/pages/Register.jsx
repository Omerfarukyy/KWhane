// src/pages/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { HiMail, HiLockClosed, HiUser, HiEye, HiEyeOff } from 'react-icons/hi'
import '../styles/auth.css'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Password validation regex
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

  // Calculate password strength
  const calculatePasswordStrength = (pwd) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/\d/.test(pwd)) strength++
    if (/[^a-zA-Z\d]/.test(pwd)) strength++
    return Math.min(strength, 3) // Max 3 levels: weak, medium, strong
  }

  const handlePasswordChange = (pwd) => {
    setPassword(pwd)
    setPasswordStrength(calculatePasswordStrength(pwd))
  }

  const getStrengthClass = () => {
    if (passwordStrength === 0) return ''
    if (passwordStrength <= 2) return 'strength-weak'
    if (passwordStrength === 3) return 'strength-medium'
    return 'strength-strong'
  }

  const getStrengthText = () => {
    if (passwordStrength === 0) return ''
    if (passwordStrength <= 2) return 'Zayıf'
    if (passwordStrength === 3) return 'Orta'
    return 'Güçlü'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Validation
    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor!', {
        duration: 4000,
        position: 'top-center',
      })
      setLoading(false)
      return
    }

    if (!passwordRegex.test(password)) {
      toast.error(
        'Şifre en az 8 karakterden oluşmalı; bir büyük harf, bir küçük harf ve bir rakam içermelidir.',
        {
          duration: 5000,
          position: 'top-center',
        }
      )
      setLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await signUp({
        fullName,
        email,
        password,
      })

      if (signUpError) {
        throw new Error(signUpError.message || 'Kayıt hatası')
      }

      toast.success('Kayıt başarılı! Hoş geldiniz! 🎉', {
        duration: 3000,
        position: 'top-center',
      })

      // Clear form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
      setPasswordStrength(0)

      // Redirect after short delay
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (err) {
      toast.error(err.message || 'Kayıt sırasında bir hata oluştu', {
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
              Hesap Oluştur ✨
            </h2>
            <p className="text-gray-400">Hemen başlamak için kayıt olun</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div className="auth-input-group">
              <HiUser className="auth-input-icon" size={20} />
              <input
                type="text"
                required
                value={fullName}
                placeholder="Ad Soyad"
                className="auth-input"
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

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
                placeholder="Şifre"
                className="auth-input"
                style={{ paddingRight: '3rem' }}
                onChange={(e) => handlePasswordChange(e.target.value)}
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
              {password && (
                <>
                  <div className="password-strength">
                    <div className={`password-strength-bar ${getStrengthClass()}`} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Şifre gücü: <span className="font-semibold">{getStrengthText()}</span>
                  </p>
                </>
              )}
              <p className="text-xs text-gray-400 mt-1">
                En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam
              </p>
            </div>

            {/* Confirm Password Input */}
            <div className="auth-input-group">
              <HiLockClosed className="auth-input-icon" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                placeholder="Şifre Tekrar"
                className="auth-input"
                style={{ paddingRight: '3rem' }}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Zaten hesabın var mı?{' '}
            <Link
              to="/login"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}