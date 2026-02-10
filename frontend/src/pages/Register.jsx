// src/pages/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('') // Profil tablosu için
  const [msg, setMsg] = useState('')
  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // options: metadata trigger ile profiles tablosuna gidecek
      const { error } = await signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (error) throw error
      setMsg('Kayıt başarılı! Lütfen mail kutunu kontrol et (veya giriş yap).')
    } catch (err) {
      setMsg('Hata: ' + err.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-6 text-emerald-400">Kwhane Kayıt</h2>

        {msg && <div className="bg-blue-500/20 text-blue-200 p-3 rounded mb-4 text-sm">{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ad Soyad</label>
            <input type="text" className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-emerald-500 outline-none" onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-emerald-500 outline-none" onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Şifre</label>
            <input type="password" className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-emerald-500 outline-none" onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 rounded font-bold transition">
            Kayıt Ol
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Zaten hesabın var mı? <Link to="/login" className="text-emerald-400 hover:underline">Giriş Yap</Link>
        </p>
      </div>
    </div>
  )
}