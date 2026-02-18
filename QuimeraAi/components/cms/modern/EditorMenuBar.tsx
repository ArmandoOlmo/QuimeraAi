import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tiptap/react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Quote,
    Heading1, Heading2, Heading3,
    Code, Link as LinkIcon, Image as ImageIcon,
    Table, Minus, Undo, Redo,
    ChevronDown, Type, Sparkles, Palette,
    RemoveFormatting, Highlighter
} from 'lucide-react';

interface EditorMenuBarProps {
    editor: Editor | null;
    onImageUpload: () => void;
    onAICommand: (command: string) => void;
    isAiWorking: boolean;
}

const MenuButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        title={title}
    >
        {children}
    </button>
);

const MenuDivider = () => <div className="w-px h-6 bg-border mx-1" />;

const EditorMenuBar: React.FC<EditorMenuBarProps> = ({ editor, onImageUpload, onAICommand, isAiWorking }) => {
    const { t } = useTranslation();
    const [showHeadings, setShowHeadings] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [showHighlight, setShowHighlight] = useState(false);

    if (!editor) return null;

    const setHeading = (level: 1 | 2 | 3) => {
        if (editor.isActive('heading', { level })) {
            editor.chain().focus().setParagraph().run();
        } else {
            editor.chain().focus().setHeading({ level }).run();
        }
        setShowHeadings(false);
    };

    const getBlockLabel = () => {
        if (editor.isActive('heading', { level: 1 })) return t('cms_editor.toolbar.h1');
        if (editor.isActive('heading', { level: 2 })) return t('cms_editor.toolbar.h2');
        if (editor.isActive('heading', { level: 3 })) return t('cms_editor.toolbar.h3');
        if (editor.isActive('blockquote')) return t('cms_editor.toolbar.quote');
        return t('cms_editor.toolbar.paragraph');
    };

    const colors = ['#000000', '#4b5563', '#9ca3af', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

    return (
        <div className="border-b border-border bg-card p-2 flex flex-wrap gap-1 items-center sticky top-0 z-30">
            {/* History */}
            <div className="flex shrink-0 bg-background border border-border rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title={t('cms_editor.toolbar.undo')}>
                    <Undo size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title={t('cms_editor.toolbar.redo')}>
                    <Redo size={16} />
                </MenuButton>
            </div>

            {/* Heading Dropdown */}
            <div className="relative shrink-0">
                <button
                    onClick={() => setShowHeadings(!showHeadings)}
                    className="flex items-center justify-between w-32 px-3 py-1.5 bg-background border border-border rounded-md shadow-sm text-sm hover:bg-muted"
                >
                    <span className="truncate font-medium text-foreground">{getBlockLabel()}</span>
                    <ChevronDown size={14} className="ml-1 opacity-50" />
                </button>
                {showHeadings && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                        <button onClick={() => { editor.chain().focus().setParagraph().run(); setShowHeadings(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center text-foreground">
                            <Type size={14} className="mr-2" /> {t('cms_editor.toolbar.paragraph')}
                        </button>
                        <button onClick={() => setHeading(1)} className="block w-full text-left px-4 py-2 text-lg font-bold hover:bg-muted flex items-center text-foreground">
                            <Heading1 size={18} className="mr-2" /> {t('cms_editor.toolbar.h1')}
                        </button>
                        <button onClick={() => setHeading(2)} className="block w-full text-left px-4 py-2 text-md font-bold hover:bg-muted flex items-center text-foreground">
                            <Heading2 size={16} className="mr-2" /> {t('cms_editor.toolbar.h2')}
                        </button>
                        <button onClick={() => setHeading(3)} className="block w-full text-left px-4 py-2 text-sm font-bold hover:bg-muted flex items-center text-foreground">
                            <Heading3 size={14} className="mr-2" /> {t('cms_editor.toolbar.h3')}
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button onClick={() => { editor.chain().focus().toggleBlockquote().run(); setShowHeadings(false); }} className="block w-full text-left px-4 py-2 text-sm italic hover:bg-muted flex items-center text-muted-foreground">
                            <Quote size={14} className="mr-2" /> {t('cms_editor.toolbar.quote')}
                        </button>
                    </div>
                )}
            </div>

            <MenuDivider />

            {/* Text Formatting */}
            <div className="flex shrink-0 bg-background border border-border rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title={t('cms_editor.toolbar.bold')}>
                    <Bold size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title={t('cms_editor.toolbar.italic')}>
                    <Italic size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title={t('cms_editor.toolbar.underline')}>
                    <Underline size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title={t('cms_editor.toolbar.strikethrough')}>
                    <Strikethrough size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title={t('cms_editor.toolbar.code')}>
                    <Code size={16} />
                </MenuButton>
            </div>

            {/* Color Picker */}
            <div className="relative shrink-0">
                <MenuButton onClick={() => setShowColors(!showColors)} title={t('cms_editor.toolbar.textColor')}>
                    <Palette size={16} />
                </MenuButton>
                {showColors && (
                    <div className="absolute top-full left-0 mt-1 p-3 bg-card border border-border rounded-lg shadow-xl z-50 w-48">
                        <p className="text-xs font-bold text-muted-foreground mb-2">{t('cms_editor.toolbar.textColor')}</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {colors?.map(color => (
                                <button
                                    key={color}
                                    onClick={() => { editor.chain().focus().setColor(color).run(); setShowColors(false); }}
                                    className="w-7 h-7 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Highlight */}
            <div className="relative shrink-0">
                <MenuButton onClick={() => setShowHighlight(!showHighlight)} isActive={editor.isActive('highlight')} title={t('cms_editor.toolbar.highlight')}>
                    <Highlighter size={16} />
                </MenuButton>
                {showHighlight && (
                    <div className="absolute top-full left-0 mt-1 p-3 bg-card border border-border rounded-lg shadow-xl z-50 w-48">
                        <p className="text-xs font-bold text-muted-foreground mb-2">{t('cms_editor.toolbar.highlight')}</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#fed7aa'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => { editor.chain().focus().setHighlight({ color }).run(); setShowHighlight(false); }}
                                    className="w-7 h-7 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
                            className="w-full mt-2 text-xs py-1 bg-muted hover:bg-muted/80 rounded text-foreground"
                        >
                            {t('cms_editor.toolbar.removeHighlight')}
                        </button>
                    </div>
                )}
            </div>

            <MenuDivider />

            {/* Alignment */}
            <div className="flex shrink-0 bg-background border border-border rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title={t('cms_editor.toolbar.alignLeft')}>
                    <AlignLeft size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title={t('cms_editor.toolbar.alignCenter')}>
                    <AlignCenter size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title={t('cms_editor.toolbar.alignRight')}>
                    <AlignRight size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title={t('cms_editor.toolbar.alignJustify')}>
                    <AlignJustify size={16} />
                </MenuButton>
            </div>

            {/* Lists */}
            <div className="flex shrink-0 bg-background border border-border rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title={t('cms_editor.toolbar.bulletList')}>
                    <List size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title={t('cms_editor.toolbar.numberedList')}>
                    <ListOrdered size={16} />
                </MenuButton>
            </div>

            <MenuDivider />

            {/* Insert */}
            <div className="flex shrink-0 bg-background border border-border rounded-md shadow-sm">
                <MenuButton onClick={onImageUpload} title={t('cms_editor.insertImage')}>
                    <ImageIcon size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title={t('cms_editor.toolbar.table')}>
                    <Table size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t('cms_editor.toolbar.horizontalLine')}>
                    <Minus size={16} />
                </MenuButton>
            </div>

            <MenuDivider />

            <MenuButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title={t('cms_editor.toolbar.clearFormatting')}>
                <RemoveFormatting size={16} />
            </MenuButton>

            {/* AI Commands */}
            <div className="ml-auto flex shrink-0 items-center gap-1 bg-primary/10 border border-primary/30 rounded-lg p-0.5">
                <span className="px-2 text-xs font-bold text-primary flex items-center">
                    <Sparkles size={12} className="mr-1" /> {t('cms_editor.assistant.ai')}
                </span>
                <button
                    onClick={() => onAICommand('improve')}
                    disabled={isAiWorking}
                    className="px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded disabled:opacity-50"
                >
                    {t('cms_editor.assistant.improve')}
                </button>
                <button
                    onClick={() => onAICommand('fix')}
                    disabled={isAiWorking}
                    className="px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded disabled:opacity-50"
                >
                    {t('cms_editor.assistant.fix')}
                </button>
                <button
                    onClick={() => onAICommand('continue')}
                    disabled={isAiWorking}
                    className="px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded disabled:opacity-50"
                >
                    {t('cms_editor.assistant.continue')}
                </button>
            </div>
        </div>
    );
};

export default EditorMenuBar;
