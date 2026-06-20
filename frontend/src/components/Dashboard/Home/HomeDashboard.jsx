import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import CatalogSearchBar from './CatalogSearchBar';
import TopExpenseBox from './TopExpenseBox';
import SuggestionCards from '../SuggestionCards';
import HomeRanking from '../HomeRanking';
import { useLanguage } from '../../../contexts/LanguageProvider';
import { useAuth } from '../../../contexts/AuthContext';
import useSceneStore from '../../../store/useSceneStore';

const BillsTab     = lazy(() => import('../Bills/BillsTab'));
const AiAssistant  = lazy(() => import('../AiAssistant'));

/**
 * 60% home dashboard — composes all the existing widgets the user wants
 * visible at a glance: bill entry, top expenses, recommendations, peer
 * ranking, item-catalog search, embedded AI chat.
 */
const HomeDashboard = ({ onCatalogSearch, chatMode, onSetChatMode }) => {
    const { t }    = useLanguage();
    const { user } = useAuth();

    const objects    = useSceneStore((s) => s.objects);
    const energyData = useSceneStore((s) => s.energyData);
    const homeBillValidated = useSceneStore((s) => s.homeBillValidated);
    const billingScaleFactor = useSceneStore((s) => s.billingScaleFactor);
    const activeBillingScale = homeBillValidated && billingScaleFactor > 0 ? billingScaleFactor : 1;
    const totalKwh = objects.reduce((acc, o) => {
        const ed = energyData[o.id];
        if (!ed || ed === 'error') return acc;
        return acc + (ed.total_monthly_kwh ?? ed.monthly_kwh ?? 0) * activeBillingScale;
    }, 0);

    return (
        <aside
            className="pointer-events-auto rounded-3xl flex flex-col gap-4 overflow-y-auto w-full h-full"
            style={{
                background: 'var(--color-surface-glass)',
                backdropFilter: 'blur(24px)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--color-highlight)',
                padding: 18,
                scrollbarWidth: 'thin',
            }}
        >
            {/* Catalog search */}
            <CatalogSearchBar onSearch={onCatalogSearch} />

            {/* Masonry-style 2-col layout via CSS columns — short cards no
                longer inherit a tall partner's row height. */}
            <div
                style={{
                    columnCount: 2,
                    columnGap: 14,
                }}
            >
                {/* Each child uses inline-block + break-inside: avoid so cards
                    stay intact and pack densely. */}
                {[
                    <div key="bills" className="kw-card p-4 mb-3.5" style={{ breakInside: 'avoid', display: 'inline-block', width: '100%' }}>
                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center py-6" style={{ color: 'var(--color-subtle)' }}>
                                    <Loader2 size={18} className="animate-spin" />
                                </div>
                            }
                        >
                            <BillsTab userId={user?.id} />
                        </Suspense>
                    </div>,
                    <div key="top" className="mb-3.5" style={{ breakInside: 'avoid', display: 'inline-block', width: '100%' }}>
                        <TopExpenseBox />
                    </div>,
                    <div key="recs" className="kw-card p-4 mb-3.5" style={{ breakInside: 'avoid', display: 'inline-block', width: '100%' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
                            style={{ color: 'var(--color-subtle)', letterSpacing: '0.15em' }}>
                            {t('savingsSuggestions')}
                        </p>
                        <SuggestionCards />
                    </div>,
                    <div key="peer" className="kw-card p-4 mb-3.5" style={{ breakInside: 'avoid', display: 'inline-block', width: '100%' }}>
                        <HomeRanking
                            userId={user?.id}
                            predictedKwh={totalKwh}
                            nDevices={objects.length}
                        />
                    </div>,
                ]}
            </div>

            {/* Embedded AI chat — full width, compact */}
            <div className="flex flex-col" style={{ height: 280 }}>
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center py-6" style={{ color: 'var(--color-subtle)' }}>
                            <Loader2 size={18} className="animate-spin" />
                        </div>
                    }
                >
                    <AiAssistant embedded isOpen onOpen={() => {}} onClose={() => {}} chatMode={chatMode} onSetChatMode={onSetChatMode} />
                </Suspense>
            </div>
        </aside>
    );
};

export default React.memo(HomeDashboard);
