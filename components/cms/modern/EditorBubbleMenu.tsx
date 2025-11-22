import React from 'react';
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
        className={`p-2 rounded transition-colors ${
            isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
        title={title}
    >
        {children}
    </button>
);

const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor, onAICommand, onLinkClick }) => {
    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, placement: 'top' }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl flex items-center gap-0.5 p-1"
        >
            <BubbleButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
            >
                <Bold size={16} />
            </BubbleButton>
            <BubbleButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
            >
                <Italic size={16} />
            </BubbleButton>
            <BubbleButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline"
            >
                <Underline size={16} />
            </BubbleButton>
            <BubbleButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
            >
                <Strikethrough size={16} />
            </BubbleButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            <BubbleButton onClick={onLinkClick} isActive={editor.isActive('link')} title="Link">
                <LinkIcon size={16} />
            </BubbleButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* AI Quick Actions */}
            <button
                onClick={() => onAICommand('improve')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-blue-200 dark:hover:from-purple-800/40 dark:hover:to-blue-800/40 rounded transition-all"
                title="AI Improve"
            >
                <Sparkles size={12} />
                <span>Improve</span>
            </button>
        </BubbleMenu>
    );
};

export default EditorBubbleMenu;

