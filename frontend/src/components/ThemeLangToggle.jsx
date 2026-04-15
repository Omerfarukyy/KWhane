import React from "react";
import { Sun, Moon, Globe } from "lucide-react";
import { useTheme } from "../contexts/ThemeProvider";
import { useLanguage } from "../contexts/LanguageProvider";

const ThemeLangToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const { lang, toggleLanguage } = useLanguage();

    return (
        <div className="flex items-center gap-1 p-1 rounded-full transition-colors duration-300"
            style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full transition-all duration-200 flex items-center justify-center"
                style={{ color: '#888888' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#ffffff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888888' }}
                title={theme === "light" ? "Koyu Tema" : "Açık Tema"}
            >
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <div className="w-px h-4" style={{ background: '#2a2a2a' }} />

            {/* Language Toggle */}
            <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-bold uppercase"
                style={{ color: '#888888' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#ffffff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888888' }}
                title="Dili Değiştir / Change Language"
            >
                <Globe size={13} />
                <span>{lang}</span>
            </button>
        </div>
    );
};

export default ThemeLangToggle;
