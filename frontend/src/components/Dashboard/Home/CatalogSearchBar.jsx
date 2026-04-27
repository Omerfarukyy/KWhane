import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageProvider';

/**
 * Inline search bar for the home dashboard. Submitting (Enter or click)
 * fires onSearch(query) — the parent opens DeviceCatalogModal with the
 * query pre-filled.
 */
const CatalogSearchBar = ({ onSearch }) => {
    const { t } = useLanguage();
    const [value, setValue] = useState('');

    const submit = () => {
        if (!onSearch) return;
        onSearch(value.trim());
    };

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                boxShadow: 'inset 0 1px 0 var(--color-highlight)',
            }}
        >
            <Search size={14} style={{ color: 'var(--color-muted)' }} />
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                    }
                }}
                placeholder={t('searchCatalog')}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--color-text)' }}
            />
            <button
                type="button"
                onClick={submit}
                className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-md transition"
                style={{
                    background: 'rgba(59,130,246,0.12)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59,130,246,0.25)',
                    cursor: 'pointer',
                }}
            >
                {t('searchCatalog').includes('Search') ? 'Search' : 'Ara'}
            </button>
        </div>
    );
};

export default CatalogSearchBar;
