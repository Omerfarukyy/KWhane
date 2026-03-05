// src/components/FeaturesSection.jsx
import {
    HiShieldCheck,
    HiMail,
    HiUserCircle,
    HiPencilAlt,
    HiTrash,
} from 'react-icons/hi'
import '../styles/features.css'

const features = [
    {
        icon: HiUserCircle,
        title: 'Profil Oluşturma',
        description:
            'Kişisel bilgilerinizi, biyografinizi, konumunuzu ve web sitenizi ekleyerek profilinizi oluşturun.',
        status: 'new',
        statusText: 'Yeni',
        accentColor: '#10b981',
        accentSoft: 'rgba(16, 185, 129, 0.15)',
        iconBg: 'rgba(16, 185, 129, 0.12)',
    },
    {
        icon: HiMail,
        title: 'E-posta Doğrulama',
        description:
            'Güvenliğiniz için 6 haneli doğrulama kodu ile e-posta adresinizi onaylayın.',
        status: 'new',
        statusText: 'Yeni',
        accentColor: '#3b82f6',
        accentSoft: 'rgba(59, 130, 246, 0.15)',
        iconBg: 'rgba(59, 130, 246, 0.12)',
    },
    {
        icon: HiShieldCheck,
        title: 'Güvenli Erişim',
        description:
            'Profil güncelleme ve hesap silme işlemleri yalnızca doğrulanmış e-posta ile yapılabilir.',
        status: 'active',
        statusText: 'Aktif',
        accentColor: '#8b5cf6',
        accentSoft: 'rgba(139, 92, 246, 0.15)',
        iconBg: 'rgba(139, 92, 246, 0.12)',
    },
    {
        icon: HiPencilAlt,
        title: 'Profil Düzenleme',
        description:
            'İsim, biyografi, avatar ve diğer bilgilerinizi istediğiniz zaman güncelleyin.',
        status: 'new',
        statusText: 'Yeni',
        accentColor: '#f59e0b',
        accentSoft: 'rgba(245, 158, 11, 0.15)',
        iconBg: 'rgba(245, 158, 11, 0.12)',
    },
    {
        icon: HiTrash,
        title: 'Hesap Yönetimi',
        description:
            'Hesabınızı ve tüm verilerinizi güvenli bir şekilde kalıcı olarak silebilirsiniz.',
        status: 'coming',
        statusText: 'Yakında',
        accentColor: '#ef4444',
        accentSoft: 'rgba(239, 68, 68, 0.15)',
        iconBg: 'rgba(239, 68, 68, 0.12)',
    },
]

export default function FeaturesSection() {
    return (
        <section className="features-section" id="features">
            {/* Header */}
            <div className="features-header">
                <span className="features-badge">
                    <span className="features-badge-dot" />
                    Yeni Özellikler
                </span>
                <h2 className="features-title">Profil Yönetimi</h2>
                <p className="features-subtitle">
                    Hesabınızı güvenle yönetin — e-posta doğrulama ile korunan güçlü profil
                    araçları.
                </p>
            </div>

            {/* Cards Grid */}
            <div className="features-grid">
                {features.map((feat, i) => {
                    const Icon = feat.icon
                    return (
                        <div
                            className="feature-card"
                            key={i}
                            style={{
                                '--card-accent': feat.accentColor,
                                '--card-accent-soft': feat.accentSoft,
                            }}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const x = ((e.clientX - rect.left) / rect.width) * 100
                                const y = ((e.clientY - rect.top) / rect.height) * 100
                                e.currentTarget.style.setProperty('--mouse-x', `${x}%`)
                                e.currentTarget.style.setProperty('--mouse-y', `${y}%`)
                            }}
                        >
                            {/* Icon */}
                            <div
                                className="feature-icon-wrapper"
                                style={{
                                    background: feat.iconBg,
                                    border: `1px solid ${feat.accentColor}25`,
                                }}
                            >
                                <Icon size={26} color={feat.accentColor} />
                            </div>

                            {/* Content */}
                            <h3 className="feature-card-title">{feat.title}</h3>
                            <p className="feature-card-desc">{feat.description}</p>

                            {/* Status Badge */}
                            <span className={`feature-status ${feat.status}`}>
                                <span className="feature-status-dot" />
                                {feat.statusText}
                            </span>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
