// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import authService from '../services/authService'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name,
          })
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name,
          })
        } else {
          setUser(null)
        }
      }
    )

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const value = {
    signUp: async (data) => {
      try {
        const result = await authService.register(data.fullName, data.email, data.password)
        setUser(result.user)
        return { data: result, error: null }
      } catch (error) {
        return {
          data: null,
          error: {
            message: error.message || 'Registration failed'
          }
        }
      }
    },
    signIn: async (data) => {
      try {
        const result = await authService.login(data.email, data.password, data.rememberMe)
        setUser(result.user)
        return { data: result, error: null }
      } catch (error) {
        return {
          data: null,
          error: {
            message: error.message || 'Login failed'
          }
        }
      }
    },
    signOut: async () => {
      try {
        await authService.logout()
        setUser(null)
        return { error: null }
      } catch (error) {
        return {
          error: {
            message: error.message || 'Logout failed'
          }
        }
      }
    },
    updateUser: async (data) => {
      try {
        const result = await authService.updateProfile(data)
        setUser(result.user)
        return { data: result, error: null }
      } catch (error) {
        return {
          data: null,
          error: {
            message: error.message || 'Update failed'
          }
        }
      }
    },
    user,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}