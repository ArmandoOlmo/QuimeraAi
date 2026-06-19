import React, { useMemo, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Layers, MoveDown, MoveUp, Plus, Settings, Trash2 } from 'lucide-react';
import type { StorefrontSectionKind } from '../../../../types/storefrontRenderer';
import type {
    SelectedStorefrontNode,
    StorefrontEditorBlockKind,
    StorefrontEditorGroup,
    StorefrontEditorSection,
} from '../../../../types/storefrontEditor';
import { storefrontSectionRegistry, STOREFRONT_SECTION_KINDS } from '../../../../utils/storefrontRenderer';
import StorefrontEditorBlockTree from './StorefrontEditorBlockTree';

const groupLabels: Record<StorefrontEditorGroup, string> = {
    header: 'Header',
    template: 'Template',
    footer: 'Footer',
    overlay: 'Overlay',
};

const groupOrder: StorefrontEditorGroup[] = ['header', 'template', 'footer', 'overlay'];

interface StorefrontEditorSectionTreeProps {
    sections: StorefrontEditorSection[];
    selectedNode: SelectedStorefrontNode;
    onSelect: (node: SelectedStorefrontNode) => void;
    onToggleSection: (sectionId: string, enabled: boolean) => void;
    onMoveSection: (sectionId: string, direction: -1 | 1) => void;
    onRemoveSection: (sectionId: string) => void;
    onAddSection: (kind: StorefrontSectionKind, group?: StorefrontEditorGroup) => void;
    onToggleBlock: (sectionId: string, blockId: string, enabled: boolean) => void;
    onRemoveBlock: (sectionId: string, blockId: string) => void;
    onAddBlock: (sectionId: string, kind: StorefrontEditorBlockKind) => void;
}

