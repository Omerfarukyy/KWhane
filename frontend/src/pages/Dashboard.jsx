// src/pages/Dashboard.jsx
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    // Giriş yapmış kullanıcının profil verisini çek
    const getProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    if(user) getProfile()
  }, [user])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-700 p-4 flex justify-between items-center bg-gray-800">
        <h1 className="text-xl font-bold text-emerald-400">Kwhane AI</h1>
        <div className="flex items-center gap-4">
          <span>{profile ? profile.full_name : user.email}</span>
          <button onClick={signOut} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">Çıkış</button>
        </div>
      </nav>

      {/* Ana İçerik */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sol Panel: İstatistikler */}
        <div className="bg-gray-800 p-6 rounded-lg shadow h-96">
          <h3 className="text-lg font-semibold mb-4">Ev Özeti</h3>
          <p className="text-gray-400">Fatura Tahmini: ₺0.00</p>
          <div className="mt-4 p-4 bg-gray-700/50 rounded border border-gray-600 border-dashed text-center text-sm text-gray-400">
            Grafikler buraya gelecek
          </div>
        </div>

        {/* Orta Panel: 3D Sahne (Gelecekteki Canvas) */}
        <div className="lg:col-span-2 bg-black rounded-lg border border-gray-700 relative overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-500">3D Digital Twin Alanı</h2>
            <p className="text-gray-600 text-sm mt-2">React Three Fiber buraya yüklenecek.</p>
          </div>
        </div>

      </div>
    </div>
  )
}