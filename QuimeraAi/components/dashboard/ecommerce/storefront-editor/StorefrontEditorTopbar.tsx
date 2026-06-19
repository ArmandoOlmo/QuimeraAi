import React from 'react';
import {
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    Loader2,
    MoreHorizontal,
    Redo2,
    RefreshCw,
    Save,
    Undo2,
} from 'lucide-react';
import StorefrontEditorDeviceSwitch, { type StorefrontEditorPreviewMode } from './StorefrontEditorDeviceSwitch';

interface StorefrontEditorTopbarProps {
    storeName: string;
    pageLabel: string;
    templateState: 'draft' | 'published';
    previewMode: StorefrontEditorPreviewMode;
    storefrontUrl: string;
    isBusy: boolean;
    onBack?: () => void;
    onPreviewModeChange: (mode: StorefrontEditorPreviewMode) => void;
    onRefreshPreview: () => void;
    onSaveDraft: () => void;
    onPublish: () => void;
}

const StorefrontEditorTopbar: React.FC<StorefrontEditorTopbarProps> = ({
    storeName,
    pageLabel,
    templateState,
    previewMode,
    storefrontUrl,
    isBusy,
    onBack,
    onPreviewModeChange,
    onRefreshPreview,
    onSaveDraft,
    onPublish,
}) => (
    <header className="flex h-12 flex-shrink-0 items-center justify-between gap-3 border-b border-q-border bg-q-bg px-3 text-foreground">
        <div className="flex min-w-0 items-center gap-2">
            <button
                type="button"
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-md text-q-text-muted hover:bg-secondary/70 hover:text-foreground"
                aria-label="Volver"
            >
                <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">{storeName}</p>
                    <span className={`hidden rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide md:inline-flex ${
                        templateState === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-300'
                    }`}>
                        {templateState === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                </div>
                <p className="truncate text-[11px] text-q-text-muted">{pageLabel}</p>
            </div>
        </div>

        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
            <StorefrontEditorDeviceSwitch value={previewMode} onChange={onPreviewModeChange} />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
            <button
                type="button"
                disabled
                className="hidden h-8 w-8 items-center justify-center rounded-md text-q-text-muted opacity-40 md:flex"
                aria-label="Deshacer"
            >
                <Undo2 size={15} />
            </button>
            <button
                type="button"
                disabled
                className="hidden h-8 w-8 items-center justify-center rounded-md text-q-text-muted opacity-40 md:flex"
                aria-label="Rehacer"
            >
                <Redo2 size={15} />
            </button>
            <button
                type="button"
                onClick={onRefreshPreview}
                className="flex h-8 w-8 items-center justify-center rounded-md text-q-text-muted hover:bg-secondary/70 hover:text-foreground"
                aria-label="Actualizar preview"
            >
                <RefreshCw size={15} />
            </button>
            <a
                href={storefrontUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden h-8 items-center gap-2 rounded-md px-2.5 text-xs font-semibold text-q-text-muted hover:bg-secondary/70 hover:text-foreground lg:flex"
            >
                <ExternalLink size={14} />
                Preview
            </a>
            <button
                type="button"
                onClick={onSaveDraft}
                disabled={isBusy}
                className="flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-semibold text-q-text-muted hover:bg-secondary/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isBusy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                <span className="hidden sm:inline">Guardar</span>
            </button>
            <button
                type="button"
                onClick={onPublish}
                disabled={isBusy}
                className="quimera-guide-cta flex h-8 items-center gap-2 rounded-md px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
                <CheckCircle2 size={14} />
                <span>Publicar</span>
            </button>
            <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-q-text-muted hover:bg-secondary/70 hover:text-foreground"
                aria-label="Más opciones"
            >
                <MoreHorizontal size={16} />
            </button>
        </div>
    </header>
);

export default StorefrontEditorTopbar;
