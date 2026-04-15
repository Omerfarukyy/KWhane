// src/components/Dashboard/RightMetricPanel.jsx
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Activity, Cpu, Sparkles, LogIn } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function ConsumptionGauge() {
    const radius = 52
    const circumference = 2 * Math.PI * radius
    const percentage = 68
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e1e1e" strokeWidth="8" />
                    <circle
                        cx="60" cy="60" r={radius}
                        fill="none"
                        stroke="url(#gaugeGradBlue)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000"
                    />
                    <defs>
                        <linearGradient id="gaugeGradBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#60a5fa" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">875</span>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: '#555555' }}>kWh / ay</span>
                </div>
            </div>
        </div>
    )
}

export default function RightMetricPanel() {
    const { user } = useAuth()

    return (
        <div className="absolute top-16 right-4 bottom-20 w-72 z-20 pointer-events-auto flex flex-col gap-3 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e1e transparent' }}>

            {/* Auth banner */}
            {!user && (
                <div className="rounded-2xl p-4 text-center"
                    style={{ background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <LogIn className="w-5 h-5 mx-auto mb-2" style={{ color: '#f59e0b' }} />
                    <p className="text-xs mb-3" style={{ color: '#f59e0b' }}>
                        Tüm özellikleri kullanmak için giriş yapın
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Link to="/auth"
                            className="px-4 py-2 text-white text-xs font-medium rounded-xl transition-colors"
                            style={{ background: '#3b82f6' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
                            Giriş Yap
                        </Link>
                    </div>
                </div>
            )}

            {/* Consumption gauge card */}
            <Card className="backdrop-blur-xl" style={{ background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(20px)', border: '1px solid #1e1e1e' }}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4" style={{ color: '#3b82f6' }} />
                        Tüketim Özeti | Aylık
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ConsumptionGauge />
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-xl p-3 text-center" style={{ background: '#161616', border: '1px solid #1e1e1e' }}>
                            <p className="text-lg font-bold text-white">458</p>
                            <p className="text-[10px] uppercase" style={{ color: '#555555' }}>Aktif Cihaz (saat)</p>
                        </div>
                        <div className="rounded-xl p-3 text-center" style={{ background: '#161616', border: '1px solid #1e1e1e' }}>
                            <p className="text-lg font-bold text-white">₺120</p>
                            <p className="text-[10px] uppercase" style={{ color: '#555555' }}>Tahmini Fatura</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #1e1e1e' }}>
                        <div className="text-center">
                            <p className="text-sm font-semibold" style={{ color: '#3b82f6' }}>₺89.5</p>
                            <p className="text-[10px]" style={{ color: '#555555' }}>Toplam Maliyet</p>
                        </div>
                        <div className="w-px h-6" style={{ background: '#1e1e1e' }} />
                        <div className="text-center">
                            <p className="text-sm font-semibold" style={{ color: '#60a5fa' }}>₺1.2 /m²</p>
                            <p className="text-[10px]" style={{ color: '#555555' }}>Ort. Harcama</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* AI recommendation card */}
            <Card className="backdrop-blur-xl" style={{ background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(20px)', border: '1px solid #1e1e1e' }}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" style={{ color: '#60a5fa' }} />
                        Yapay Zeka Önerisi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>
                            Klima sıcaklığını 1°C düşürmek aylık tüketiminizi{' '}
                            <span style={{ color: '#3b82f6' }} className="font-semibold">%8</span> azaltabilir.
                        </p>
                    </div>
                    <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>
                            Gece tarifesine geçiş ile yıllık{' '}
                            <span style={{ color: '#3b82f6' }} className="font-semibold">₺540</span> tasarruf mümkün.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="flex gap-2">
                {[
                    { icon: <Cpu className="w-3.5 h-3.5" />, label: 'Copilot' },
                    { icon: <Activity className="w-3.5 h-3.5" />, label: 'Simüle Et' },
                ].map(({ icon, label }) => (
                    <button key={label}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                        style={{ background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(16px)', border: '1px solid #1e1e1e', color: '#555555' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#555555'; e.currentTarget.style.borderColor = '#1e1e1e'; }}>
                        {icon}
                        {label}
                    </button>
                ))}
            </div>
        </div>
    )
}
