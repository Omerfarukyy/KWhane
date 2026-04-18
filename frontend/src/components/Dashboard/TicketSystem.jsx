import React, { useState, useEffect, useCallback } from 'react';
import {
    Ticket, AlertCircle, CheckCircle2, MessageSquare,
    Send, History, Clock, PlusCircle, Hash, Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as ticketService from '../../services/ticketService';

const statusStyle = {
    'Açık':        { background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' },
    'İnceleniyor': { background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' },
    'Çözüldü':     { background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' },
};

const statusIcon = (status) => {
    if (status === 'Çözüldü') return <CheckCircle2 size={14} />;
    if (status === 'İnceleniyor') return <Clock size={14} />;
    return <AlertCircle size={14} />;
};

const TicketSystem = () => {
    const { user } = useAuth();
    const [tickets, setTickets]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [formData, setFormData]     = useState({ subject: '', category: 'Şikayet', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError]           = useState(null);

    const loadTickets = useCallback(async () => {
        if (!user?.id) { setLoading(false); return; }
        try {
            setLoading(true);
            const data = await ticketService.fetchTickets(user.id);
            setTickets(data);
        } catch (err) {
            console.error('[tickets] fetch failed:', err.message);
            setError('Biletler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.message || !user?.id) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const newTicket = await ticketService.createTicket(user.id, formData);
            setTickets((prev) => [newTicket, ...prev]);
            setFormData({ subject: '', category: 'Şikayet', message: '' });
        } catch (err) {
            console.error('[tickets] create failed:', err.message);
            setError('Bilet gönderilemedi. Lütfen tekrar deneyin.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = {
        width: '100%',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
        color: 'var(--color-text)',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.15s',
        fontFamily: "'Inter', ui-sans-serif",
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5"
            style={{ background: 'var(--color-bg)', minHeight: '580px', fontFamily: "'Inter', ui-sans-serif" }}>

            {/* LEFT: Create ticket form */}
            <div className="lg:col-span-5">
                <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <PlusCircle size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Destek İstemi Oluştur</h2>
                            <p className="text-xs" style={{ color: 'var(--color-subtle)' }}>Geri bildirimleriniz 24 saat içinde yanıtlanır.</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1" style={{ color: 'var(--color-muted)' }}>Konu</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                placeholder="Bildirim konusunu giriniz..."
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1" style={{ color: 'var(--color-muted)' }}>Kategori</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                            >
                                <option value="Şikayet">📉 Şikayet</option>
                                <option value="Öneri">💡 Öneri</option>
                                <option value="Hata Bildirimi">⚠️ Hata Bildirimi</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1" style={{ color: 'var(--color-muted)' }}>Mesajınız</label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Lütfen detayları buraya yazınız..."
                                rows={5}
                                style={{ ...inputStyle, resize: 'none' }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all"
                            style={{
                                background: '#3b82f6',
                                boxShadow: '0 0 20px rgba(59,130,246,0.2)',
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = '#2563eb'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; }}>
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {isSubmitting ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT: Ticket history */}
            <div className="lg:col-span-7">
                <div className="rounded-2xl p-5 h-full flex flex-col"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl" style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)' }}>
                                <History size={22} />
                            </div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Geçmiş Bildirimlerim</h2>
                        </div>
                        <span className="text-xs font-medium px-3 py-1 rounded-full"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-subtle)', border: '1px solid var(--color-border)' }}>
                            Toplam {tickets.length} Kayıt
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {loading && (
                            <div className="flex items-center justify-center py-16" style={{ color: 'var(--color-subtle)' }}>
                                <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
                            </div>
                        )}

                        {!loading && tickets.map((ticket) => (
                            <div key={ticket.id}
                                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl group transition-all"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                                <div className="flex items-start gap-4 mb-4 md:mb-0">
                                    <div className="p-2.5 rounded-xl"
                                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                        <Ticket size={18} style={{ color: '#3b82f6' }} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded"
                                                style={{ color: 'var(--color-subtle)', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                                                <Hash size={9} /> {ticket.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3b82f6' }}>
                                                {ticket.category}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-sm leading-tight group-hover:text-blue-400 transition-colors"
                                            style={{ color: 'var(--color-text)' }}>
                                            {ticket.subject}
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-subtle)' }}>
                                            <Clock size={11} /> {formatDate(ticket.created_at)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                        style={statusStyle[ticket.status] || statusStyle['Açık']}>
                                        {statusIcon(ticket.status)}
                                        {ticket.status}
                                    </div>
                                    <button className="p-2 rounded-lg transition-all"
                                        style={{ color: 'var(--color-subtle)' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-subtle)'; e.currentTarget.style.background = 'transparent'; }}>
                                        <MessageSquare size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {!loading && tickets.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center space-y-3 py-20"
                                style={{ color: 'var(--color-border-2)' }}>
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
