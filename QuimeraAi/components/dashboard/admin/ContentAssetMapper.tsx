/**
 * ContentAssetMapper
 * Vista de trazabilidad bidireccional entre assets y contenido.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMedia } from '../../../contexts/media';
import { useAppContent } from '../../../contexts/appContent';
import { MEDIA_CATEGORY_MAP } from '../../../types/media';
import {
    FileText, Image as ImageIcon, FolderOpen, Link2, Search, X,
} from 'lucide-react';

export default function ContentAssetMapper() {
    const { t } = useTranslation();
    const { mediaAssets } = useMedia();
    const { articles } = useAppContent();

    const [view, setView] = useState<'byAsset' | 'byContent'>('byAsset');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAssets = useMemo(() => {
        if (!searchQuery) return mediaAssets;
        const q = searchQuery.toLowerCase();
        return mediaAssets.filter(a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }, [mediaAssets, searchQuery]);

    const assetsByUsage = useMemo(() => {
        const unused: typeof filteredAssets = [];
        const used: { asset: typeof filteredAssets[0]; contentRefs: string[] }[] = [];
        filteredAssets.forEach(asset => {
            if (asset.usedIn && asset.usedIn.length > 0) used.push({ asset, contentRefs: asset.usedIn });
            else unused.push(asset);
        });
        return { used, unused };
    }, [filteredAssets]);

    const getContentInfo = (ref: string): { name: string; id: string } => {
        const parts = ref.split(':');
        const contentId = parts.length > 1 ? parts[1] : ref;
        const article = articles.find(a => a.id === contentId);
        return { name: article?.title || contentId, id: contentId };
    };

    const contentAssets = useMemo(() => {
        return articles.map(article => {
            const assetsUsed = mediaAssets.filter(a =>
                a.usedIn?.some(ref => ref === article.id || ref === `article:${article.id}`)
            );
            return { article, assets: assetsUsed };
        }).filter(ca => ca.assets.length > 0 || !searchQuery);
    }, [articles, mediaAssets, searchQuery]);

    return (
        <div className="flex-1 flex flex-col h-full bg-q-bg overflow-hidden">
            <div className="p-4 border-b border-q-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link2 size={20} className="text-q-accent" />
                    <h2 className="font-semibold text-q-text">{t('superadmin.contentMapper.title', 'Contenido Asociado')}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-secondary rounded-lg p-0.5">
                        <button onClick={() => setView('byAsset')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'byAsset' ? 'bg-q-surface text-foreground shadow-sm' : 'text-q-text-muted hover:text-foreground'}`}>{t('superadmin.contentMapper.byAsset', 'Por Asset')}</button>
                        <button onClick={() => setView('byContent')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'byContent' ? 'bg-q-surface text-foreground shadow-sm' : 'text-q-text-muted hover:text-foreground'}`}>{t('superadmin.contentMapper.byContent', 'Por Contenido')}</button>
                    </div>
                    <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-1.5">
                        <Search size={14} className="text-q-text-muted flex-shrink-0" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('superadmin.media.search', 'Buscar...')} className="flex-1 bg-transparent outline-none text-xs min-w-0 w-32" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-q-text-muted hover:text-foreground"><X size={14} /></button>}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {view === 'byAsset' ? (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {assetsByUsage.used.length === 0 ? (
                            <div className="text-center py-16 text-q-text-muted">
                                <Link2 size={48} className="mx-auto mb-4 opacity-30" />
                                <p className="text-sm">{t('superadmin.contentMapper.noLinks', 'Ningun asset esta vinculado a contenido')}</p>
                                <p className="text-xs mt-1 opacity-70">{t('superadmin.contentMapper.noLinksDesc', 'Los vinculos se crean automaticamente al usar imagenes en articulos o templates')}</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-sm font-bold text-q-text-muted uppercase tracking-wide">{t('superadmin.contentMapper.linkedAssets', { count: assetsByUsage.used.length })}</h3>
                                {assetsByUsage.used.map(({ asset, contentRefs }) => {
                                    const cfg = MEDIA_CATEGORY_MAP[asset.category];
                                    return (
                                        <div key={asset.id} className="bg-q-surface/80 border border-q-border rounded-xl p-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary"><img src={asset.downloadURL} alt={asset.name} className="w-full h-full object-cover" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${cfg?.color || 'bg-q-surface-overlay/10 text-q-text-muted border-q-border/30'}`}>{cfg?.label || asset.category}</span>
                                                        <h4 className="font-medium text-sm truncate">{asset.name}</h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">{contentRefs.map(ref => { const info = getContentInfo(ref); return (<span key={ref} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-q-accent/10 text-q-accent rounded-full border border-q-accent/20"><FileText size={10} /><span className="max-w-[200px] truncate">{info.name}</span></span>); })}</div>
                                                </div>
                                                <span className="text-xs text-q-text-muted">{t('superadmin.contentMapper.usesCount', { count: contentRefs.length })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {assetsByUsage.unused.length > 0 && (
                                    <>
                                        <h3 className="text-sm font-bold text-q-text-muted uppercase tracking-wide pt-4">{t('superadmin.contentMapper.assetsWithoutUse', { count: assetsByUsage.unused.length })}</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {assetsByUsage.unused.slice(0, 12).map(asset => (
                                                <div key={asset.id} className="bg-q-surface/60 border border-q-border rounded-lg p-2 flex items-center gap-2 opacity-60">
                                                    <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-secondary"><img src={asset.downloadURL} alt="" className="w-full h-full object-cover" /></div>
                                                    <span className="text-xs truncate">{asset.name}</span>
                                                </div>
                                            ))}
                                            {assetsByUsage.unused.length > 12 && <div className="flex items-center justify-center text-xs text-q-text-muted">+{assetsByUsage.unused.length - 12} mas</div>}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {contentAssets.filter(ca => ca.assets.length > 0).length === 0 ? (
                            <div className="text-center py-16 text-q-text-muted"><FileText size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm">{t('superadmin.contentMapper.noLinks', 'Ningun contenido tiene assets vinculados')}</p></div>
                        ) : (
                            contentAssets.filter(ca => ca.assets.length > 0).map(({ article, assets }) => (
                                <div key={article.id} className="bg-q-surface/80 border border-q-border rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-4"><FileText size={16} className="text-q-accent" /><h4 className="font-medium text-sm">{article.title || t('superadmin.contentMapper.noLinks', 'Sin titulo')}</h4><span className="text-xs text-q-text-muted ml-auto">{t('superadmin.contentMapper.imagesCount', { count: assets.length })}</span></div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {assets.map(asset => (<div key={asset.id} className="relative group"><div className="aspect-square rounded-lg overflow-hidden bg-secondary"><img src={asset.downloadURL} alt={asset.name} className="w-full h-full object-cover" /></div><p className="text-[10px] text-q-text-muted mt-1 truncate">{asset.name}</p></div>))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
