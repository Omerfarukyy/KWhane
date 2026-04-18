// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Mevcut oturumu kontrol et; yoksa demo kullanıcıyla otomatik giriş yap
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setLoading(false)
      } else {
        // Oturum yok → demo hesabıyla otomatik giriş
        const { data, error } = await supabase.auth.signInWithPassword({
          email:    'demo_user@kwhane.com',
          password: '123456',
        })
        if (error) {
          console.warn('[auth] Demo auto-login failed:', error.message)
        }
        setUser(data?.user ?? null)
        setLoading(false)
      }
    })

    // 2. Oturum değişikliklerini dinle (Giriş/Çıkış)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session !== undefined) setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    signUp:  (data) => supabase.auth.signUp(data),
    signIn:  (data) => supabase.auth.signInWithPassword(data),
    signOut: () => supabase.auth.signOut(),
    user,
    loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}