/**
 * ProductsBlockControls
 * Controls for editing Products block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Plus, X, Search } from 'lucide-react';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailProductsContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, ...props }) => (
    <div className="mb-3">
        {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <input
            {...props}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
        />
    </div>
);

const ToggleControl: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
        >
            <span className={`${checked ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition mt-0.5 ml-0.5`} />
        </button>
    </div>
);

const ColumnSelector: React.FC<{ label: string; value: number; onChange: (value: number) => void }> = ({ label, value, onChange }) => {
    const options = [1, 2, 3];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`flex-1 py-1 text-sm font-medium rounded-sm transition-colors ${value === opt ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};

const PaddingSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['sm', 'md', 'lg'];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((size) => (
                    <button
                        key={size}
                        onClick={() => onChange(size)}
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                    >
                        {size.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// PROPS
// =============================================================================

interface ProductsBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const ProductsBlockControls: React.FC<ProductsBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    
    const content = block.content as EmailProductsContent;
    const styles = block.styles;
    
    const updateContent = (updates: Partial<EmailProductsContent>) => {
        updateBlock(block.id, {
            content: { ...content, ...updates },
        });
    };
    
    const updateStyles = (updates: Partial<EmailBlockStyles>) => {
        updateBlock(block.id, {
            styles: { ...styles, ...updates },
        });
    };
    
    const addProductId = () => {
        const newIds = [...(content.productIds || []), ''];
        updateContent({ productIds: newIds });
    };
    
    const updateProductId = (index: number, value: string) => {
        const newIds = [...(content.productIds || [])];
        newIds[index] = value;
        updateContent({ productIds: newIds });
    };
    
    const removeProductId = (index: number) => {
        const newIds = content.productIds?.filter((_, i) => i !== index) || [];
        updateContent({ productIds: newIds });
    };
    
    if (activeTab === 'content') {
        return (
            <div className="space-y-4">
                <div className="bg-editor-panel-bg/50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-editor-text-secondary flex items-center gap-2">
                        <Package size={14} />
                        {t('email.productsHint', 'Agrega IDs de productos de tu tienda para mostrarlos en el email')}
                    </p>
                </div>
                
                {/* Product IDs */}
                <div>
                    <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
                        {t('email.productIds', 'IDs de Productos')}
                    </label>
                    
                    <div className="space-y-2">
                        {(content.productIds || []).map((productId, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={productId}
                                    onChange={(e) => updateProductId(index, e.target.value)}
                                    placeholder={t('email.productIdPlaceholder', 'ID del producto...')}
                                    className="flex-1 bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                />
                                <button
                                    onClick={() => removeProductId(index)}
                                    className="p-2 text-editor-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <button
                        onClick={addProductId}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-editor-border rounded-md text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-colors"
                    >
                        <Plus size={14} />
                        <span className="text-sm">{t('email.addProduct', 'Agregar producto')}</span>
                    </button>
                </div>
                
                <hr className="border-editor-border" />
                
                <ColumnSelector
                    label={t('email.productColumns', 'Productos por fila')}
                    value={content.columns || 2}
                    onChange={(val) => updateContent({ columns: val as 1 | 2 | 3 })}
                />
                
                <ToggleControl
                    label={t('email.showPrices', 'Mostrar precios')}
                    checked={content.showPrices ?? true}
                    onChange={(checked) => updateContent({ showPrices: checked })}
                />
                
                <ToggleControl
                    label={t('email.showButtons', 'Mostrar botones')}
                    checked={content.showButtons ?? true}
                    onChange={(checked) => updateContent({ showButtons: checked })}
                />
                
                {content.showButtons && (
                    <Input
                        label={t('email.buttonText', 'Texto del botón')}
                        value={content.buttonText || ''}
                        onChange={(e) => updateContent({ buttonText: e.target.value })}
                        placeholder={t('email.viewProduct', 'Ver Producto')}
                    />
                )}
            </div>
        );
    }
    
    // Style tab
    return (
        <div className="space-y-4">
            <ColorControl
                label={t('email.backgroundColor', 'Color de fondo')}
                value={styles.backgroundColor || 'transparent'}
                onChange={(color) => updateStyles({ backgroundColor: color })}
            />
            
            <ColorControl
                label={t('email.buttonColor', 'Color del botón')}
                value={styles.buttonColor || '#4f46e5'}
                onChange={(color) => updateStyles({ buttonColor: color })}
            />
            
            <ColorControl
                label={t('email.buttonTextColor', 'Color texto del botón')}
                value={styles.buttonTextColor || '#ffffff'}
                onChange={(color) => updateStyles({ buttonTextColor: color })}
            />
            
            <PaddingSelector
                label={t('email.padding', 'Espaciado')}
                value={styles.padding || 'md'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />
        </div>
    );
};

export default ProductsBlockControls;






