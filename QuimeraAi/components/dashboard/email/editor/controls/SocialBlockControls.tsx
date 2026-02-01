/**
 * SocialBlockControls
 * Controls for editing Social Links block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailSocialContent, EmailBlockStyles, EmailSocialLinks } from '../../../../../types/email';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: React.ReactNode }> = ({ label, icon, ...props }) => (
    <div className="mb-3">
        {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary">
                    {icon}
                </div>
            )}
            <input
                {...props}
                className={`w-full bg-editor-panel-bg border border-editor-border rounded-md py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50 ${icon ? 'pl-10 pr-3' : 'px-3'}`}
            />
        </div>
    </div>
);

const SelectControl: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

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

const AlignmentSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = [
        { v: 'left', l: '←' },
        { v: 'center', l: '↔' },
        { v: 'right', l: '→' },
    ];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt.v}
                        onClick={() => onChange(opt.v)}
                        className={`flex-1 py-1 text-sm font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                    >
                        {opt.l}
                    </button>
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// PROPS
// =============================================================================

interface SocialBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const SocialBlockControls: React.FC<SocialBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    
    const content = block.content as EmailSocialContent;
    const styles = block.styles;
    
    const updateContent = (updates: Partial<EmailSocialContent>) => {
        updateBlock(block.id, {
            content: { ...content, ...updates },
        });
    };
    
    const updateLinks = (updates: Partial<EmailSocialLinks>) => {
        updateContent({
            links: { ...content.links, ...updates },
        });
    };
    
    const updateStyles = (updates: Partial<EmailBlockStyles>) => {
        updateBlock(block.id, {
            styles: { ...styles, ...updates },
        });
    };
    
    if (activeTab === 'content') {
        return (
            <div className="space-y-4">
                <p className="text-xs text-editor-text-secondary mb-4">
                    {t('email.socialLinksHint', 'Agrega los enlaces a tus redes sociales. Deja vacío para ocultar.')}
                </p>
                
                <Input
                    label="Facebook"
                    icon={<Facebook size={16} />}
                    value={content.links?.facebook || ''}
                    onChange={(e) => updateLinks({ facebook: e.target.value })}
                    placeholder="https://facebook.com/..."
                />
                
                <Input
                    label="Instagram"
                    icon={<Instagram size={16} />}
                    value={content.links?.instagram || ''}
                    onChange={(e) => updateLinks({ instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                />
                
                <Input
                    label="Twitter / X"
                    icon={<Twitter size={16} />}
                    value={content.links?.twitter || ''}
                    onChange={(e) => updateLinks({ twitter: e.target.value })}
                    placeholder="https://twitter.com/..."
                />
                
                <Input
                    label="LinkedIn"
                    icon={<Linkedin size={16} />}
                    value={content.links?.linkedin || ''}
                    onChange={(e) => updateLinks({ linkedin: e.target.value })}
                    placeholder="https://linkedin.com/..."
                />
                
                <Input
                    label="YouTube"
                    icon={<Youtube size={16} />}
                    value={content.links?.youtube || ''}
                    onChange={(e) => updateLinks({ youtube: e.target.value })}
                    placeholder="https://youtube.com/..."
                />
                
                <hr className="border-editor-border" />
                
                <SelectControl
                    label={t('email.iconStyle', 'Estilo de iconos')}
                    value={content.iconStyle || 'color'}
                    options={[
                        { value: 'color', label: t('email.colorIcons', 'Color') },
                        { value: 'mono', label: t('email.monoIcons', 'Monocromático') },
                        { value: 'outline', label: t('email.outlineIcons', 'Contorno') },
                    ]}
                    onChange={(val) => updateContent({ iconStyle: val as any })}
                />
                
                <SelectControl
                    label={t('email.iconSize', 'Tamaño de iconos')}
                    value={content.iconSize || 'md'}
                    options={[
                        { value: 'sm', label: t('email.small', 'Pequeño') },
                        { value: 'md', label: t('email.medium', 'Mediano') },
                        { value: 'lg', label: t('email.large', 'Grande') },
                    ]}
                    onChange={(val) => updateContent({ iconSize: val as any })}
                />
            </div>
        );
    }
    
    // Style tab
    return (
        <div className="space-y-4">
            <AlignmentSelector
                label={t('email.alignment', 'Alineación')}
                value={styles.alignment || 'center'}
                onChange={(val) => updateStyles({ alignment: val as any })}
            />
            
            <PaddingSelector
                label={t('email.padding', 'Espaciado')}
                value={styles.padding || 'md'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />
        </div>
    );
};

export default SocialBlockControls;






