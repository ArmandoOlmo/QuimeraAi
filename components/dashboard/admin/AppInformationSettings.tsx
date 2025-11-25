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
import { useEditor } from '../../../contexts/EditorContext';
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
    faviconStoragePath?: string;
    socialImageUrl: string;
    socialImageStoragePath?: string;
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
    faviconUrl: '',
    socialImageUrl: '',
});

const AppInformationSettings: React.FC<AppInformationSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { user, userDocument } = useEditor();
    const { success, error: showError, info } = useToast();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('Ready to edit your global app information.');
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
    const [faviconStoragePath, setFaviconStoragePath] = useState<string | undefined>(undefined);
    const [socialImageUrl, setSocialImageUrl] = useState('');
    const [socialImageStoragePath, setSocialImageStoragePath] = useState<string | undefined>(undefined);
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
                    setStatusMessage('Start by adding your brand information and hit save.');
                }
            } catch (error) {
                console.error('Error loading app information:', error);
                showError('No se pudo cargar la información de la aplicación.');
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
        setFaviconStoragePath(config.faviconStoragePath);
        setSocialImageUrl(config.socialImageUrl ?? '');
        setSocialImageStoragePath(config.socialImageStoragePath);
    };

    const updateStatusMessage = (config: Partial<AppInfoConfig>) => {
        if (config.updatedAt) {
            const formattedDate = new Date(config.updatedAt).toLocaleString();
            setStatusMessage(
                `Última actualización ${formattedDate} por ${config.updatedBy || 'Super Admin'}`
            );
        } else {
            setStatusMessage('Ready to edit your global app information.');
        }
    };

    const keywordsArray = useMemo(
        () => metaKeywordsInput.split(',').map(keyword => keyword.trim()).filter(Boolean),
        [metaKeywordsInput]
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
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
                faviconStoragePath,
                socialImageUrl,
                socialImageStoragePath,
                updatedAt: Date.now(),
                updatedBy: userDocument?.name || user?.email || 'Super Admin',
            };

            const settingsRef = doc(db, 'globalSettings', 'appInfo');
            await setDoc(settingsRef, payload, { merge: true });

            setSavedConfig(payload);
            updateStatusMessage(payload);
            setHasUnsavedChanges(false);
            success('Información global guardada correctamente.');
        } catch (error) {
            console.error('Error saving app information:', error);
            showError('No se pudo guardar la información. Intenta nuevamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (savedConfig) {
            hydrateState(savedConfig);
            setHasUnsavedChanges(false);
            info('Restauraste la última versión guardada.');
        }
    };

    const validateImage = (file: File, type: 'favicon' | 'social') => {
        const maxSize = type === 'favicon' ? 512 * 1024 : 3 * 1024 * 1024; // 512 KB vs 3 MB
        if (!file.type.startsWith('image/')) {
            showError('Solo se aceptan imágenes.');
            return false;
        }
        if (file.size > maxSize) {
            showError(type === 'favicon'
                ? 'El favicon debe pesar menos de 512 KB.'
                : 'La imagen social debe pesar menos de 3 MB.');
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
                success('Favicon actualizado.');
            } else {
                if (socialImageStoragePath && socialImageStoragePath !== storagePath) {
                    await deleteObject(ref(storage, socialImageStoragePath)).catch(() => undefined);
                }
                setSocialImageUrl(downloadURL);
                setSocialImageStoragePath(storagePath);
                success('Imagen para redes actualizada.');
            }
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Asset upload error:', error);
            showError('No se pudo subir el archivo. Intenta nuevamente.');
        } finally {
            setUploadingAsset(null);
        }
    };

    const handleRemoveAsset = async (type: 'favicon' | 'social') => {
        try {
            if (type === 'favicon') {
                if (faviconStoragePath) {
                    await deleteObject(ref(storage, faviconStoragePath)).catch(() => undefined);
                }
                setFaviconUrl('');
                setFaviconStoragePath(undefined);
                success('Favicon eliminado.');
            } else {
                if (socialImageStoragePath) {
                    await deleteObject(ref(storage, socialImageStoragePath)).catch(() => undefined);
                }
                setSocialImageUrl('');
                setSocialImageStoragePath(undefined);
                success('Imagen social eliminada.');
            }
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Asset removal error:', error);
            showError('No se pudo eliminar el archivo.');
        }
    };

    const renderCharCounter = (current: number, limit: number) => (
        <div className="flex justify-end text-xs text-editor-text-secondary mt-1">
            {current}/{limit} caracteres
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
                            title="Open menu"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <Globe className="text-editor-accent w-5 h-5" />
                                <h1 className="text-lg font-semibold text-editor-text-primary">
                                    {t('superadmin.appInformation')}
                                </h1>
                                {hasUnsavedChanges && (
                                    <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                                        Cambios sin guardar
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-editor-text-secondary">{statusMessage}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            disabled={!savedConfig || isSaving}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:opacity-50"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="h-9 px-4 bg-editor-accent text-white font-medium text-sm rounded-md hover:bg-editor-accent-hover transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Admin
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
                                                <h2 className="text-xl font-semibold">Brand Identity</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    Define el nombre oficial, tagline y datos básicos visibles en toda la plataforma.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">App Name</label>
                                                <input
                                                    type="text"
                                                    value={appName}
                                                    onChange={(e) => { setAppName(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="Quimera.ai"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Tagline</label>
                                                <input
                                                    type="text"
                                                    value={tagline}
                                                    onChange={(e) => { setTagline(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="Launch AI websites faster"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Primary Domain</label>
                                                <input
                                                    type="url"
                                                    value={primaryDomain}
                                                    onChange={(e) => { setPrimaryDomain(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="https://quimera.ai"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Support Email</label>
                                                <input
                                                    type="email"
                                                    value={supportEmail}
                                                    onChange={(e) => { setSupportEmail(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    placeholder="support@quimera.ai"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium mb-1">Documentation URL</label>
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
                                                <h2 className="text-xl font-semibold">Site Description</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    Controla la descripción corta y extendida utilizada en emails, snippets y templates.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Short Description</label>
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
                                                <label className="block text-sm font-medium mb-1">Narrative / Long Description</label>
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
                                                <h2 className="text-xl font-semibold">Metadata Defaults</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    Define el meta title, descripción y keywords usados por defecto en las nuevas propiedades.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Meta Title</label>
                                                <input
                                                    type="text"
                                                    value={metaTitle}
                                                    onChange={(e) => { setMetaTitle(e.target.value); setHasUnsavedChanges(true); }}
                                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Meta Description</label>
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
                                                    Keywords (separados por coma)
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
                                                <h2 className="text-xl font-semibold">Brand Assets</h2>
                                                <p className="text-sm text-editor-text-secondary">
                                                    Sube un favicon global y la imagen base para previews sociales.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <AssetUploader
                                                title="Favicon"
                                                description="PNG, SVG o ICO · 512 KB máx."
                                                imageUrl={faviconUrl}
                                                isUploading={uploadingAsset === 'favicon'}
                                                onUpload={() => faviconInputRef.current?.click()}
                                                onRemove={() => handleRemoveAsset('favicon')}
                                            />
                                            <AssetUploader
                                                title="Social Preview"
                                                description="1200x630 recomendado · 3 MB máx."
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
                                            <h3 className="text-lg font-semibold">Live Preview</h3>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="text-editor-text-secondary text-xs uppercase">Meta Title</p>
                                                <p className="text-editor-text-primary font-medium">{metaTitle || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-editor-text-secondary text-xs uppercase">Description</p>
                                                <p className="text-editor-text-secondary">{metaDescription || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-editor-text-secondary text-xs uppercase">Keywords</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {keywordsArray.length === 0 ? (
                                                        <span className="text-editor-text-secondary text-xs">No keywords</span>
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
                                        <h3 className="text-lg font-semibold mb-3">Publishing checklist</h3>
                                        <ul className="space-y-3 text-sm">
                                            <ChecklistItem checked={Boolean(faviconUrl)} label="Favicon subido" />
                                            <ChecklistItem checked={Boolean(socialImageUrl)} label="Imagen social configurada" />
                                            <ChecklistItem checked={siteDescription.length >= 60} label="Descripción corta (>60 caracteres)" />
                                            <ChecklistItem checked={metaDescription.length >= 80} label="Meta description optimizada" />
                                            <ChecklistItem checked={keywordsArray.length >= 3} label="Mínimo 3 keywords" />
                                        </ul>
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 space-y-3 text-sm text-editor-text-secondary">
                                        <h3 className="text-blue-400 font-semibold flex items-center gap-2">
                                            <Info className="w-4 h-4" />
                                            Recomendaciones
                                        </h3>
                                        <p>• Mantén el meta title debajo de 60 caracteres.</p>
                                        <p>• Utiliza el long description como base para IA y documentación.</p>
                                        <p>• Actualiza favicon/social image si cambias de branding.</p>
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

const AssetUploader: React.FC<AssetUploaderProps> = ({ title, description, imageUrl, isUploading, onUpload, onRemove }) => (
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
                    Remove
                </button>
            )}
        </div>
        <div className="aspect-video bg-editor-panel-bg flex items-center justify-center rounded-lg mb-3 border border-editor-border/60 overflow-hidden">
            {imageUrl ? (
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
                <div className="text-center text-editor-text-secondary text-xs px-4">
                    No file uploaded
                </div>
            )}
        </div>
        <button
            onClick={onUpload}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-editor-border text-sm font-medium hover:bg-editor-border/40 transition-colors disabled:opacity-50"
        >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Subiendo...' : imageUrl ? 'Actualizar archivo' : 'Subir archivo'}
        </button>
    </div>
);

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



