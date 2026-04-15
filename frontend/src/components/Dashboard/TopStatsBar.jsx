// src/components/Dashboard/TopStatsBar.jsx
import { Zap, MapPin, ChevronRight } from 'lucide-react'

export default function TopStatsBar() {
    return (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 pointer-events-none">
            {/* Left breadcrumb */}
            <div className="pointer-events-auto">
                <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: '#555555' }}>
                    <MapPin className="w-3 h-3" />
                    <span>Konut</span>
                    <ChevronRight className="w-3 h-3" />
                    <span style={{ color: '#3b82f6' }}>Ev Simülasyonu</span>
                </div>
                <h1 className="text-lg font-semibold text-white tracking-tight">
                    Enerji Analiz Paneli
                </h1>
            </div>

            {/* Right — monthly badge */}
            <div className="pointer-events-auto rounded-2xl px-4 py-2.5 flex items-center gap-3"
                style={{
                    background: 'rgba(17,17,17,0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid #1e1e1e',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 0 14px rgba(59,130,246,0.3)' }}>
                    <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="text-xl font-bold text-white leading-tight">
                        247.8 <span className="text-sm font-medium" style={{ color: '#555555' }}>kWh</span>
                    </p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#555555' }}>Aylık Tüketim</p>
                </div>
            </div>
        </div>
    )
}
