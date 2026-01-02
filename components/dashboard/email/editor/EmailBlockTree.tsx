/**
 * EmailBlockTree
 * Left sidebar showing the list of email blocks with drag-and-drop
 * Follows the same pattern as ComponentTree.tsx for familiarity
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Image,
    Type,
    MousePointerClick,
    Minus,
    MoveVertical,
    Share2,
    AlignJustify,
    Columns,
    ShoppingBag,
    Plus,
    GripVertical,
    Eye,
    EyeOff,
    Trash2,
    Copy,
    X,
    Search,
    ChevronDown,
    LayoutTemplate,
} from 'lucide-react';
import { useEmailEditor } from './EmailEditor';
import { EmailBlock, EmailBlockType } from '../../../../types/email';

// =============================================================================
// BLOCK ICONS & LABELS
// =============================================================================

const blockIcons: Record<EmailBlockType, React.ElementType> = {
    hero: Image,
    text: Type,
    image: Image,
    button: MousePointerClick,
    divider: Minus,
    spacer: MoveVertical,
    columns: Columns,
    products: ShoppingBag,
    social: Share2,
    footer: AlignJustify,
};

const blockLabels: Record<EmailBlockType, string> = {
    hero: 'Hero',
    text: 'Texto',
    image: 'Imagen',
    button: 'Botón',
    divider: 'Divisor',
    spacer: 'Espaciador',
    columns: 'Columnas',
    products: 'Productos',
    social: 'Redes Sociales',
    footer: 'Pie de Email',
};

// Available blocks for adding
const AVAILABLE_BLOCKS: EmailBlockType[] = [
    'hero',
    'text',
    'image',
    'button',
    'divider',
    'spacer',
    'products',
    'columns',
    'social',
    'footer',
];

// =============================================================================
// SORTABLE BLOCK ITEM
// =============================================================================

interface SortableBlockItemProps {
    block: EmailBlock;
    isActive: boolean;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
    block,
    isActive,
    onSelect,
    onToggleVisibility,
    onDuplicate,
    onDelete,
}) => {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };
    
    const Icon = blockIcons[block.type] || Type;
    
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all rounded-lg
                ${isActive 
                    ? 'bg-editor-accent/10 text-editor-accent border border-editor-accent/30' 
                    : 'text-editor-text-primary hover:bg-editor-panel-bg/50 border border-transparent'
                }
                ${isDragging ? 'opacity-50 shadow-lg bg-editor-panel-bg' : ''}
                ${!block.visible ? 'opacity-50' : ''}
            `}
            onClick={onSelect}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical 
                    size={14} 
                    className="text-editor-text-secondary hover:text-editor-text-primary"
                />
            </div>
            
            {/* Icon */}
            <Icon size={16} className="flex-shrink-0" />
            
            {/* Label */}
            <span className="flex-1 text-sm font-medium truncate">
                {blockLabels[block.type]}
            </span>
            
            {/* Action buttons */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility();
                    }}
                    className="flex-shrink-0 p-1.5 rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/50 transition-colors"
                    title={block.visible ? t('email.hideBlock', 'Ocultar') : t('email.showBlock', 'Mostrar')}
                >
                    {block.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                    }}
                    className="flex-shrink-0 p-1.5 rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/50 transition-colors"
                    title={t('email.duplicateBlock', 'Duplicar')}
                >
                    <Copy size={14} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t('email.confirmDeleteBlock', '¿Eliminar este bloque?'))) {
                            onDelete();
                        }
                    }}
                    className="flex-shrink-0 p-1.5 rounded text-editor-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title={t('email.deleteBlock', 'Eliminar')}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

// =============================================================================
// DRAG OVERLAY
// =============================================================================

