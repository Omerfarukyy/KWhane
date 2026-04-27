import React from "react";
import { Sun, Moon, Globe } from "lucide-react";
import { useTheme } from "../contexts/ThemeProvider";
import { useLanguage } from "../contexts/LanguageProvider";

const ThemeLangToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const { lang, toggleLanguage, t } = useLanguage();

    const restColor = 'var(--color-muted)';
    const hoverBg = 'var(--color-surface-2)';
    const hoverColor = 'var(--color-text)';

    return (
        <div className="flex items-center gap-1 p-1 rounded-full transition-colors duration-300"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)' }}>
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full transition-all duration-200 flex items-center justify-center"
                style={{ color: restColor }}
                onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = restColor; }}
                title={theme === "light" ? t('darkTheme') : t('lightTheme')}
            >
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <div className="w-px h-4" style={{ background: 'var(--color-border-2)' }} />

            {/* Language Toggle */}
            <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-bold uppercase"
                style={{ color: restColor }}
                onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = restColor; }}
                title={t('changeLanguage')}
            >
                <Globe size={13} />
                <span>{lang}</span>
            </button>
        </div>
    );
};

export default ThemeLangToggle;
