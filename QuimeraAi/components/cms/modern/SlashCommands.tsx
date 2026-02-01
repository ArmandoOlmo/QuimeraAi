import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tiptap/react';
import {
    Heading1, Heading2, Heading3, List, ListOrdered,
    Quote, Image as ImageIcon, Table, Minus, Code,
    FileText, Sparkles
} from 'lucide-react';

interface SlashCommandsProps {
    editor: Editor | null;
    onImageUpload: () => void;
    onAICommand: (command: string) => void;
}

interface Command {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: () => void;
    searchTerms: string[];
}

const SlashCommands: React.FC<SlashCommandsProps> = ({ editor, onImageUpload, onAICommand }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const commands: Command[] = [
        {
            title: t('cms_editor.toolbar.h1'),
            description: t('cms_editor.commands.h1Desc'),
            icon: <Heading1 size={18} />,
            command: () => editor?.chain().focus().setHeading({ level: 1 }).run(),
            searchTerms: ['h1', 'heading', 'title', 'large']
        },
        {
            title: t('cms_editor.toolbar.h2'),
            description: t('cms_editor.commands.h2Desc'),
            icon: <Heading2 size={18} />,
            command: () => editor?.chain().focus().setHeading({ level: 2 }).run(),
            searchTerms: ['h2', 'heading', 'subtitle']
        },
        {
            title: t('cms_editor.toolbar.h3'),
            description: t('cms_editor.commands.h3Desc'),
            icon: <Heading3 size={18} />,
            command: () => editor?.chain().focus().setHeading({ level: 3 }).run(),
            searchTerms: ['h3', 'heading', 'small']
        },
        {
            title: t('cms_editor.toolbar.bulletList'),
            description: t('cms_editor.commands.ulDesc'),
            icon: <List size={18} />,
            command: () => editor?.chain().focus().toggleBulletList().run(),
            searchTerms: ['ul', 'list', 'bullet', 'unordered']
        },
        {
            title: t('cms_editor.toolbar.numberedList'),
            description: t('cms_editor.commands.olDesc'),
            icon: <ListOrdered size={18} />,
            command: () => editor?.chain().focus().toggleOrderedList().run(),
            searchTerms: ['ol', 'list', 'numbered', 'ordered']
        },
        {
            title: t('cms_editor.toolbar.quote'),
            description: t('cms_editor.commands.quoteDesc'),
            icon: <Quote size={18} />,
            command: () => editor?.chain().focus().toggleBlockquote().run(),
            searchTerms: ['quote', 'blockquote', 'citation']
        },
        {
            title: t('cms_editor.toolbar.code'),
            description: t('cms_editor.commands.codeDesc'),
            icon: <Code size={18} />,
            command: () => editor?.chain().focus().toggleCodeBlock().run(),
            searchTerms: ['code', 'codeblock', 'pre', 'programming']
        },
        {
            title: t('cms_editor.insertImage'),
            description: t('cms_editor.commands.imageDesc'),
            icon: <ImageIcon size={18} />,
            command: () => { onImageUpload(); setIsOpen(false); },
            searchTerms: ['image', 'img', 'photo', 'picture', 'upload']
        },
        {
            title: t('cms_editor.toolbar.table'),
            description: t('cms_editor.commands.tableDesc'),
            icon: <Table size={18} />,
            command: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
            searchTerms: ['table', 'grid', 'spreadsheet']
        },
        {
            title: t('cms_editor.toolbar.horizontalLine'),
            description: t('cms_editor.commands.hrDesc'),
            icon: <Minus size={18} />,
            command: () => editor?.chain().focus().setHorizontalRule().run(),
            searchTerms: ['divider', 'hr', 'line', 'separator']
        },
        {
            title: t('cms_editor.assistant.continue'),
            description: t('cms_editor.commands.aiContinueDesc'),
            icon: <Sparkles size={18} />,
            command: () => { onAICommand('continue'); setIsOpen(false); },
            searchTerms: ['ai', 'continue', 'write', 'generate']
        },
        {
            title: t('cms_editor.assistant.improve'),
            description: t('cms_editor.commands.aiImproveDesc'),
            icon: <Sparkles size={18} />,
            command: () => { onAICommand('improve'); setIsOpen(false); },
            searchTerms: ['ai', 'improve', 'enhance', 'better']
        }
    ];

    const filteredCommands = commands.filter(cmd =>
        cmd.title.toLowerCase().includes(search.toLowerCase()) ||
        cmd.searchTerms.some(term => term.includes(search.toLowerCase()))
    );

    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            const { selection } = editor.state;
            const { $from } = selection;
            const text = $from.parent.textContent;
            const textBeforeCursor = text.slice(0, $from.parentOffset);

            // Check if user typed "/"
            if (textBeforeCursor.endsWith('/')) {
                const coords = editor.view.coordsAtPos(selection.from);
                setPosition({ top: coords.top + 20, left: coords.left });
                setIsOpen(true);
                setSearch('');
                setSelectedIndex(0);
            } else if (isOpen && textBeforeCursor.includes('/')) {
                const searchTerm = textBeforeCursor.split('/').pop() || '';
                setSearch(searchTerm);
            } else if (isOpen && !textBeforeCursor.includes('/')) {
                setIsOpen(false);
            }
        };

        editor.on('update', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            editor.off('selectionUpdate', handleUpdate);
        };
    }, [editor, isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeCommand(filteredCommands[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredCommands]);

    const executeCommand = (cmd: Command) => {
        if (!editor) return;

        // Delete the "/" and search text
        const { selection } = editor.state;
        const { $from } = selection;
        const text = $from.parent.textContent;
        const textBeforeCursor = text.slice(0, $from.parentOffset);
        const slashIndex = textBeforeCursor.lastIndexOf('/');

        if (slashIndex !== -1) {
            const from = selection.from - (textBeforeCursor.length - slashIndex);
            const to = selection.from;
            editor.chain().focus().deleteRange({ from, to }).run();
        }

        cmd.command();
        setIsOpen(false);
    };

    if (!isOpen || filteredCommands.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 w-72 max-h-80 overflow-y-auto"
            style={{ top: position.top, left: position.left }}
        >
            <div className="p-2">
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase px-2 py-1 mb-1">
                    {t('cms_editor.commands.title')} {search && `(${filteredCommands.length})`}
                </div>
                {filteredCommands.map((cmd, index) => (
                    <button
                        key={cmd.title}
                        onClick={() => executeCommand(cmd)}
                        className={`w-full flex items-start gap-3 px-3 py-2 rounded-md transition-colors text-left ${index === selectedIndex
                                ? 'bg-primary/10 dark:bg-primary/20'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <div className={`mt-0.5 ${index === selectedIndex ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                            {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${index === selectedIndex ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                                {cmd.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {cmd.description}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SlashCommands;