const StorefrontEditorSectionTree: React.FC<StorefrontEditorSectionTreeProps> = ({
    sections,
    selectedNode,
    onSelect,
    onToggleSection,
    onMoveSection,
    onRemoveSection,
    onAddSection,
    onToggleBlock,
    onRemoveBlock,
    onAddBlock,
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        header: true,
        template: true,
        footer: true,
        overlay: true,
    });
    const [addGroup, setAddGroup] = useState<StorefrontEditorGroup | null>(null);

    const sectionsByGroup = useMemo(() => (
        groupOrder.reduce((acc, group) => {
            acc[group] = sections
                .filter(section => section.group === group)
                .slice()
                .sort((a, b) => a.order - b.order);
            return acc;
        }, {} as Record<StorefrontEditorGroup, StorefrontEditorSection[]>)
    ), [sections]);

    const usedCoreKinds = new Set(sections.map(section => section.kind));
    const availableByGroup = useMemo(() => (
        STOREFRONT_SECTION_KINDS
            .filter(kind => {
                const item = storefrontSectionRegistry[kind];
                if (item.isCoreSection && usedCoreKinds.has(kind)) return false;
                return true;
            })
            .reduce((acc, kind) => {
                const group = storefrontSectionRegistry[kind].group || 'template';
                acc[group].push(kind);
                return acc;
            }, { header: [], template: [], footer: [], overlay: [] } as Record<StorefrontEditorGroup, StorefrontSectionKind[]>)
    ), [usedCoreKinds]);

    return (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <div className="mb-3 px-2">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-q-text-muted">
                        Estructura de página
                    </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => onSelect({ nodeType: 'template', id: 'home' })}
                        className={`flex items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                            selectedNode.nodeType === 'template'
                                ? 'border-sky-400 bg-sky-500/10 text-sky-300'
                                : 'border-q-border text-q-text-muted hover:bg-secondary/70 hover:text-foreground'
                        }`}
                    >
                        <Settings size={13} />
                        Template
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelect({ nodeType: 'theme', id: 'theme' })}
                        className={`flex items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                            selectedNode.nodeType === 'theme' ? 'bg-primary/10 text-primary' : ''
                        } ${selectedNode.nodeType === 'theme'
                            ? 'border-sky-400 bg-sky-500/10 text-sky-300'
                            : 'border-q-border text-q-text-muted hover:bg-secondary/70 hover:text-foreground'
                        }`}
                    >
                        <Layers size={13} />
                        Tema
                    </button>
                </div>
            </div>

            {groupOrder.map(group => {
                const isExpanded = expandedGroups[group] !== false;
                const groupSections = sectionsByGroup[group];
                const availableSections = availableByGroup[group];

                return (
                    <div key={group} className="mb-3">
                        <button
                            type="button"
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !isExpanded }))}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary hover:bg-secondary/50"
                        >
                            <ChevronDown size={13} className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            <span>{groupLabels[group]}</span>
                            <span className="text-q-text-muted">({groupSections.length})</span>
                        </button>

                        {isExpanded && (
                            <div className="mt-1 space-y-1">
                                {groupSections.map((section, index) => {
                                    const isSelected = selectedNode.nodeType === 'section' && selectedNode.id === section.id;
                                    const item = storefrontSectionRegistry[section.kind];
                                    const variant = String(section.settings.variant || section.settings.layout || item.previewLabel || section.kind);

                                    return (
                                        <div key={section.id}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => onSelect({ nodeType: 'section', id: section.id })}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        onSelect({ nodeType: 'section', id: section.id });
                                                    }
                                                }}
                                                className={`group flex cursor-pointer items-center gap-2 rounded-md border p-2 text-left transition-colors ${
                                                    isSelected
                                                        ? 'border-sky-400 bg-sky-500/10'
                                                        : 'border-transparent hover:bg-secondary/60'
                                                } ${section.enabled === false ? 'opacity-50' : ''}`}
                                            >
                                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-muted text-xs font-bold text-q-text-muted">
                                                    {index + 1}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-foreground">{section.label}</span>
                                                    <span className="block truncate text-[11px] text-q-text-muted">{variant}</span>
                                                </span>
                                                <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        type="button"
                                                        disabled={index === 0}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onMoveSection(section.id, -1);
                                                        }}
                                                        className="rounded p-1 text-q-text-muted hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                                                        aria-label="Mover arriba"
                                                    >
                                                        <MoveUp size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={index === groupSections.length - 1}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onMoveSection(section.id, 1);
                                                        }}
                                                        className="rounded p-1 text-q-text-muted hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                                                        aria-label="Mover abajo"
                                                    >
                                                        <MoveDown size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onToggleSection(section.id, section.enabled === false);
                                                        }}
                                                        className="rounded p-1 text-q-text-muted hover:bg-secondary hover:text-foreground"
                                                        aria-label={section.enabled === false ? 'Mostrar sección' : 'Ocultar sección'}
                                                    >
                                                        {section.enabled === false ? <EyeOff size={12} /> : <Eye size={12} />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onRemoveSection(section.id);
                                                        }}
                                                        className="rounded p-1 text-red-400 hover:bg-red-500/10"
                                                        aria-label="Eliminar sección"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </span>
                                            </div>
                                            {item.supportsBlocks && (
                                                <StorefrontEditorBlockTree
                                                    sectionId={section.id}
                                                    blocks={section.blocks}
                                                    allowedBlocks={item.allowedBlocks || []}
                                                    selectedNode={selectedNode}
                                                    onSelect={onSelect}
                                                    onToggleBlock={onToggleBlock}
                                                    onRemoveBlock={onRemoveBlock}
                                                    onAddBlock={onAddBlock}
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="px-1 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setAddGroup(prev => prev === group ? null : group)}
                                        className="flex w-full items-center justify-between rounded-md border border-dashed border-q-border px-2 py-1.5 text-xs font-semibold text-q-text-muted hover:border-primary/50 hover:text-primary"
                                    >
                                        <span>Agregar sección</span>
                                        <Plus size={13} />
                                    </button>

                                    {addGroup === group && availableSections.length > 0 && (
                                        <div className="mt-2 space-y-1 rounded-md border border-q-border bg-q-bg p-1">
                                            {availableSections.slice(0, 8).map(kind => (
                                                <button
                                                    key={kind}
                                                    type="button"
                                                    onClick={() => {
                                                        onAddSection(kind, group);
                                                        setAddGroup(null);
                                                    }}
                                                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary/70"
                                                >
                                                    <span>{storefrontSectionRegistry[kind].label}</span>
                                                    <Plus size={12} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default StorefrontEditorSectionTree;
