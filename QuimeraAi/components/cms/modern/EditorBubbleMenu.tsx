import React from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Sparkles } from 'lucide-react';

interface EditorBubbleMenuProps {
    editor: Editor | null;
    onAICommand: (command: string) => void;
    onLinkClick: () => void;
}

const BubbleButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
}> = ({ onClick, isActive, children, title }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded transition-colors ${isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-q-surface-overlay dark:hover:bg-gray-700 text-q-text dark:text-gray-300'
            }`}
        title={title}
    >
        {children}
    </button>
);

const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor, onAICommand, onLinkClick }) => {
    const { t } = useTranslation();
    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            className="bg-q-surface dark:bg-gray-800 border border-q-border dark:border-gray-700 rounded-lg shadow-2xl flex items-center gap-0.5 p-1"
        >
            <BubbleButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title={t('cms_editor.toolbar.bold')}
            >
                <Bold size={16} />
            </BubbleButton>
            <BubbleButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title={t('cms_editor.toolbar.italic')}
            >
                <Italic size={16} />
            </BubbleButton>
            <BubbleButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title={t('cms_editor.toolbar.underline')}
            >
                <Underline size={16} />
            </BubbleButton>
            <BubbleButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title={t('cms_editor.toolbar.strikethrough')}
            >
                <Strikethrough size={16} />
            </BubbleButton>

            <div className="w-px h-6 bg-q-border dark:bg-gray-600 mx-1" />

            <BubbleButton onClick={onLinkClick} isActive={editor.isActive('link')} title={t('cms_editor.toolbar.link')}>
                <LinkIcon size={16} />
            </BubbleButton>

            <div className="w-px h-6 bg-q-border dark:bg-gray-600 mx-1" />

            {/* AI Quick Actions */}
            <button
                onClick={() => onAICommand('improve')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gradient-to-r from-q-accent to-q-accent-tertiary dark:from-purple-900/40 dark:to-blue-900/40 text-q-accent dark:text-purple-300 hover:from-q-accent hover:to-q-accent-tertiary dark:hover:from-purple-800/40 dark:hover:to-blue-800/40 rounded transition-all"
                title={t('cms_editor.assistant.improve')}
            >
                <Sparkles size={12} />
                <span>{t('cms_editor.assistant.improve')}</span>
            </button>
        </BubbleMenu>
    );
};

export default EditorBubbleMenu;

