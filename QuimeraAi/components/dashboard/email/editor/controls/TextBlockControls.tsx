/**
 * TextBlockControls
 * Controls for editing Text block content and styles
 * Uses TipTap WYSIWYG editor for rich text editing
 */

import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailTextContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
    List, ListOrdered, Heading2, Code, Undo, Redo, Palette,
} from 'lucide-react';

// =============================================================================
// WYSIWYG MINI TOOLBAR BUTTON
// =============================================================================

const ToolbarBtn: React.FC<{
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({ active, onClick, title, children, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`p-1 rounded transition-colors ${
            active
                ? 'bg-editor-accent text-editor-bg'
                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        {children}
    </button>
);

// =============================================================================
// TIPTAP WYSIWYG EDITOR FOR EMAIL TEXT BLOCKS
// =============================================================================

interface EmailRichTextEditorProps {
    value: string;
    isHtml: boolean;
    onChange: (html: string) => void;
    placeholder?: string;
}

const EmailRichTextEditor: React.FC<EmailRichTextEditorProps> = ({ value, isHtml, onChange, placeholder }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                codeBlock: false,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-blue-500 underline' },
            }),
            TextStyle,
            Color,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Placeholder.configure({
                placeholder: placeholder || 'Escribe tu contenido aquí...',
            }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2 text-sm text-editor-text-primary',
            },
        },
    });

    // Sync external value changes (e.g. AI-generated content)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '', false);
        }
    }, [value]);

    const setLink = useCallback(() => {
        if (!editor) return;
        const prev = editor.getAttributes('link').href;
        const url = window.prompt('URL del enlace:', prev || 'https://');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                Contenido
            </label>

            {/* Mini Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 bg-editor-panel-bg border border-editor-border border-b-0 rounded-t-md px-1.5 py-1">
                <ToolbarBtn
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Negrita"
                >
                    <Bold size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Cursiva"
                >
                    <Italic size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Subrayado"
                >
                    <UnderlineIcon size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="Tachado"
                >
                    <Strikethrough size={14} />
                </ToolbarBtn>

                <div className="w-px h-4 bg-editor-border mx-1" />

                <ToolbarBtn
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    title="Encabezado"
                >
                    <Heading2 size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Lista"
                >
                    <List size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Lista numerada"
                >
                    <ListOrdered size={14} />
                </ToolbarBtn>

                <div className="w-px h-4 bg-editor-border mx-1" />

                <ToolbarBtn
                    active={editor.isActive({ textAlign: 'left' })}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    title="Alinear izquierda"
                >
                    <AlignLeft size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive({ textAlign: 'center' })}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    title="Centrar"
                >
                    <AlignCenter size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive({ textAlign: 'right' })}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    title="Alinear derecha"
                >
                    <AlignRight size={14} />
                </ToolbarBtn>

                <div className="w-px h-4 bg-editor-border mx-1" />

                <ToolbarBtn
                    active={editor.isActive('link')}
                    onClick={setLink}
                    title="Enlace"
                >
                    <LinkIcon size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive('code')}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    title="Código"
                >
                    <Code size={14} />
                </ToolbarBtn>

                <div className="flex-1" />

                <ToolbarBtn
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Deshacer"
                >
                    <Undo size={14} />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Rehacer"
                >
                    <Redo size={14} />
                </ToolbarBtn>
            </div>

            {/* Editor Area */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-b-md overflow-hidden [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-editor-text-primary [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-editor-text-secondary/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_a]:text-blue-500 [&_.ProseMirror_a]:underline [&_.ProseMirror_code]:bg-editor-border/30 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-xs">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

// =============================================================================
// HELPER COMPONENTS (style controls)
// =============================================================================

const ToggleControl: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
        >
            <span className={`${checked ? 'translate-x-[18px]' : 'translate-x-0'} pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition mt-0.5 ml-0.5`} />
        </button>
    </div>
);

const PaddingSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['none', 'sm', 'md', 'lg'];
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
                        {size === 'none' ? '0' : size.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

const FontSizeSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['sm', 'md', 'lg', 'xl'];
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

interface TextBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const TextBlockControls: React.FC<TextBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();

    const content = block.content as EmailTextContent;
    const styles = block.styles;

    const updateContent = (updates: Partial<EmailTextContent>) => {
        updateBlock(block.id, {
            content: { ...content, ...updates },
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
                <EmailRichTextEditor
                    value={content.text || ''}
                    isHtml={content.isHtml ?? false}
                    onChange={(html) => updateContent({ text: html, isHtml: true })}
                    placeholder={t('email.textPlaceholder', 'Escribe tu contenido aquí...')}
                />

                <p className="text-xs text-editor-text-secondary flex items-center gap-1.5">
                    <Palette size={12} />
                    {t('email.wysiwygHint', 'Editor visual con formato. El HTML se genera automáticamente.')}
                </p>
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
                label={t('email.textColor', 'Color del texto')}
                value={styles.textColor || '#52525b'}
                onChange={(color) => updateStyles({ textColor: color })}
            />

            <hr className="border-editor-border" />

            <FontSizeSelector
                label={t('email.fontSize', 'Tamaño de fuente')}
                value={styles.fontSize || 'md'}
                onChange={(val) => updateStyles({ fontSize: val as any })}
            />

            <AlignmentSelector
                label={t('email.alignment', 'Alineación')}
                value={styles.alignment || 'left'}
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

export default TextBlockControls;
