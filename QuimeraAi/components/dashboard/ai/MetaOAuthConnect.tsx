/**
 * Meta OAuth Connect Component
 * UI for connecting Facebook, Instagram, and WhatsApp via Meta OAuth
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Facebook, Instagram, Phone, Loader2, CheckCircle, XCircle,
    RefreshCw, LogOut, ChevronRight, User, AlertTriangle,
    ExternalLink, Shield, Sparkles, ArrowRight, Globe
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
            <div className="bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 border border-blue-500/20 rounded-2xl p-6 animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                        <Globe className="text-white" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-foreground">Conectar con Meta</h3>
                        <p className="text-sm text-muted-foreground">WhatsApp, Facebook e Instagram en un clic</p>
                    </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                        <Phone className="mx-auto mb-2 text-green-500" size={20} />
                        <span className="text-xs font-medium text-green-600">WhatsApp</span>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                        <Facebook className="mx-auto mb-2 text-blue-500" size={20} />
                        <span className="text-xs font-medium text-blue-600">Messenger</span>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-xl p-3 text-center">
                        <Instagram className="mx-auto mb-2 text-pink-500" size={20} />
                        <span className="text-xs font-medium text-pink-600">Instagram</span>
                    </div>
                </div>

                {/* Benefits */}
                <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle size={14} className="text-green-500" />
                        <span>Configuración automática sin copiar tokens</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle size={14} className="text-green-500" />
                        <span>Selecciona tus páginas y números con un clic</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield size={14} className="text-blue-500" />
                        <span>Conexión segura con OAuth de Meta</span>
                    </div>
                </div>

                {/* Error display */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                {/* Connect Button */}
                <button
                    onClick={connect}
                    disabled={isLoading || status === 'connecting'}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {status === 'connecting' ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Conectando...
                        </>
                    ) : (
                        <>
                            <Facebook size={18} />
                            Conectar con Meta
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>

                <p className="text-[10px] text-muted-foreground text-center mt-3">
                    Serás redirigido a Meta para autorizar el acceso
                </p>
            </div>
        );
    }

    // Render loading state
    if (isLoading && !isConnected) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={32} className="animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    // Render connected state
    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Connected Header */}
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {connection?.metaUserPicture ? (
                            <img
                                src={connection.metaUserPicture}
                                alt=""
                                className="w-10 h-10 rounded-full border-2 border-green-500"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                <User size={20} className="text-white" />
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{connection?.metaUserName || 'Meta Account'}</span>
                                <CheckCircle size={14} className="text-green-500" />
                            </div>
                            <span className="text-xs text-muted-foreground">Conectado con Meta</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status === 'token_expired' && (
                            <button
                                onClick={refreshToken}
                                className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                title="Token expirado - Renovar"
                            >
                                <RefreshCw size={16} />
                            </button>
                        )}
                        <button
                            onClick={disconnect}
                            disabled={isLoading}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Desconectar"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                {status === 'token_expired' && (
                    <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} />
                        Tu token ha expirado. Haz clic en renovar para continuar.
                    </div>
                )}
            </div>

            {/* Connected Assets */}
            <div className="p-4 space-y-3">
                {/* Facebook Pages */}
                {hasPages && (
                    <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Facebook size={16} className="text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-medium">Facebook Messenger</span>
                                {selectedPageId ? (
                                    <p className="text-xs text-muted-foreground">
                                        {pages.find(p => p.id === selectedPageId)?.name || 'Página seleccionada'}
                                    </p>
                                ) : (
                                    <p className="text-xs text-yellow-500">{pages.length} página(s) disponibles</p>
                                )}
                            </div>
                        </div>
                        {selectedPageId ? (
                            <CheckCircle size={18} className="text-green-500" />
                        ) : (
                            <button
                                onClick={openAssetSelector}
                                className="text-xs text-blue-500 hover:underline"
                            >
                                Configurar
                            </button>
                        )}
                    </div>
                )}

                {/* WhatsApp */}
                {hasWhatsApp && (
                    <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                                <Phone size={16} className="text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-medium">WhatsApp Business</span>
                                {selectedWhatsAppPhoneNumberId ? (
                                    <p className="text-xs text-muted-foreground">
                                        {whatsappAccounts.find(w => w.phoneNumberId === selectedWhatsAppPhoneNumberId)?.displayPhoneNumber || 'Número seleccionado'}
                                    </p>
                                ) : (
                                    <p className="text-xs text-yellow-500">{whatsappAccounts.length} número(s) disponibles</p>
                                )}
                            </div>
                        </div>
                        {selectedWhatsAppPhoneNumberId ? (
                            <CheckCircle size={18} className="text-green-500" />
                        ) : (
                            <button
                                onClick={openAssetSelector}
                                className="text-xs text-green-500 hover:underline"
                            >
                                Configurar
                            </button>
                        )}
                    </div>
                )}

                {/* Instagram */}
                {hasInstagram && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 border border-pink-500/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg">
                                <Instagram size={16} className="text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-medium">Instagram DMs</span>
                                {selectedInstagramAccountId ? (
                                    <p className="text-xs text-muted-foreground">
                                        @{instagramAccounts.find(i => i.id === selectedInstagramAccountId)?.username || 'Cuenta seleccionada'}
                                    </p>
                                ) : (
                                    <p className="text-xs text-yellow-500">{instagramAccounts.length} cuenta(s) disponibles</p>
                                )}
                            </div>
                        </div>
                        {selectedInstagramAccountId ? (
                            <CheckCircle size={18} className="text-green-500" />
                        ) : (
                            <button
                                onClick={openAssetSelector}
                                className="text-xs text-pink-500 hover:underline"
                            >
                                Configurar
                            </button>
                        )}
                    </div>
                )}

                {/* No assets warning */}
                {!hasPages && !hasWhatsApp && !hasInstagram && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
                        <AlertTriangle className="mx-auto mb-2 text-yellow-500" size={24} />
                        <p className="text-sm font-medium text-yellow-600">No se encontraron páginas o cuentas</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Asegúrate de tener una página de Facebook con permisos de administrador
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
                        Configurar canales
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>

            {/* Asset Selector Modal */}
            {showAssetSelector && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-fade-in-up">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold text-lg">Seleccionar canales</h3>
                            <p className="text-sm text-muted-foreground">
                                Elige qué páginas y cuentas usar para este proyecto
                            </p>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
                            {/* Facebook Pages */}
                            {hasPages && (
                                <div>
                                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <Facebook size={14} className="text-blue-500" />
                                        Página de Facebook
                                    </label>
                                    <div className="space-y-2">
                                        {pages.map(page => (
                                            <label
                                                key={page.id}
                                                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                                                    selectedAssets.pageId === page.id
                                                        ? 'border-blue-500 bg-blue-500/10'
                                                        : 'border-border hover:border-blue-500/50'
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
                                                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                        <Facebook size={16} className="text-blue-500" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm">{page.name}</span>
                                                    {page.hasInstagram && (
                                                        <span className="ml-2 text-xs text-pink-500">+ Instagram</span>
                                                    )}
                                                </div>
                                                {selectedAssets.pageId === page.id && (
                                                    <CheckCircle size={18} className="text-blue-500" />
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
                                        <Phone size={14} className="text-green-500" />
                                        Número de WhatsApp
                                    </label>
                                    <div className="space-y-2">
                                        {whatsappAccounts.map(account => (
                                            <label
                                                key={account.phoneNumberId}
                                                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                                                    selectedAssets.whatsappPhoneNumberId === account.phoneNumberId
                                                        ? 'border-green-500 bg-green-500/10'
                                                        : 'border-border hover:border-green-500/50'
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
                                                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                    <Phone size={16} className="text-green-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm">{account.displayPhoneNumber}</span>
                                                    <p className="text-xs text-muted-foreground">{account.verifiedName}</p>
                                                </div>
                                                {selectedAssets.whatsappPhoneNumberId === account.phoneNumberId && (
                                                    <CheckCircle size={18} className="text-green-500" />
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
                                        <Instagram size={14} className="text-pink-500" />
                                        Cuenta de Instagram
                                    </label>
                                    <div className="space-y-2">
                                        {instagramAccounts.map(account => (
                                            <label
                                                key={account.id}
                                                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                                                    selectedAssets.instagramAccountId === account.id
                                                        ? 'border-pink-500 bg-pink-500/10'
                                                        : 'border-border hover:border-pink-500/50'
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
                                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center">
                                                        <Instagram size={16} className="text-white" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm">@{account.username}</span>
                                                </div>
                                                {selectedAssets.instagramAccountId === account.id && (
                                                    <CheckCircle size={18} className="text-pink-500" />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-border flex gap-3">
                            <button
                                onClick={() => setShowAssetSelector(false)}
                                className="flex-1 py-2.5 px-4 border border-border hover:bg-secondary rounded-xl transition-colors font-medium"
                            >
                                Cancelar
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
                                        Guardar
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








