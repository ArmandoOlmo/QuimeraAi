import React, { useState } from 'react';
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
        className={`p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
        title={title}
    >
        {children}
    </button>
);

const MenuDivider = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />;

const EditorMenuBar: React.FC<EditorMenuBarProps> = ({ editor, onImageUpload, onAICommand, isAiWorking }) => {
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
        if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
        if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
        if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
        if (editor.isActive('blockquote')) return 'Quote';
        return 'Paragraph';
    };

    const colors = ['#000000', '#4b5563', '#9ca3af', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

    return (
        <div className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
            {/* History */}
            <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                    <Undo size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                    <Redo size={16} />
                </MenuButton>
            </div>

            {/* Heading Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowHeadings(!showHeadings)}
                    className="flex items-center justify-between w-32 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    <span className="truncate font-medium text-gray-700 dark:text-gray-300">{getBlockLabel()}</span>
                    <ChevronDown size={14} className="ml-1 opacity-50" />
                </button>
                {showHeadings && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1">
                        <button onClick={() => { editor.chain().focus().setParagraph().run(); setShowHeadings(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-700 dark:text-gray-300">
                            <Type size={14} className="mr-2" /> Paragraph
                        </button>
                        <button onClick={() => setHeading(1)} className="block w-full text-left px-4 py-2 text-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100">
                            <Heading1 size={18} className="mr-2" /> Heading 1
                        </button>
                        <button onClick={() => setHeading(2)} className="block w-full text-left px-4 py-2 text-md font-bold hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-800 dark:text-gray-200">
                            <Heading2 size={16} className="mr-2" /> Heading 2
                        </button>
                        <button onClick={() => setHeading(3)} className="block w-full text-left px-4 py-2 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-700 dark:text-gray-300">
                            <Heading3 size={14} className="mr-2" /> Heading 3
                        </button>
                        <div className="border-t my-1 dark:border-gray-700"></div>
                        <button onClick={() => { editor.chain().focus().toggleBlockquote().run(); setShowHeadings(false); }} className="block w-full text-left px-4 py-2 text-sm italic hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-600 dark:text-gray-400">
                            <Quote size={14} className="mr-2" /> Quote
                        </button>
                    </div>
                )}
            </div>

            <MenuDivider />

            {/* Text Formatting */}
            <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
                    <Bold size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
                    <Italic size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
                    <Underline size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
                    <Strikethrough size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code">
                    <Code size={16} />
                </MenuButton>
            </div>

            {/* Color Picker */}
            <div className="relative">
                <MenuButton onClick={() => setShowColors(!showColors)} title="Text Color">
                    <Palette size={16} />
                </MenuButton>
                {showColors && (
                    <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 w-48">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Text Color</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => { editor.chain().focus().setColor(color).run(); setShowColors(false); }}
                                    className="w-7 h-7 rounded-md border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Highlight */}
            <div className="relative">
                <MenuButton onClick={() => setShowHighlight(!showHighlight)} isActive={editor.isActive('highlight')} title="Highlight">
                    <Highlighter size={16} />
                </MenuButton>
                {showHighlight && (
                    <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 w-48">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Highlight</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#fed7aa'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => { editor.chain().focus().setHighlight({ color }).run(); setShowHighlight(false); }}
                                    className="w-7 h-7 rounded-md border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
                            className="w-full mt-2 text-xs py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
                        >
                            Remove Highlight
                        </button>
                    </div>
                )}
            </div>

            <MenuDivider />

            {/* Alignment */}
            <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
                    <AlignLeft size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Center">
                    <AlignCenter size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
                    <AlignRight size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify">
                    <AlignJustify size={16} />
                </MenuButton>
            </div>

            {/* Lists */}
            <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm">
                <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
                    <List size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
                    <ListOrdered size={16} />
                </MenuButton>
            </div>

            <MenuDivider />

            {/* Insert */}
            <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm">
                <MenuButton onClick={onImageUpload} title="Insert Image">
                    <ImageIcon size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
                    <Table size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Line">
                    <Minus size={16} />
                </MenuButton>
            </div>

            <MenuDivider />

            <MenuButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
                <RemoveFormatting size={16} />
            </MenuButton>

            {/* AI Commands */}
            <div className="ml-auto flex items-center gap-1 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-0.5">
                <span className="px-2 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center">
                    <Sparkles size={12} className="mr-1" /> AI
                </span>
                <button
                    onClick={() => onAICommand('improve')}
                    disabled={isAiWorking}
                    className="px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-white/50 dark:hover:bg-white/5 rounded disabled:opacity-50"
                >
                    Improve
                </button>
                <button
                    onClick={() => onAICommand('fix')}
                    disabled={isAiWorking}
                    className="px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-white/50 dark:hover:bg-white/5 rounded disabled:opacity-50"
                >
                    Fix
                </button>
                <button
                    onClick={() => onAICommand('continue')}
                    disabled={isAiWorking}
                    className="px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-white/50 dark:hover:bg-white/5 rounded disabled:opacity-50"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default EditorMenuBar;

