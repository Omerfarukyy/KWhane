// src/components/Dashboard/BottomProductionBar.jsx
import { TrendingUp, Gauge, Activity } from 'lucide-react'

export default function BottomProductionBar() {
    const hours = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22']

    return (
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
            <div className="rounded-2xl px-5 py-3"
                style={{
                    background: 'rgba(17,17,17,0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid #1e1e1e',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                }}>
                <div className="flex items-center gap-6">
                    {/* Left stat */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3b82f6' }} />
                        <div>
                            <p className="text-lg font-bold text-white leading-tight">
                                46.28 <span className="text-sm font-medium" style={{ color: '#555555' }}>kWh</span>
                            </p>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#555555' }}>Günlük Tüketim</p>
                        </div>
                    </div>

                    {/* Sparkline */}
                    <div className="flex-1 flex items-end gap-[3px] h-10 px-2">
                        {[18, 12, 8, 6, 5, 7, 22, 35, 42, 55, 62, 58, 65, 72, 68, 52, 45, 48, 55, 42, 35, 28, 22, 18].map((v, i) => (
                            <div key={i} className="flex-1 rounded-t-sm transition-all duration-300"
                                style={{
                                    height: `${(v / 72) * 100}%`,
                                    background: 'linear-gradient(to top, rgba(59,130,246,0.6), rgba(59,130,246,0.2))'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(to top, rgba(59,130,246,0.9), rgba(96,165,250,0.5))'}
                                onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(to top, rgba(59,130,246,0.6), rgba(59,130,246,0.2))'}
                            />
                        ))}
                    </div>

                    <div className="w-px h-10 shrink-0" style={{ background: '#1e1e1e' }} />

                    {/* Right stats */}
                    <div className="flex items-center gap-5 shrink-0">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" style={{ color: '#3b82f6' }} />
                            <div>
                                <p className="text-xs font-semibold text-white">Pik Tüketim</p>
                                <p className="text-[11px]" style={{ color: '#555555' }}>12.5 kW <span style={{ color: '#2a2a2a' }}>/ saat</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4" style={{ color: '#60a5fa' }} />
                            <div>
                                <p className="text-xs font-semibold text-white">Verimlilik</p>
                                <p className="text-[11px]" style={{ color: '#555555' }}>89 <span style={{ color: '#2a2a2a' }}>%</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hour labels */}
                <div className="flex justify-between mt-1 px-2 ml-[120px] mr-[180px]">
                    {hours.map((h) => (
                        <span key={h} className="text-[9px]" style={{ color: '#333333' }}>{h}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}
