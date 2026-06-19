import React from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type {
    SelectedStorefrontNode,
    StorefrontEditorBlock,
    StorefrontEditorBlockKind,
} from '../../../../types/storefrontEditor';

interface StorefrontEditorBlockTreeProps {
    sectionId: string;
    blocks: StorefrontEditorBlock[];
    allowedBlocks: StorefrontEditorBlockKind[];
    selectedNode: SelectedStorefrontNode;
    onSelect: (node: SelectedStorefrontNode) => void;
    onToggleBlock: (sectionId: string, blockId: string, enabled: boolean) => void;
    onRemoveBlock: (sectionId: string, blockId: string) => void;
    onAddBlock: (sectionId: string, kind: StorefrontEditorBlockKind) => void;
}

const StorefrontEditorBlockTree: React.FC<StorefrontEditorBlockTreeProps> = ({
    sectionId,
    blocks,
    allowedBlocks,
    selectedNode,
    onSelect,
    onToggleBlock,
    onRemoveBlock,
    onAddBlock,
}) => (
    <div className="ml-8 mt-1 space-y-1 border-l border-q-border pl-2">
        {blocks.map(block => {
            const isSelected = selectedNode.nodeType === 'block' && selectedNode.id === block.id;
            return (
                <div
                    key={block.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect({ nodeType: 'block', id: block.id, parentId: sectionId })}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelect({ nodeType: 'block', id: block.id, parentId: sectionId });
                        }
                    }}
                    className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ${
                        isSelected
                            ? 'border-sky-400 bg-sky-500/10'
                            : 'border-transparent hover:bg-secondary/60'
                    } ${block.enabled === false ? 'opacity-50' : ''}`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-q-text-muted" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-foreground">{block.label}</span>
                        <span className="block truncate text-[11px] text-q-text-muted">{block.kind}</span>
                    </span>
                    <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleBlock(sectionId, block.id, block.enabled === false);
                            }}
                            className="rounded p-1 text-q-text-muted hover:bg-secondary hover:text-foreground"
                            aria-label={block.enabled === false ? 'Mostrar bloque' : 'Ocultar bloque'}
                        >
                            {block.enabled === false ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemoveBlock(sectionId, block.id);
                            }}
                            className="rounded p-1 text-red-400 hover:bg-red-500/10"
                            aria-label="Eliminar bloque"
                        >
                            <Trash2 size={12} />
                        </button>
                    </span>
                </div>
            );
        })}

        {allowedBlocks.length > 0 && (
            <div className="pt-1">
                <button
                    type="button"
                    onClick={() => onAddBlock(sectionId, allowedBlocks[0])}
                    className="flex w-full items-center justify-between rounded-md border border-dashed border-q-border px-2 py-1.5 text-xs font-semibold text-q-text-muted hover:border-primary/50 hover:text-primary"
                >
                    <span>Agregar bloque</span>
                    <Plus size={13} />
                </button>
            </div>
        )}
    </div>
);

export default StorefrontEditorBlockTree;
