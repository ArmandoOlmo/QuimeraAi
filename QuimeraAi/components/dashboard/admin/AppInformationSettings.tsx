import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    CheckCircle,
    Globe,
    Image as ImageIcon,
    Info,
    Menu,
    RefreshCcw,
    Save,
    Sparkles,
    Upload
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import {
    db,
    storage,
    doc,
    getDoc,
    setDoc,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from '../../../firebase';

interface AppInformationSettingsProps {
    onBack: () => void;
}

interface AppInfoConfig {
    appName: string;
    tagline: string;
    siteDescription: string;
    longDescription: string;
    primaryDomain: string;
    supportEmail: string;
    documentationUrl: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string[];
    faviconUrl: string;
    faviconStoragePath: string;
    socialImageUrl: string;
    socialImageStoragePath: string;
    updatedAt?: number;
    updatedBy?: string;
}

const META_DESCRIPTION_LIMIT = 160;
const SITE_DESCRIPTION_LIMIT = 320;
const LONG_DESCRIPTION_LIMIT = 600;

const getDefaultConfig = (): AppInfoConfig => ({
    appName: 'Quimera.ai',
    tagline: 'Launch beautiful AI-generated websites in minutes.',
    siteDescription: 'All-in-one AI platform to deploy marketing sites, landing pages, and funnels faster than ever.',
    longDescription: 'Quimera.ai empowers teams to create, iterate, and publish production-ready experiences powered by AI. Combine drag-and-drop editing with enterprise-ready governance, localization, and analytics inside a single unified workspace.',
    primaryDomain: 'https://quimera.ai',
    supportEmail: 'support@quimera.ai',
    documentationUrl: 'https://docs.quimera.ai',
    metaTitle: 'Quimera.ai | AI Website Builder for High-Converting Experiences',
    metaDescription: 'Build, localize, and scale marketing websites using AI. Templates, CMS, localization, and analytics included. Powered by Quimera.ai.',
    metaKeywords: ['AI website builder', 'no-code', 'marketing sites', 'Quimera'],
    faviconUrl: 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032',
    faviconStoragePath: '',
    socialImageUrl: '',
    socialImageStoragePath: '',
});

const AppInformationSettings: React.FC<AppInformationSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { user, userDocument } = useAuth();
    const { success, error: showError, info } = useToast();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>(t('superadmin.appInfo.readyToEdit'));
    const [uploadingAsset, setUploadingAsset] = useState<'favicon' | 'social' | null>(null);

    const [appName, setAppName] = useState(getDefaultConfig().appName);
    const [tagline, setTagline] = useState(getDefaultConfig().tagline);
    const [siteDescription, setSiteDescription] = useState(getDefaultConfig().siteDescription);
    const [longDescription, setLongDescription] = useState(getDefaultConfig().longDescription);
    const [primaryDomain, setPrimaryDomain] = useState(getDefaultConfig().primaryDomain);
    const [supportEmail, setSupportEmail] = useState(getDefaultConfig().supportEmail);
    const [documentationUrl, setDocumentationUrl] = useState(getDefaultConfig().documentationUrl);
    const [metaTitle, setMetaTitle] = useState(getDefaultConfig().metaTitle);
    const [metaDescription, setMetaDescription] = useState(getDefaultConfig().metaDescription);
    const [metaKeywordsInput, setMetaKeywordsInput] = useState(getDefaultConfig().metaKeywords.join(', '));
    const [faviconUrl, setFaviconUrl] = useState('');
    const [faviconStoragePath, setFaviconStoragePath] = useState('');
    const [socialImageUrl, setSocialImageUrl] = useState('');
    const [socialImageStoragePath, setSocialImageStoragePath] = useState('');
    const [savedConfig, setSavedConfig] = useState<AppInfoConfig | null>(null);

    const faviconInputRef = useRef<HTMLInputElement>(null);
    const socialImageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            try {
                const settingsRef = doc(db, 'globalSettings', 'appInfo');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    const data = settingsSnap.data() as AppInfoConfig;
                    hydrateState(data);
                    setSavedConfig(data);
                    updateStatusMessage(data);
                } else {
                    const defaults = getDefaultConfig();
                    hydrateState(defaults);
                    setSavedConfig(defaults);
                    setStatusMessage(t('superadmin.appInfo.startAdding'));
                }
            } catch (error) {
                console.error('Error loading app information:', error);
                showError(t('superadmin.appInfo.loadError'));
            } finally {
                setIsLoading(false);
                setHasUnsavedChanges(false);
            }
        };

        loadSettings();
    }, []);

    const hydrateState = (config: Partial<AppInfoConfig>) => {
        const defaults = getDefaultConfig();

        setAppName(config.appName ?? defaults.appName);
        setTagline(config.tagline ?? defaults.tagline);
        setSiteDescription(config.siteDescription ?? defaults.siteDescription);
        setLongDescription(config.longDescription ?? defaults.longDescription);
        setPrimaryDomain(config.primaryDomain ?? defaults.primaryDomain);
        setSupportEmail(config.supportEmail ?? defaults.supportEmail);
        setDocumentationUrl(config.documentationUrl ?? defaults.documentationUrl);
        setMetaTitle(config.metaTitle ?? defaults.metaTitle);
        setMetaDescription(config.metaDescription ?? defaults.metaDescription);
        setMetaKeywordsInput((config.metaKeywords ?? defaults.metaKeywords).join(', '));
        setFaviconUrl(config.faviconUrl ?? '');
        setFaviconStoragePath(config.faviconStoragePath ?? '');
        setSocialImageUrl(config.socialImageUrl ?? '');
        setSocialImageStoragePath(config.socialImageStoragePath ?? '');
    };

    const updateStatusMessage = (config: Partial<AppInfoConfig>) => {
        if (config.updatedAt) {
            const formattedDate = new Date(config.updatedAt).toLocaleString();
            setStatusMessage(
                t('superadmin.appInfo.lastUpdatedBy', { date: formattedDate, user: config.updatedBy || 'Super Admin' })
            );
        } else {
            setStatusMessage(t('superadmin.appInfo.readyToEdit'));
        }
    };

    const keywordsArray = useMemo(
        () => metaKeywordsInput.split(',').map(keyword => keyword.trim()).filter(Boolean),
        [metaKeywordsInput]
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Build payload, converting undefined to empty string for Firestore compatibility
            const payload: AppInfoConfig = {
                appName,
                tagline,
                siteDescription,
                longDescription,
                primaryDomain,
                supportEmail,
                documentationUrl,
                metaTitle,
                metaDescription,
                metaKeywords: keywordsArray,
                faviconUrl,
                faviconStoragePath: faviconStoragePath || '',
                socialImageUrl,
                socialImageStoragePath: socialImageStoragePath || '',
                updatedAt: Date.now(),
                updatedBy: userDocument?.name || user?.email || 'Super Admin',
            };

            const settingsRef = doc(db, 'globalSettings', 'appInfo');
            await setDoc(settingsRef, payload, { merge: true });

            setSavedConfig(payload);
            updateStatusMessage(payload);
            setHasUnsavedChanges(false);
            success(t('superadmin.appInfo.saveSuccess'));
        } catch (error) {
            console.error('Error saving app information:', error);
            showError(t('superadmin.appInfo.saveError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (savedConfig) {
            hydrateState(savedConfig);
            setHasUnsavedChanges(false);
            info(t('superadmin.appInfo.resetSuccess'));
        }
    };

    const validateImage = (file: File, type: 'favicon' | 'social') => {
        const maxSize = type === 'favicon' ? 512 * 1024 : 3 * 1024 * 1024; // 512 KB vs 3 MB
        if (!file.type.startsWith('image/')) {
            showError(t('superadmin.appInfo.imageOnly'));
            return false;
        }
        if (file.size > maxSize) {
            showError(type === 'favicon'
                ? t('superadmin.appInfo.faviconSizeError')
                : t('superadmin.appInfo.socialSizeError'));
            return false;
        }
        return true;
    };

    const handleAssetUpload = async (file: File, type: 'favicon' | 'social') => {
        if (!validateImage(file, type)) return;
        setUploadingAsset(type);
        try {
            const cleanName = file.name.replace(/\s+/g, '-').toLowerCase();
            const storagePath = `global_settings/app_information/${type}-${Date.now()}-${cleanName}`;
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            if (type === 'favicon') {
                if (faviconStoragePath && faviconStoragePath !== storagePath) {
                    await deleteObject(ref(storage, faviconStoragePath)).catch(() => undefined);
                }
                setFaviconUrl(downloadURL);
                setFaviconStoragePath(storagePath);
                success(t('superadmin.appInfo.faviconUpdated'));
            } else {
                if (socialImageStoragePath && socialImageStoragePath !== storagePath) {
                    await deleteObject(ref(storage, socialImageStoragePath)).catch(() => undefined);
                }
                setSocialImageUrl(downloadURL);
                setSocialImageStoragePath(storagePath);
                success(t('superadmin.appInfo.socialUpdated'));
            }
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Asset upload error:', error);
            showError(t('messages.uploadError'));
        } finally {
            setUploadingAsset(null);
        }
    };

    const handleRemoveAsset = async (type: 'favicon' | 'social') => {
        try {
            if (type === 'favicon') {
                if (faviconStoragePath) {
                    await deleteObject(ref(storage, faviconStoragePath)).catch(() => { });
                }
                setFaviconUrl('');
                setFaviconStoragePath('');
                success(t('superadmin.appInfo.faviconRemoved'));
            } else {
                if (socialImageStoragePath) {
                    await deleteObject(ref(storage, socialImageStoragePath)).catch(() => { });
                }
                setSocialImageUrl('');
                setSocialImageStoragePath('');
                success(t('superadmin.appInfo.socialRemoved'));
            }
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Asset removal error:', error);
            showError(t('messages.deleteError'));
        }
    };

    const renderCharCounter = (current: number, limit: number) => (
        <div className="flex justify-end text-xs text-editor-text-secondary mt-1">
            {current}/{limit} {t('superadmin.appInfo.chars')}
        </div>
    );

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden transition-colors"
                            title={t('common.openMenu')}
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        {/* Back button - Mobile */}
                        <button
                            onClick={onBack}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-lg md:hidden transition-colors"
                            title={t('common.back')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <Globe className="text-editor-accent w-5 h-5" />
                                <h1 className="text-lg font-semibold text-editor-text-primary">
                                    {t('superadmin.appInformation')}
                                </h1>
                                {hasUnsavedChanges && (
                                    <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                                        {t('superadmin.appInfo.unsavedChanges')}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-editor-text-secondary hidden sm:block">{statusMessage}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            disabled={!savedConfig || isSaving}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:opacity-50"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('superadmin.appInfo.reset')}</span>
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="h-9 px-3 text-editor-accent font-medium text-sm hover:text-editor-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">{isSaving ? t('superadmin.saving') : t('superadmin.appInfo.saveChanges')}</span>
                        </button>
                        {/* Back button - Desktop */}
                        <button
                            onClick={onBack}
                            className="hidden md:flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-editor-border/40 hover:bg-editor-border text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('common.back')}
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-editor-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                                <section className="space-y-6">
                                    <div className="bg-editor-panel-bg rounded-xl border border-editor-border p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="text-editor-accent w-5 h-5" />
                                            <div>
                                                <h2 className="text-xl font-semibold">{t('superadmin.appInfo.brandIdentity')}</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    {t('superadmin.appInfo.brandIdentityDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.appName')}</label>
                                                <input
                                                    type="text"
                                                    value={appName}
                                                    onChange={(e) => { setAppName(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="Quimera.ai"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.tagline')}</label>
                                                <input
                                                    type="text"
                                                    value={tagline}
                                                    onChange={(e) => { setTagline(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="Launch AI websites faster"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.primaryDomain')}</label>
                                                <input
                                                    type="url"
                                                    value={primaryDomain}
                                                    onChange={(e) => { setPrimaryDomain(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="https://quimera.ai"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.supportEmail')}</label>
                                                <input
                                                    type="email"
                                                    value={supportEmail}
                                                    onChange={(e) => { setSupportEmail(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="support@quimera.ai"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.documentationUrl')}</label>
                                                <input
                                                    type="url"
                                                    value={documentationUrl}
                                                    onChange={(e) => { setDocumentationUrl(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="https://docs.quimera.ai"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-editor-panel-bg rounded-xl border border-editor-border p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Info className="text-blue-400 w-5 h-5" />
                                            <div>
                                                <h2 className="text-xl font-semibold">{t('superadmin.appInfo.siteDescription')}</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    {t('superadmin.appInfo.siteDescriptionDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.shortDescription')}</label>
                                                <textarea
                                                    rows={3}
                                                    value={siteDescription}
                                                    onChange={(e) => { setSiteDescription(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    maxLength={SITE_DESCRIPTION_LIMIT}
                                                />
                                                {renderCharCounter(siteDescription.length, SITE_DESCRIPTION_LIMIT)}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.longDescription')}</label>
                                                <textarea
                                                    rows={5}
                                                    value={longDescription}
                                                    onChange={(e) => { setLongDescription(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    maxLength={LONG_DESCRIPTION_LIMIT}
                                                />
                                                {renderCharCounter(longDescription.length, LONG_DESCRIPTION_LIMIT)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-editor-panel-bg rounded-xl border border-editor-border p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Globe className="text-green-400 w-5 h-5" />
                                            <div>
                                                <h2 className="text-xl font-semibold">{t('superadmin.appInfo.metadataDefaults')}</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    {t('superadmin.appInfo.metadataDefaultsDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.metaTitle')}</label>
                                                <input
                                                    type="text"
                                                    value={metaTitle}
                                                    onChange={(e) => { setMetaTitle(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t('superadmin.appInfo.metaDescription')}</label>
                                                <textarea
                                                    rows={3}
                                                    value={metaDescription}
                                                    onChange={(e) => { setMetaDescription(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    maxLength={META_DESCRIPTION_LIMIT}
                                                />
                                                {renderCharCounter(metaDescription.length, META_DESCRIPTION_LIMIT)}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">
                                                    {t('superadmin.appInfo.keywordsLabel')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={metaKeywordsInput}
                                                    onChange={(e) => { setMetaKeywordsInput(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="AI, builder, SaaS"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-editor-panel-bg rounded-xl border border-editor-border p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <ImageIcon className="text-purple-400 w-5 h-5" />
                                            <div>
                                                <h2 className="text-xl font-semibold">{t('superadmin.appInfo.brandAssets')}</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    {t('superadmin.appInfo.brandAssetsDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <AssetUploader
                                                title={t('superadmin.appInfo.favicon')}
                                                description={t('superadmin.appInfo.faviconFormat')}
                                                imageUrl={faviconUrl}
                                                isUploading={uploadingAsset === 'favicon'}
                                                onUpload={() => faviconInputRef.current?.click()}
                                                onRemove={() => handleRemoveAsset('favicon')}
                                            />
                                            <AssetUploader
                                                title={t('superadmin.appInfo.socialPreview')}
                                                description={t('superadmin.appInfo.socialFormat')}
                                                imageUrl={socialImageUrl}
                                                isUploading={uploadingAsset === 'social'}
                                                onUpload={() => socialImageInputRef.current?.click()}
                                                onRemove={() => handleRemoveAsset('social')}
                                            />
                                        </div>
                                        <input
                                            ref={faviconInputRef}
                                            type="file"
                                            accept=".ico,.png,.svg,image/png,image/svg+xml,image/x-icon"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleAssetUpload(file, 'favicon');
                                                e.target.value = '';
                                            }}
                                        />
                                        <input
                                            ref={socialImageInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleAssetUpload(file, 'social');
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                </section>

                                <aside className="space-y-6">
                                    <div className="bg-editor-panel-bg rounded-xl border border-editor-border p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <CheckCircle className="text-editor-accent w-5 h-5" />
                                            <h3 className="text-lg font-semibold">{t('superadmin.appInfo.livePreview')}</h3>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="text-editor-text-secondary text-xs uppercase">{t('superadmin.appInfo.metaTitle')}</p>
                                                <p className="text-editor-text-primary font-medium">{metaTitle || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-editor-text-secondary text-xs uppercase">{t('superadmin.voiceDescription')}</p>
                                                <p className="text-editor-text-secondary">{metaDescription || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-editor-text-secondary text-xs uppercase">{t('seo.keywords')}</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {keywordsArray.length === 0 ? (
                                                        <span className="text-editor-text-secondary text-xs">{t('superadmin.appInfo.noKeywords')}</span>
                                                    ) : (
                                                        keywordsArray.map(keyword => (
                                                            <span key={keyword} className="text-xs px-2 py-1 rounded-full bg-editor-border/60 text-editor-text-secondary">
                                                                {keyword}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-editor-panel-bg rounded-xl border border-editor-border p-5">
                                        <h3 className="text-lg font-semibold mb-3">{t('superadmin.appInfo.publishingChecklist')}</h3>
                                        <ul className="space-y-3 text-sm">
                                            <ChecklistItem checked={Boolean(faviconUrl)} label={t('superadmin.appInfo.faviconUploaded')} />
                                            <ChecklistItem checked={Boolean(socialImageUrl)} label={t('superadmin.appInfo.socialConfigured')} />
                                            <ChecklistItem checked={siteDescription.length >= 60} label={t('superadmin.appInfo.shortDescCheck')} />
                                            <ChecklistItem checked={metaDescription.length >= 80} label={t('superadmin.appInfo.metaDescCheck')} />
                                            <ChecklistItem checked={keywordsArray.length >= 3} label={t('superadmin.appInfo.minKeywords')} />
                                        </ul>
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 space-y-3 text-sm text-editor-text-secondary">
                                        <h3 className="text-blue-400 font-semibold flex items-center gap-2">
                                            <Info className="w-4 h-4" />
                                            {t('superadmin.appInfo.recommendations')}
                                        </h3>
                                        <p>• {t('superadmin.appInfo.recMetaTitle')}</p>
                                        <p>• {t('superadmin.appInfo.recLongDesc')}</p>
                                        <p>• {t('superadmin.appInfo.recUpdateAssets')}</p>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

interface AssetUploaderProps {
    title: string;
    description: string;
    imageUrl: string;
    isUploading: boolean;
    onUpload: () => void;
    onRemove: () => void;
}

const AssetUploader: React.FC<AssetUploaderProps> = ({ title, description, imageUrl, isUploading, onUpload, onRemove }) => {
    const { t } = useTranslation();
    return (
        <div className="p-4 border border-dashed border-editor-border rounded-lg bg-editor-bg">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-sm font-semibold text-editor-text-primary">{title}</p>
                    <p className="text-xs text-editor-text-secondary">{description}</p>
                </div>
                {imageUrl && (
                    <button
                        onClick={onRemove}
                        className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                        {t('superadmin.appInfo.remove')}
                    </button>
                )}
            </div>
            <div className="aspect-video bg-editor-panel-bg flex items-center justify-center rounded-lg mb-3 border border-editor-border/60 overflow-hidden">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-editor-text-secondary text-xs px-4">
                        {t('superadmin.appInfo.noFileUploaded')}
                    </div>
                )}
            </div>
            <button
                onClick={onUpload}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-editor-border text-sm font-medium hover:bg-editor-border/40 transition-colors disabled:opacity-50"
            >
                <Upload className="w-4 h-4" />
                {isUploading ? t('superadmin.appInfo.uploading') : imageUrl ? t('superadmin.appInfo.updateFile') : t('superadmin.appInfo.uploadFile')}
            </button>
        </div>
    );
};

const ChecklistItem: React.FC<{ checked: boolean; label: string }> = ({ checked, label }) => (
    <li className="flex items-center gap-2">
        <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center ${checked ? 'border-green-400 bg-green-400/20 text-green-400' : 'border-editor-border text-editor-text-secondary'}`}
        >
            {checked ? '✓' : ''}
        </span>
        <span className="text-editor-text-secondary">{label}</span>
    </li>
);

export default AppInformationSettings;





