/**
 * LandingNavigationManagement
 * Gestión de la navegación del landing page público de Quimera
 * Configura header, footer, y artículos destacados para el front page
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContent } from '../../../contexts/appContent';
import { useToast } from '../../../contexts/ToastContext';
import DashboardSidebar from '../DashboardSidebar';
import {
    Menu as MenuIcon,
    Plus,
    Save,
    Trash2,
    Globe,
    Layout,
    Loader2,
    GripVertical,
    ExternalLink,
    Link as LinkIcon,
    ChevronDown,
    ChevronUp,
    Settings,
    Star,
    FileText,
    Twitter,
    Linkedin,
    Instagram,
    Youtube,
    Github,
    MessageCircle,
    X,
    Eye
} from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import {
    AppNavigation,
    AppNavItem,
    AppFooterColumn,
    AppSocialLink,
    DEFAULT_APP_NAVIGATION,
    AppArticle
} from '../../../types/appContent';

interface LandingNavigationManagementProps {
    onBack: () => void;
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
    twitter: <Twitter size={16} />,
    linkedin: <Linkedin size={16} />,
    instagram: <Instagram size={16} />,
    youtube: <Youtube size={16} />,
    github: <Github size={16} />,
    discord: <MessageCircle size={16} />,
};

const LandingNavigationManagement: React.FC<LandingNavigationManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { navigation, isLoadingNavigation, saveNavigation, articles, featuredArticles } = useAppContent();
    const { showToast } = useToast();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'header' | 'footer' | 'featured'>('header');
    
    // Local state for editing
    const [localNav, setLocalNav] = useState<AppNavigation>(DEFAULT_APP_NAVIGATION);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize local state from context
    useEffect(() => {
        if (navigation) {
            setLocalNav(navigation);
        }
    }, [navigation]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveNavigation(localNav);
            setHasChanges(false);
            showToast(t('landingNavigation.messages.saveSuccess', 'Navigation saved successfully!'), 'success');
        } catch (error) {
            console.error('Error saving navigation:', error);
            showToast(t('landingNavigation.messages.saveError', 'Error saving navigation'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateLocalNav = (updates: Partial<AppNavigation>) => {
        setLocalNav(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    // ==========================================================================
    // HEADER ITEMS
    // ==========================================================================

    const addHeaderItem = () => {
        const newItem: AppNavItem = {
            id: `nav_${Date.now()}`,
            label: t('landingNavigation.common.newLink', 'New Link'),
            href: '/',
            type: 'link'
        };
        updateLocalNav({
            header: {
                ...localNav.header,
                items: [...localNav.header.items, newItem]
            }
        });
    };

    const updateHeaderItem = (id: string, updates: Partial<AppNavItem>) => {
        updateLocalNav({
            header: {
                ...localNav.header,
                items: localNav.header.items.map(item =>
                    item.id === id ? { ...item, ...updates } : item
                )
            }
        });
    };

    const deleteHeaderItem = (id: string) => {
        updateLocalNav({
            header: {
                ...localNav.header,
                items: localNav.header.items.filter(item => item.id !== id)
            }
        });
    };

    // ==========================================================================
    // FOOTER COLUMNS
    // ==========================================================================

    const addFooterColumn = () => {
        const newColumn: AppFooterColumn = {
            id: `col_${Date.now()}`,
            title: t('landingNavigation.footer.newColumn', 'New Column'),
            items: []
        };
        updateLocalNav({
            footer: {
                ...localNav.footer,
                columns: [...localNav.footer.columns, newColumn]
            }
        });
    };

    const updateFooterColumn = (id: string, updates: Partial<AppFooterColumn>) => {
        updateLocalNav({
            footer: {
                ...localNav.footer,
                columns: localNav.footer.columns.map(col =>
                    col.id === id ? { ...col, ...updates } : col
                )
            }
        });
    };

    const deleteFooterColumn = (id: string) => {
        updateLocalNav({
            footer: {
                ...localNav.footer,
                columns: localNav.footer.columns.filter(col => col.id !== id)
            }
        });
    };

    const addFooterItem = (columnId: string) => {
        const newItem: AppNavItem = {
            id: `item_${Date.now()}`,
            label: t('landingNavigation.common.newLink', 'New Link'),
            href: '/',
            type: 'link'
        };
        updateLocalNav({
            footer: {
                ...localNav.footer,
                columns: localNav.footer.columns.map(col =>
                    col.id === columnId
                        ? { ...col, items: [...col.items, newItem] }
                        : col
                )
            }
        });
    };

    const updateFooterItem = (columnId: string, itemId: string, updates: Partial<AppNavItem>) => {
        updateLocalNav({
            footer: {
                ...localNav.footer,
                columns: localNav.footer.columns.map(col =>
                    col.id === columnId
                        ? {
                            ...col,
                            items: col.items.map(item =>
                                item.id === itemId ? { ...item, ...updates } : item
                            )
                        }
                        : col
                )
            }
        });
    };

    const deleteFooterItem = (columnId: string, itemId: string) => {
        updateLocalNav({
            footer: {
                ...localNav.footer,
                columns: localNav.footer.columns.map(col =>
                    col.id === columnId
                        ? { ...col, items: col.items.filter(item => item.id !== itemId) }
                        : col
                )
            }
        });
    };

    // ==========================================================================
    // SOCIAL LINKS
    // ==========================================================================

    const addSocialLink = () => {
        const newLink: AppSocialLink = {
            id: `social_${Date.now()}`,
            platform: 'twitter',
            url: ''
        };
        updateLocalNav({
            footer: {
                ...localNav.footer,
                socialLinks: [...(localNav.footer.socialLinks || []), newLink]
            }
        });
    };

    const updateSocialLink = (id: string, updates: Partial<AppSocialLink>) => {
        updateLocalNav({
            footer: {
                ...localNav.footer,
                socialLinks: (localNav.footer.socialLinks || []).map(link =>
                    link.id === id ? { ...link, ...updates } : link
                )
            }
        });
    };

    const deleteSocialLink = (id: string) => {
        updateLocalNav({
            footer: {
                ...localNav.footer,
                socialLinks: (localNav.footer.socialLinks || []).filter(link => link.id !== id)
            }
        });
    };

    // Published articles for linking
    const publishedArticles = articles.filter(a => a.status === 'published');

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-q-bg border-b border-q-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-q-text-secondary hover:text-q-text lg:hidden transition-colors"
                        >
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Layout className="text-q-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-q-text">
                                {t('landingNavigation.title', 'App Landing Navigation')}
                            </h1>
                        </div>
                        <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            Quimera.ai
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasChanges && (
                            <span className="text-xs text-orange-500 font-medium">{t('landingNavigation.unsavedChanges', 'Unsaved changes')}</span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasChanges}
                            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {t('landingNavigation.saveChanges', 'Save Changes')}
                        </button>
                        <HeaderBackButton onClick={onBack} label={t('common.back', 'Back')} className="border-q-border/60 bg-q-surface/60 text-q-text-secondary hover:bg-q-surface-overlay/40 hover:text-q-text focus:ring-q-accent/25" />
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-q-bg">
                    <div className="max-w-5xl mx-auto">
                        
                        {/* Info Banner */}
                        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Globe className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="text-sm font-semibold text-q-text mb-1">
                                        {t('landingNavigation.configTitle', 'Public Landing Page Configuration')}
                                    </h4>
                                    <p className="text-xs text-q-text-muted">
                                        {t('landingNavigation.configDesc', 'Configure the navigation and footer for the Quimera.ai public landing page. Changes will be visible to all visitors.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 border-b border-q-border">
                            <button
                                onClick={() => setActiveTab('header')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'header'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-q-text-muted hover:text-q-text'
                                }`}
                            >
                                <Layout size={14} className="inline mr-2" />
                                {t('landingNavigation.tabs.header', 'Header Navigation')}
                            </button>
                            <button
                                onClick={() => setActiveTab('footer')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'footer'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-q-text-muted hover:text-q-text'
                                }`}
                            >
                                <Settings size={14} className="inline mr-2" />{t('landingNavigation.tabs.footer', 'Footer')}</button>
                            <button
                                onClick={() => setActiveTab('featured')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'featured'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-q-text-muted hover:text-q-text'
                                }`}
                            >
                                <Star size={14} className="inline mr-2" />
                                {t('landingNavigation.tabs.featured', 'Featured Articles')}
                            </button>
                        </div>

                        {isLoadingNavigation ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                {/* Header Tab */}
                                {activeTab === 'header' && (
                                    <div className="space-y-6">
                                        {/* {t('landingNavigation.header.logoSettings', 'Logo Settings')} */}
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <h3 className="font-semibold mb-4">{t('landingNavigation.header.logoSettings', 'Logo Settings')}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-q-text-muted mb-2">
                                                        {t('landingNavigation.header.logoText', 'Logo Text')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={localNav.header.logo?.text || ''}
                                                        onChange={(e) => updateLocalNav({
                                                            header: {
                                                                ...localNav.header,
                                                                logo: { ...localNav.header.logo!, text: e.target.value }
                                                            }
                                                        })}
                                                        className="w-full px-3 py-2 bg-secondary/30 border border-q-border rounded-lg outline-none focus:border-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-q-text-muted mb-2">
                                                        {t('landingNavigation.header.logoImageUrl', 'Logo Image URL')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={localNav.header.logo?.imageUrl || ''}
                                                        onChange={(e) => updateLocalNav({
                                                            header: {
                                                                ...localNav.header,
                                                                logo: { ...localNav.header.logo!, imageUrl: e.target.value }
                                                            }
                                                        })}
                                                        className="w-full px-3 py-2 bg-secondary/30 border border-q-border rounded-lg outline-none focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Navigation Items */}
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold">{t('landingNavigation.header.navigationLinks', 'Navigation Links')}</h3>
                                                <button
                                                    onClick={addHeaderItem}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                >
                                                    <Plus size={14} />
                                                    {t('landingNavigation.common.addLink', 'Add Link')}
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {localNav.header.items.map((item, index) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg group"
                                                    >
                                                        <GripVertical size={16} className="text-q-text-muted cursor-move" />
                                                        <input
                                                            type="text"
                                                            value={item.label}
                                                            onChange={(e) => updateHeaderItem(item.id, { label: e.target.value })}
                                                            className="flex-1 px-2 py-1 bg-q-bg border border-q-border rounded text-sm"
                                                            placeholder={t('landingNavigation.common.labelPlaceholder', 'Label')}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={item.href}
                                                            onChange={(e) => updateHeaderItem(item.id, { href: e.target.value })}
                                                            className="flex-1 px-2 py-1 bg-q-bg border border-q-border rounded text-sm"
                                                            placeholder={t('landingNavigation.header.urlPlaceholder', 'URL or #section')}
                                                        />
                                                        <select
                                                            value={item.type}
                                                            onChange={(e) => updateHeaderItem(item.id, { type: e.target.value as any })}
                                                            className="px-2 py-1 bg-q-bg border border-q-border rounded text-sm"
                                                        >
                                                            <option value="link">{t('landingNavigation.header.typePage', 'Page Link')}</option>
                                                            <option value="anchor">{t('landingNavigation.header.typeAnchor', 'Anchor (#)')}</option>
                                                            <option value="article">{t('landingNavigation.header.typeArticle', 'Article')}</option>
                                                        </select>
                                                        {item.type === 'article' && (
                                                            <select
                                                                value={item.articleSlug || ''}
                                                                onChange={(e) => updateHeaderItem(item.id, { 
                                                                    articleSlug: e.target.value,
                                                                    href: `/blog/${e.target.value}`
                                                                })}
                                                                className="px-2 py-1 bg-q-bg border border-q-border rounded text-sm"
                                                            >
                                                                <option value="">{t('landingNavigation.header.selectArticle', 'Select article')}</option>
                                                                {publishedArticles.map(a => (
                                                                    <option key={a.id} value={a.slug}>{a.title}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        <button
                                                            onClick={() => deleteHeaderItem(item.id)}
                                                            className="p-1.5 text-q-text-muted hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}

                                                {localNav.header.items.length === 0 && (
                                                    <p className="text-sm text-q-text-muted text-center py-8">
                                                        No navigation items. Click "{t('landingNavigation.common.addLink', 'Add Link')}" to create one.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* CTA Buttons */}
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <h3 className="font-semibold mb-4">{t('landingNavigation.header.ctaButtons', 'Call-to-Action Buttons')}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-q-text-muted mb-2">
                                                        {t('landingNavigation.header.loginText', 'Login Button Text')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={localNav.header.cta?.loginText || ''}
                                                        onChange={(e) => updateLocalNav({
                                                            header: {
                                                                ...localNav.header,
                                                                cta: { ...localNav.header.cta!, loginText: e.target.value }
                                                            }
                                                        })}
                                                        className="w-full px-3 py-2 bg-secondary/30 border border-q-border rounded-lg outline-none focus:border-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-q-text-muted mb-2">
                                                        {t('landingNavigation.header.registerText', 'Register Button Text')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={localNav.header.cta?.registerText || ''}
                                                        onChange={(e) => updateLocalNav({
                                                            header: {
                                                                ...localNav.header,
                                                                cta: { ...localNav.header.cta!, registerText: e.target.value }
                                                            }
                                                        })}
                                                        className="w-full px-3 py-2 bg-secondary/30 border border-q-border rounded-lg outline-none focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer Tab */}
                                {activeTab === 'footer' && (
                                    <div className="space-y-6">
                                        {/* {t('landingNavigation.footer.columns', 'Footer Columns')} */}
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold">{t('landingNavigation.footer.columns', 'Footer Columns')}</h3>
                                                <button
                                                    onClick={addFooterColumn}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                >
                                                    <Plus size={14} />
                                                    {t('landingNavigation.footer.addColumn', 'Add Column')}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {localNav.footer.columns.map(column => (
                                                    <div key={column.id} className="bg-secondary/20 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <input
                                                                type="text"
                                                                value={column.title}
                                                                onChange={(e) => updateFooterColumn(column.id, { title: e.target.value })}
                                                                className="font-medium bg-transparent border-b border-transparent hover:border-q-border focus:border-primary outline-none"
                                                            />
                                                            <button
                                                                onClick={() => deleteFooterColumn(column.id)}
                                                                className="p-1 text-q-text-muted hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {column.items.map(item => (
                                                                <div key={item.id} className="flex items-center gap-2 group">
                                                                    <input
                                                                        type="text"
                                                                        value={item.label}
                                                                        onChange={(e) => updateFooterItem(column.id, item.id, { label: e.target.value })}
                                                                        className="flex-1 px-2 py-1 text-sm bg-q-bg border border-q-border rounded"
                                                                        placeholder={t('landingNavigation.common.labelPlaceholder', 'Label')}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={item.href}
                                                                        onChange={(e) => updateFooterItem(column.id, item.id, { href: e.target.value })}
                                                                        className="flex-1 px-2 py-1 text-sm bg-q-bg border border-q-border rounded"
                                                                        placeholder={t('landingNavigation.common.urlPlaceholder', 'URL')}
                                                                    />
                                                                    <button
                                                                        onClick={() => deleteFooterItem(column.id, item.id)}
                                                                        className="p-1 text-q-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button
                                                            onClick={() => addFooterItem(column.id)}
                                                            className="mt-3 w-full py-1.5 text-xs text-q-text-muted hover:text-primary border border-dashed border-q-border hover:border-primary rounded transition-colors"
                                                        >
                                                            + {t('landingNavigation.common.addLink', 'Add Link')}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* {t('landingNavigation.footer.socialLinks', 'Social Links')} */}
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold">{t('landingNavigation.footer.socialLinks', 'Social Links')}</h3>
                                                <button
                                                    onClick={addSocialLink}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                >
                                                    <Plus size={14} />
                                                    {t('landingNavigation.footer.addSocial', 'Add Social')}
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {(localNav.footer.socialLinks || []).map(link => (
                                                    <div key={link.id} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg group">
                                                        <span className="text-q-text-muted">
                                                            {SOCIAL_ICONS[link.platform]}
                                                        </span>
                                                        <select
                                                            value={link.platform}
                                                            onChange={(e) => updateSocialLink(link.id, { platform: e.target.value as any })}
                                                            className="px-2 py-1 bg-q-bg border border-q-border rounded text-sm"
                                                        >
                                                            <option value="twitter">Twitter</option>
                                                            <option value="linkedin">LinkedIn</option>
                                                            <option value="instagram">Instagram</option>
                                                            <option value="youtube">YouTube</option>
                                                            <option value="github">GitHub</option>
                                                            <option value="discord">Discord</option>
                                                        </select>
                                                        <input
                                                            type="text"
                                                            value={link.url}
                                                            onChange={(e) => updateSocialLink(link.id, { url: e.target.value })}
                                                            className="flex-1 px-2 py-1 bg-q-bg border border-q-border rounded text-sm"
                                                            placeholder="https://..."
                                                        />
                                                        <button
                                                            onClick={() => deleteSocialLink(link.id)}
                                                            className="p-1.5 text-q-text-muted hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Footer Text */}
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <h3 className="font-semibold mb-4">{t('landingNavigation.footer.settings', 'Footer Settings')}</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-q-text-muted mb-2">
                                                        {t('landingNavigation.footer.copyright', 'Copyright Text')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={localNav.footer.bottomText || ''}
                                                        onChange={(e) => updateLocalNav({
                                                            footer: { ...localNav.footer, bottomText: e.target.value }
                                                        })}
                                                        className="w-full px-3 py-2 bg-secondary/30 border border-q-border rounded-lg outline-none focus:border-primary"
                                                        placeholder="© 2024 Your Company. All rights reserved."
                                                    />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={localNav.footer.showNewsletter || false}
                                                            onChange={(e) => updateLocalNav({
                                                                footer: { ...localNav.footer, showNewsletter: e.target.checked }
                                                            })}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm">{t('landingNavigation.footer.showNewsletter', 'Show Newsletter Section')}</span>
                                                    </label>
                                                </div>
                                                {localNav.footer.showNewsletter && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                                                        <div>
                                                            <label className="block text-sm font-medium text-q-text-muted mb-2">
                                                                {t('landingNavigation.footer.newsletterTitle', 'Newsletter Title')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={localNav.footer.newsletterTitle || ''}
                                                                onChange={(e) => updateLocalNav({
                                                                    footer: { ...localNav.footer, newsletterTitle: e.target.value }
                                                                })}
                                                                className="w-full px-3 py-2 bg-secondary/30 border border-q-border rounded-lg outline-none focus:border-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-q-text-muted mb-2">
                                                                {t('landingNavigation.footer.newsletterDescription', 'Newsletter Description')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={localNav.footer.newsletterDescription || ''}
                                                                onChange={(e) => updateLocalNav({
                                                                    footer: { ...localNav.footer, newsletterDescription: e.target.value }
                                                                })}
                                                                className="w-full px-3 py-2 bg-secondary/30 border border-q-border rounded-lg outline-none focus:border-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* {t('landingNavigation.tabs.featured', 'Featured Articles')} Tab */}
                                {activeTab === 'featured' && (
                                    <div className="space-y-6">
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <h3 className="font-semibold mb-2">{t('landingNavigation.tabs.featured', 'Featured Articles')} on Homepage</h3>
                                            <p className="text-sm text-q-text-muted mb-6">
                                                {t('landingNavigation.featured.desc', 'Articles marked as "Featured" will appear on the public landing page. Go to Content Management to edit articles.')}
                                            </p>

                                            {featuredArticles.length === 0 ? (
                                                <div className="text-center py-12 bg-secondary/20 rounded-lg">
                                                    <Star className="w-12 h-12 mx-auto text-q-text-muted opacity-30 mb-3" />
                                                    <p className="text-q-text-muted mb-2">{t('landingNavigation.featured.noArticles', 'No featured articles')}</p>
                                                    <p className="text-sm text-q-text-muted">
                                                        {t('landingNavigation.featured.noArticlesDesc', 'Mark articles as "Featured" in Content Management to show them here.')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {featuredArticles.map(article => (
                                                        <div
                                                            key={article.id}
                                                            className="bg-secondary/20 rounded-lg overflow-hidden"
                                                        >
                                                            {article.featuredImage ? (
                                                                <img
                                                                    src={article.featuredImage}
                                                                    alt={article.title}
                                                                    className="w-full h-32 object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-32 bg-secondary flex items-center justify-center">
                                                                    <FileText className="w-8 h-8 text-q-text-muted opacity-30" />
                                                                </div>
                                                            )}
                                                            <div className="p-4">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                                    <span className="text-xs text-yellow-600 font-medium">{t('landingNavigation.featured.featuredLabel', 'Featured')}</span>
                                                                </div>
                                                                <h4 className="font-medium text-sm line-clamp-2 mb-2">
                                                                    {article.title}
                                                                </h4>
                                                                <p className="text-xs text-q-text-muted line-clamp-2">
                                                                    {article.excerpt}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* {t('landingNavigation.featured.allPublished', 'All Published Articles')} */}
                                        <div className="bg-q-surface border border-q-border rounded-xl p-6">
                                            <h3 className="font-semibold mb-4">{t('landingNavigation.featured.allPublished', 'All Published Articles')}</h3>
                                            <div className="space-y-2">
                                                {publishedArticles.map(article => (
                                                    <div
                                                        key={article.id}
                                                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {article.featured && (
                                                                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                            )}
                                                            <span className="text-sm font-medium">{article.title}</span>
                                                            <span className="text-xs text-q-text-muted">
                                                                /blog/{article.slug}
                                                            </span>
                                                        </div>
                                                        <a
                                                            href={`/blog/${article.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                                                        >
                                                            <Eye size={12} />{t('landingNavigation.common.preview', 'Preview')}</a>
                                                    </div>
                                                ))}

                                                {publishedArticles.length === 0 && (
                                                    <p className="text-sm text-q-text-muted text-center py-8">
                                                        {t('landingNavigation.featured.noPublished', 'No published articles yet.')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LandingNavigationManagement;
