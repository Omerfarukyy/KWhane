import React, { useState } from 'react';
import {
    Ticket, AlertCircle, CheckCircle2, MessageSquare,
    Send, History, Clock, PlusCircle, Hash
} from 'lucide-react';

const TicketSystem = () => {
    const [tickets, setTickets] = useState([
        {
            id: 'TK-1042',
            subject: 'Fatura Tahmini Sapması',
            category: 'Hata Bildirimi',
            status: 'İnceleniyor',
            date: '02.03.2024',
            statusIcon: <Clock size={14} style={{ color: '#f59e0b' }} />
        },
        {
            id: 'TK-1039',
            subject: 'Yeni Cihaz Ekleme Sorunu',
            category: 'Hata Bildirimi',
            status: 'Çözüldü',
            date: '28.02.2024',
            statusIcon: <CheckCircle2 size={14} style={{ color: '#3b82f6' }} />
        },
        {
            id: 'TK-1035',
            subject: 'Mobil Uygulama Karanlık Tema',
            category: 'Öneri',
            status: 'Açık',
            date: '25.02.2024',
            statusIcon: <AlertCircle size={14} style={{ color: '#60a5fa' }} />
        }
    ]);

    const [formData, setFormData] = useState({ subject: '', category: 'Şikayet', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.message) return;
        setIsSubmitting(true);
        setTimeout(() => {
            setTickets([{
                id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
                subject: formData.subject,
                category: formData.category,
                status: 'Açık',
                date: new Date().toLocaleDateString('tr-TR'),
                statusIcon: <AlertCircle size={14} style={{ color: '#60a5fa' }} />
            }, ...tickets]);
            setFormData({ subject: '', category: 'Şikayet', message: '' });
            setIsSubmitting(false);
        }, 800);
    };

    const statusStyle = {
        'Açık': { background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' },
        'İnceleniyor': { background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' },
        'Çözüldü': { background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' },
    };

    const inputStyle = {
        width: '100%',
        background: '#0d0d0d',
        border: '1px solid #1e1e1e',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
        color: '#ffffff',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.15s',
        fontFamily: "'Inter', ui-sans-serif",
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5"
            style={{ background: '#0a0a0a', minHeight: '580px', fontFamily: "'Inter', ui-sans-serif" }}>

            {/* LEFT: Create ticket form */}
            <div className="lg:col-span-5">
                <div className="rounded-2xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <PlusCircle size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Destek İstemi Oluştur</h2>
                            <p className="text-xs" style={{ color: '#555555' }}>Geri bildirimleriniz 24 saat içinde yanıtlanır.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1" style={{ color: '#888888' }}>Konu</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                placeholder="Bildirim konusunu giriniz..."
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#1e1e1e'}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1" style={{ color: '#888888' }}>Kategori</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#1e1e1e'}
                            >
                                <option value="Şikayet">📉 Şikayet</option>
                                <option value="Öneri">💡 Öneri</option>
                                <option value="Hata Bildirimi">⚠️ Hata Bildirimi</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1" style={{ color: '#888888' }}>Mesajınız</label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Lütfen detayları buraya yazınız..."
                                rows={5}
                                style={{ ...inputStyle, resize: 'none' }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#1e1e1e'}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all"
                            style={{
                                background: isSubmitting ? '#1d4ed8' : '#3b82f6',
                                boxShadow: '0 0 20px rgba(59,130,246,0.2)',
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = '#2563eb' }}
                            onMouseLeave={e => e.currentTarget.style.background = isSubmitting ? '#1d4ed8' : '#3b82f6'}>
                            <Send size={16} />
                            {isSubmitting ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT: Ticket history */}
            <div className="lg:col-span-7">
                <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl" style={{ background: '#161616', color: '#888888' }}>
                                <History size={22} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Geçmiş Bildirimlerim</h2>
                        </div>
                        <span className="text-xs font-medium px-3 py-1 rounded-full"
                            style={{ background: '#161616', color: '#555555', border: '1px solid #1e1e1e' }}>
                            Toplam {tickets.length} Kayıt
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {tickets.map((ticket, index) => (
                            <div key={index}
                                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl group transition-all"
                                style={{ background: '#161616', border: '1px solid #1e1e1e' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e1e'}>
                                <div className="flex items-start gap-4 mb-4 md:mb-0">
                                    <div className="p-2.5 rounded-xl" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                                        <Ticket size={18} style={{ color: '#3b82f6' }} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded"
                                                style={{ color: '#555555', background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
                                                <Hash size={9} /> {ticket.id}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3b82f6' }}>
                                                {ticket.category}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-blue-400 transition-colors">
                                            {ticket.subject}
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs" style={{ color: '#555555' }}>
                                            <Clock size={11} /> {ticket.date}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                        style={statusStyle[ticket.status]}>
                                        {ticket.statusIcon}
                                        {ticket.status}
                                    </div>
                                    <button className="p-2 rounded-lg transition-all"
                                        style={{ color: '#555555' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = '#555555'; e.currentTarget.style.background = 'transparent'; }}>
                                        <MessageSquare size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {tickets.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center space-y-3 py-20"
                                style={{ color: '#2a2a2a' }}>
                                <AlertCircle size={40} />
                                <p className="font-medium text-sm">Henüz bir bildiriminiz bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketSystem;
