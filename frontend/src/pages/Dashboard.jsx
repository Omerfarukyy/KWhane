// src/pages/Dashboard.jsx
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageTransition from '../components/PageTransition'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const getProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    if (user) getProfile()
  }, [user])

  return (
    <PageTransition
      className="flex flex-col min-h-screen"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {/* ── NAVBAR ─────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: 'var(--color-blue)' }}
        >
          KWhane
        </span>

        <div className="flex items-center gap-6">
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {profile ? profile.full_name : user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-sm font-medium transition-colors duration-150"
            style={{ color: 'var(--color-subtle)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-subtle)')}
          >
            Çıkış
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ──────────────────────────────── */}
      <div
        className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 p-6"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        {/* ── STATS PANEL ───────────────────────────── */}
        <div
          className="flex flex-col rounded-xl p-6 stat-card-enter"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            minHeight: '480px',
          }}
        >
          <div className="mb-6">
            <h3
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--color-muted)' }}
            >
              Ev Özeti
            </h3>
            <div className="mt-2 w-6 h-px" style={{ backgroundColor: 'var(--color-blue)' }} />
          </div>

          <div
            className="flex items-center justify-between py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Fatura Tahmini</span>
            <span className="text-sm font-semibold">₺0.00</span>
          </div>

          <div
            className="flex-1 mt-6 flex items-center justify-center rounded-lg"
            style={{ border: '1px dashed var(--color-border-2)' }}
          >
            <div className="text-center">
              <div
                className="text-xs font-medium uppercase tracking-widest mb-1"
                style={{ color: 'var(--color-subtle)' }}
              >
                Grafikler
              </div>
              <div className="text-xs" style={{ color: 'var(--color-border-2)' }}>
                Yakında
              </div>
            </div>
          </div>
        </div>

        {/* ── 3D VIEWPORT PANEL ─────────────────────── */}
        <div
          className="lg:col-span-2 rounded-xl relative overflow-hidden flex items-center justify-center viewport-panel"
          style={{ backgroundColor: '#000000', minHeight: '480px' }}
        >
          {/* L-bracket corner decoration */}
          <div
            className="absolute top-0 left-0 w-20 h-px"
            style={{ backgroundColor: 'var(--color-blue)', opacity: 0.4 }}
          />
          <div
            className="absolute top-0 left-0 h-20 w-px"
            style={{ backgroundColor: 'var(--color-blue)', opacity: 0.4 }}
          />

          <div className="text-center select-none">
            <h2 className="text-lg font-medium" style={{ color: 'var(--color-subtle)' }}>
              3D Digital Twin Alanı
            </h2>
            <p className="mt-2 text-xs" style={{ color: 'var(--color-border-2)' }}>
              React Three Fiber buraya yüklenecek.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
