/**
 * Meta OAuth Connect Component
 * UI for connecting Facebook, Instagram, and WhatsApp via Meta OAuth
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Facebook, Instagram, Phone, Loader2, CheckCircle,
    RefreshCw, LogOut, ChevronRight, User, AlertTriangle,
    Shield, Sparkles, ArrowRight, Globe
} from 'lucide-react';
import { useMetaOAuth } from '../../../hooks/useMetaOAuth';

interface MetaOAuthConnectProps {
    projectId: string;
    onConnectionChange?: (connected: boolean) => void;
}

const MetaOAuthConnect: React.FC<MetaOAuthConnectProps> = ({
    projectId,
    onConnectionChange
}) => {
    const { t } = useTranslation();
    const {
        status,
        isLoading,
        error,
        connection,
        pages,
        whatsappAccounts,
        instagramAccounts,
        selectedPageId,
        selectedWhatsAppPhoneNumberId,
        selectedInstagramAccountId,
        connect,
        disconnect,
        refreshToken,
        selectAssets,
        isConnected,
        hasPages,
        hasWhatsApp,
        hasInstagram,
    } = useMetaOAuth(projectId);

    const [showAssetSelector, setShowAssetSelector] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<{
        pageId?: string;
        whatsappPhoneNumberId?: string;
        instagramAccountId?: string;
    }>({});

    const platformTiles = [
        {
            icon: <Phone size={18} />,
            label: 'WhatsApp',
            tone: 'text-q-success',
            bg: 'bg-q-success/10',
            border: 'border-q-success/20',
        },
        {
            icon: <Facebook size={18} />,
            label: 'Messenger',
            tone: 'text-q-accent',
            bg: 'bg-q-accent/10',
            border: 'border-q-accent/20',
        },
        {
            icon: <Instagram size={18} />,
            label: 'Instagram',
            tone: 'text-q-warning',
            bg: 'bg-q-warning/10',
            border: 'border-q-warning/20',
        },
    ];

    // Handle asset selection save
    const handleSaveSelections = async () => {
        await selectAssets(selectedAssets);
        setShowAssetSelector(false);
        onConnectionChange?.(true);
    };

    // Initialize selections when opening selector
    const openAssetSelector = () => {
        setSelectedAssets({
            pageId: selectedPageId || pages[0]?.id,
            whatsappPhoneNumberId: selectedWhatsAppPhoneNumberId || whatsappAccounts[0]?.phoneNumberId,
            instagramAccountId: selectedInstagramAccountId || instagramAccounts[0]?.id,
        });
        setShowAssetSelector(true);
    };

    // Render disconnected state
    if (!isConnected && status !== 'connecting') {
        return (
            <div className="rounded-lg border border-q-border bg-q-surface/80 p-5 shadow-sm animate-fade-in-up">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-q-accent/25 bg-q-accent/10">
                            <Globe className="text-q-accent" size={22} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-foreground">
                                    {t('aiAssistant.socialChannels.meta.title')}
                                </h3>
                                <span className="rounded-full border border-q-success/20 bg-q-success/10 px-2 py-0.5 text-[11px] font-medium text-q-success">
                                    {t('aiAssistant.socialChannels.meta.recommended')}
                                </span>
                            </div>
                            <p className="mt-1 max-w-xl text-sm leading-relaxed text-q-text-muted">
                                {t('aiAssistant.socialChannels.meta.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {platformTiles.map((platform) => (
                        <div
                            key={platform.label}
                            className={`flex min-h-16 items-center gap-3 rounded-lg border ${platform.border} ${platform.bg} px-3 py-3`}
                        >
                            <span className={platform.tone}>{platform.icon}</span>
                            <span className="text-sm font-medium text-foreground">{platform.label}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-5 space-y-2 border-t border-q-border pt-4">
                    {[
                        t('aiAssistant.socialChannels.meta.benefitTokens'),
                        t('aiAssistant.socialChannels.meta.benefitAssets'),
                        t('aiAssistant.socialChannels.meta.benefitOAuth'),
                    ].map((benefit, index) => (
                        <div key={benefit} className="flex items-center gap-2 text-sm text-q-text-muted">
                            {index === 2 ? (
                                <Shield size={14} className="text-q-accent" />
                            ) : (
                                <CheckCircle size={14} className="text-q-success" />
                            )}
                            <span>{benefit}</span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-4 flex gap-3 rounded-lg border border-q-error/20 bg-q-error/10 p-3 text-sm text-q-error">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">{t('aiAssistant.socialChannels.meta.errorTitle')}</p>
                            <p className="mt-0.5 text-xs text-q-text-muted">
                                {t('aiAssistant.socialChannels.meta.errorDescription')}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-q-text-muted">
                        {t('aiAssistant.socialChannels.meta.redirectNote')}
                    </p>
                    <button
                        onClick={connect}
                        disabled={isLoading || status === 'connecting'}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-q-accent px-4 py-2.5 text-sm font-semibold text-q-text-on-accent shadow-sm transition-colors hover:bg-q-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {status === 'connecting' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {t('aiAssistant.socialChannels.meta.connecting')}
                            </>
                        ) : (
                            <>
                                <Facebook size={18} />
                                {t('aiAssistant.socialChannels.meta.connectButton')}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Render loading state
    if (isLoading && !isConnected) {
        return (
            <div className="bg-q-surface border border-q-border rounded-2xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={32} className="animate-spin text-q-text-muted" />
                </div>
            </div>
        );
    }

    // Render connected state
    return (
        <div className="overflow-hidden rounded-lg border border-q-border bg-q-surface">
            {/* Connected Header */}
            <div className="p-4 bg-gradient-to-r from-q-success/10 to-q-success/10 border-b border-q-success/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {connection?.metaUserPicture ? (
                            <img
                                src={connection.metaUserPicture}
                                alt=""
                                className="w-10 h-10 rounded-full border-2 border-q-success/25"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-q-success flex items-center justify-center">
                                <User size={20} className="text-white" />
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{connection?.metaUserName || t('aiAssistant.socialChannels.meta.defaultAccount')}</span>
                                <CheckCircle size={14} className="text-q-success" />
                            </div>
                            <span className="text-xs text-q-text-muted">{t('aiAssistant.socialChannels.meta.connected')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status === 'token_expired' && (
                            <button
                                onClick={refreshToken}
                                className="p-2 text-q-accent hover:bg-q-accent/10 rounded-lg transition-colors"
                                title={t('aiAssistant.socialChannels.meta.refreshToken')}
                            >
                                <RefreshCw size={16} />
                            </button>
                        )}
                        <button
                            onClick={disconnect}
                            disabled={isLoading}
                            className="p-2 text-q-error hover:bg-q-error/10 rounded-lg transition-colors"
                            title={t('aiAssistant.socialChannels.meta.disconnect')}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                {status === 'token_expired' && (
                    <div className="mt-3 p-2 bg-q-accent/10 border border-q-accent/20 rounded-lg text-q-accent text-xs flex items-center gap-2">
                        <AlertTriangle size={14} />
                        {t('aiAssistant.socialChannels.meta.tokenExpired')}
                    </div>
                )}
            </div>

            {/* Connected Assets */}
            <div className="p-4 space-y-3">
                {/* Facebook Pages */}
                {hasPages && (
                    <div className="flex items-center justify-between p-3 bg-q-accent/5 border border-q-accent/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-q-accent rounded-lg">
                                <Facebook size={16} className="text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-medium">Facebook Messenger</span>
                                {selectedPageId ? (
                                    <p className="text-xs text-q-text-muted">
                                        {pages.find(p => p.id === selectedPageId)?.name || t('aiAssistant.socialChannels.meta.selectedPage')}
                                    </p>
                                ) : (
                                    <p className="text-xs text-q-accent">{t('aiAssistant.socialChannels.meta.availablePages', { count: pages.length })}</p>
                                )}
                            </div>
                        </div>
                        {selectedPageId ? (
                            <CheckCircle size={18} className="text-q-success" />
                        ) : (
                            <button
                                onClick={openAssetSelector}
                                className="text-xs text-q-accent hover:underline"
                            >
                                {t('aiAssistant.socialChannels.meta.configure')}
                            </button>
                        )}
                    </div>
                )}

                {/* WhatsApp */}
                {hasWhatsApp && (
                    <div className="flex items-center justify-between p-3 bg-q-success/5 border border-q-success/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-q-success rounded-lg">
                                <Phone size={16} className="text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-medium">WhatsApp Business</span>
                                {selectedWhatsAppPhoneNumberId ? (
                                    <p className="text-xs text-q-text-muted">
                                        {whatsappAccounts.find(w => w.phoneNumberId === selectedWhatsAppPhoneNumberId)?.displayPhoneNumber || t('aiAssistant.socialChannels.meta.selectedNumber')}
                                    </p>
                                ) : (
                                    <p className="text-xs text-q-accent">{t('aiAssistant.socialChannels.meta.availableNumbers', { count: whatsappAccounts.length })}</p>
                                )}
                            </div>
                        </div>
                        {selectedWhatsAppPhoneNumberId ? (
                            <CheckCircle size={18} className="text-q-success" />
                        ) : (
                            <button
                                onClick={openAssetSelector}
                                className="text-xs text-q-success hover:underline"
                            >
                                {t('aiAssistant.socialChannels.meta.configure')}
                            </button>
                        )}
                    </div>
                )}

                {/* Instagram */}
                {hasInstagram && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-q-accent/5 via-q-accent/5 to-q-warning/5 border border-q-accent/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-q-accent via-q-accent/80 to-q-warning rounded-lg">
                                <Instagram size={16} className="text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-medium">Instagram DMs</span>
                                {selectedInstagramAccountId ? (
                                    <p className="text-xs text-q-text-muted">
                                        @{instagramAccounts.find(i => i.id === selectedInstagramAccountId)?.username || t('aiAssistant.socialChannels.meta.selectedAccount')}
                                    </p>
                                ) : (
                                    <p className="text-xs text-q-accent">{t('aiAssistant.socialChannels.meta.availableAccounts', { count: instagramAccounts.length })}</p>
                                )}
                            </div>
                        </div>
                        {selectedInstagramAccountId ? (
                            <CheckCircle size={18} className="text-q-success" />
                        ) : (
                            <button
                                onClick={openAssetSelector}
                                className="text-xs text-q-accent hover:underline"
                            >
                                {t('aiAssistant.socialChannels.meta.configure')}
                            </button>
                        )}
                    </div>
                )}

                {/* No assets warning */}
                {!hasPages && !hasWhatsApp && !hasInstagram && (
                    <div className="p-4 bg-q-accent/10 border border-q-accent/20 rounded-xl text-center">
                        <AlertTriangle className="mx-auto mb-2 text-q-accent" size={24} />
                        <p className="text-sm font-medium text-q-accent">{t('aiAssistant.socialChannels.meta.noAssetsTitle')}</p>
                        <p className="text-xs text-q-text-muted mt-1">
                            {t('aiAssistant.socialChannels.meta.noAssetsDescription')}
                        </p>
                    </div>
                )}

                {/* Configure button */}
                {(hasPages || hasWhatsApp || hasInstagram) && (
                    <button
                        onClick={openAssetSelector}
                        className="w-full py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                    >
                        <Sparkles size={16} />
                        {t('aiAssistant.socialChannels.meta.configureChannels')}
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>

            {/* Asset Selector Modal */}
            {showAssetSelector && (
                <div className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-q-surface border border-q-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-fade-in-up">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-q-border">
                            <h3 className="font-bold text-lg">{t('aiAssistant.socialChannels.meta.selectChannelsTitle')}</h3>
                            <p className="text-sm text-q-text-muted">
                                {t('aiAssistant.socialChannels.meta.selectChannelsDescription')}
                            </p>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
                            {/* Facebook Pages */}
                            {hasPages && (
                                <div>
                                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <Facebook size={14} className="text-q-accent" />
                                        {t('aiAssistant.socialChannels.meta.facebookPage')}
                                    </label>
                                    <div className="space-y-2">
                                        {pages.map(page => (
                                            <label
                                                key={page.id}
                                                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                                                    selectedAssets.pageId === page.id
                                                        ? 'border-q-accent/25 bg-q-accent/10'
                                                        : 'border-q-border hover:border-q-accent/50'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="pageId"
                                                    value={page.id}
                                                    checked={selectedAssets.pageId === page.id}
                                                    onChange={() => setSelectedAssets(prev => ({ ...prev, pageId: page.id }))}
                                                    className="sr-only"
                                                />
                                                {page.pictureUrl ? (
                                                    <img src={page.pictureUrl} alt="" className="w-8 h-8 rounded-lg" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-q-accent/20 rounded-lg flex items-center justify-center">
                                                        <Facebook size={16} className="text-q-accent" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm">{page.name}</span>
                                                    {page.hasInstagram && (
                                                        <span className="ml-2 text-xs text-q-accent">+ Instagram</span>
                                                    )}
                                                </div>
                                                {selectedAssets.pageId === page.id && (
                                                    <CheckCircle size={18} className="text-q-accent" />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* WhatsApp Numbers */}
                            {hasWhatsApp && (
                                <div>
                                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <Phone size={14} className="text-q-success" />
                                        {t('aiAssistant.socialChannels.meta.whatsappNumber')}
                                    </label>
                                    <div className="space-y-2">
                                        {whatsappAccounts.map(account => (
                                            <label
                                                key={account.phoneNumberId}
                                                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                                                    selectedAssets.whatsappPhoneNumberId === account.phoneNumberId
                                                        ? 'border-q-success/25 bg-q-success/10'
                                                        : 'border-q-border hover:border-q-success/50'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="whatsappPhoneNumberId"
                                                    value={account.phoneNumberId}
                                                    checked={selectedAssets.whatsappPhoneNumberId === account.phoneNumberId}
                                                    onChange={() => setSelectedAssets(prev => ({ ...prev, whatsappPhoneNumberId: account.phoneNumberId }))}
                                                    className="sr-only"
                                                />
                                                <div className="w-8 h-8 bg-q-success/20 rounded-lg flex items-center justify-center">
                                                    <Phone size={16} className="text-q-success" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm">{account.displayPhoneNumber}</span>
                                                    <p className="text-xs text-q-text-muted">{account.verifiedName}</p>
                                                </div>
                                                {selectedAssets.whatsappPhoneNumberId === account.phoneNumberId && (
                                                    <CheckCircle size={18} className="text-q-success" />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Instagram Accounts */}
                            {hasInstagram && (
                                <div>
                                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <Instagram size={14} className="text-q-accent" />
                                        {t('aiAssistant.socialChannels.meta.instagramAccount')}
                                    </label>
                                    <div className="space-y-2">
                                        {instagramAccounts.map(account => (
                                            <label
                                                key={account.id}
                                                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                                                    selectedAssets.instagramAccountId === account.id
                                                        ? 'border-q-accent/25 bg-q-accent/10'
                                                        : 'border-q-border hover:border-q-accent/50'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="instagramAccountId"
                                                    value={account.id}
                                                    checked={selectedAssets.instagramAccountId === account.id}
                                                    onChange={() => setSelectedAssets(prev => ({ ...prev, instagramAccountId: account.id }))}
                                                    className="sr-only"
                                                />
                                                {account.profilePictureUrl ? (
                                                    <img src={account.profilePictureUrl} alt="" className="w-8 h-8 rounded-lg" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-gradient-to-br from-q-accent via-q-accent/80 to-q-warning rounded-lg flex items-center justify-center">
                                                        <Instagram size={16} className="text-white" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm">@{account.username}</span>
                                                </div>
                                                {selectedAssets.instagramAccountId === account.id && (
                                                    <CheckCircle size={18} className="text-q-accent" />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-q-border flex gap-3">
                            <button
                                onClick={() => setShowAssetSelector(false)}
                                className="flex-1 py-2.5 px-4 border border-q-border hover:bg-secondary rounded-xl transition-colors font-medium"
                            >
                                {t('aiAssistant.socialChannels.meta.cancel')}
                            </button>
                            <button
                                onClick={handleSaveSelections}
                                disabled={isLoading}
                                className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        {t('aiAssistant.socialChannels.meta.save')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetaOAuthConnect;