const DragOverlayItem: React.FC<{ block: EmailBlock }> = ({ block }) => {
    const Icon = blockIcons[block.type] || Type;
    
    return (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-editor-panel-bg border border-editor-accent rounded-lg shadow-xl">
            <GripVertical size={14} className="text-editor-accent" />
            <Icon size={16} className="text-editor-accent" />
            <span className="text-sm font-medium text-editor-text-primary">
                {blockLabels[block.type]}
            </span>
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const EmailBlockTree: React.FC = () => {
    const { t } = useTranslation();
    const {
        document,
        selectedBlockId,
        setSelectedBlockId,
        addBlock,
        deleteBlock,
        duplicateBlock,
        reorderBlocks,
        toggleBlockVisibility,
    } = useEmailEditor();
    
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState<string | null>(null);
    
    // Configure sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    // Filter blocks by search
    const filteredBlocks = document.blocks.filter(block => {
        if (!searchTerm) return true;
        return blockLabels[block.type].toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    // Filter available blocks by search
    const filteredAvailableBlocks = AVAILABLE_BLOCKS.filter(type => {
        if (!searchTerm) return true;
        return blockLabels[type].toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        
        if (!over || active.id === over.id) return;
        
        const oldIndex = document.blocks.findIndex(b => b.id === active.id);
        const newIndex = document.blocks.findIndex(b => b.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(document.blocks, oldIndex, newIndex);
            reorderBlocks(newOrder);
        }
    };
    
    const handleAddBlock = (type: EmailBlockType) => {
        addBlock(type);
        setShowAddMenu(false);
    };
    
    const activeBlock = activeId ? document.blocks.find(b => b.id === activeId) : null;
    
    return (
        <div className="h-full flex flex-col bg-editor-bg">
            {/* Header */}
            <div className="p-4 border-b border-editor-border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-editor-text-primary uppercase tracking-wider flex items-center gap-2">
                        <LayoutTemplate size={16} />
                        {t('email.blocks', 'Bloques')}
                    </h3>
                    <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="p-1.5 text-editor-accent hover:text-editor-accent-hover hover:bg-editor-accent/10 rounded-md transition-colors"
                        title={t('email.addBlock', 'Agregar bloque')}
                    >
                        {showAddMenu ? <X size={16} /> : <Plus size={16} />}
                    </button>
                </div>
                
                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary" />
                    <input
                        type="text"
                        placeholder={t('email.searchBlocks', 'Buscar bloques...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-editor-panel-bg border border-editor-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-editor-text-secondary hover:text-editor-text-primary"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Add Block Menu */}
            {showAddMenu && (
                <div className="p-3 border-b border-editor-border bg-editor-panel-bg/50">
                    <div className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
                        {t('email.addBlock', 'Agregar bloque')}
                    </div>
                    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {filteredAvailableBlocks.map(type => {
                            const Icon = blockIcons[type];
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleAddBlock(type)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-editor-bg border border-transparent hover:border-editor-border transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-md bg-editor-accent/10 flex items-center justify-center group-hover:bg-editor-accent/20 transition-colors">
                                        <Icon size={16} className="text-editor-accent" />
                                    </div>
                                    <span className="text-sm text-editor-text-primary font-medium">
                                        {blockLabels[type]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Block List */}
            <div className="flex-1 overflow-y-auto p-3">
                {document.blocks.length === 0 ? (
                    <div className="text-center py-8">
                        <LayoutTemplate size={32} className="mx-auto text-editor-text-secondary mb-3" />
                        <p className="text-sm text-editor-text-secondary mb-4">
                            {t('email.noBlocks', 'No hay bloques')}
                        </p>
                        <button
                            onClick={() => setShowAddMenu(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors text-sm font-medium"
                        >
                            <Plus size={16} />
                            {t('email.addFirstBlock', 'Agregar primer bloque')}
                        </button>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={document.blocks.map(b => b.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {filteredBlocks.map(block => (
                                    <SortableBlockItem
                                        key={block.id}
                                        block={block}
                                        isActive={selectedBlockId === block.id}
                                        onSelect={() => setSelectedBlockId(block.id)}
                                        onToggleVisibility={() => toggleBlockVisibility(block.id)}
                                        onDuplicate={() => duplicateBlock(block.id)}
                                        onDelete={() => deleteBlock(block.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                        
                        <DragOverlay>
                            {activeBlock ? <DragOverlayItem block={activeBlock} /> : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
            
            {/* Quick Add Footer */}
            {document.blocks.length > 0 && (
                <div className="p-3 border-t border-editor-border">
                    <button
                        onClick={() => setShowAddMenu(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-colors"
                    >
                        <Plus size={14} />
                        <span className="text-sm font-medium">{t('email.addBlock', 'Agregar bloque')}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmailBlockTree;






