
import React, { useState, useEffect } from 'react';
import { ComponentDocumentation } from '../../../types';
import { BookOpen, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ComponentDocumentationViewerProps {
    documentation: ComponentDocumentation;
    componentName: string;
    isOpen: boolean;
    onClose: () => void;
}

const ComponentDocumentationViewer: React.FC<ComponentDocumentationViewerProps> = ({
    documentation,
    componentName,
    isOpen,
    onClose
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTocItem, setActiveTocItem] = useState<string | null>(null);

    // Generate TOC from changelog headings
    const generateTOC = () => {
        const toc: { id: string; title: string; level: number }[] = [
            { id: 'description', title: 'Description', level: 1 },
            { id: 'usage', title: 'Usage Examples', level: 1 },
            { id: 'properties', title: 'Properties', level: 1 },
        ];

        if (documentation.changelog) {
            toc.push({ id: 'changelog', title: 'Changelog', level: 1 });
            
            // Extract headings from changelog
            const headings = documentation.changelog.match(/^#{2,6}\s+.+$/gm) || [] as string[];
            headings.forEach((heading: string, index: number) => {
                const level = heading.match(/^#+/)?.[0]?.length || 2;
                const title = heading.replace(/^#+\s+/, '');
                toc.push({
                    id: `changelog-${index}`,
                    title,
                    level: level - 1 // Normalize level (h2 = 1, h3 = 2, etc.)
                });
            });
        }

        return toc;
    };

    const toc = generateTOC();

    // Filter documentation based on search
    const highlightText = (text: string) => {
        if (!searchQuery) return text;
        const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === searchQuery.toLowerCase()
                ? `<mark class="bg-yellow-300 text-black">${part}</mark>`
                : part
        ).join('');
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveTocItem(id);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setActiveTocItem(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const hasContent = documentation.description || documentation.usageExamples?.length || documentation.properties?.length || documentation.changelog;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-editor-border flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <BookOpen className="text-editor-accent" size={24} />
                        <div>
                            <h3 className="text-lg font-semibold text-editor-text-primary">{componentName} Documentation</h3>
                            <p className="text-xs text-editor-text-secondary">Component documentation and usage guide</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border rounded-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-editor-border flex-shrink-0">
                    <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                        <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search documentation..."
                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {hasContent ? (
                    <div className="flex-1 overflow-hidden flex">
                        {/* TOC Sidebar */}
                        <aside className="w-56 border-r border-editor-border overflow-y-auto p-4 hidden md:block flex-shrink-0">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">
                                Table of Contents
                            </h4>
                            <nav className="space-y-1">
                                {toc.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
                                            activeTocItem === item.id
                                                ? 'bg-editor-accent/10 text-editor-accent'
                                                : 'text-editor-text-secondary hover:bg-editor-border hover:text-editor-text-primary'
                                        }`}
                                        style={{ paddingLeft: `${item.level * 12}px` }}
                                    >
                                        {item.title}
                                    </button>
                                ))}
                            </nav>
                        </aside>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Description */}
                            {documentation.description && (
                                <section id="description">
                                    <h4 className="text-xl font-bold text-editor-text-primary mb-3">Description</h4>
                                    <div className="prose prose-invert max-w-none text-editor-text-primary">
                                        <ReactMarkdown>{documentation.description}</ReactMarkdown>
                                    </div>
                                </section>
                            )}

                            {/* Usage Examples */}
                            {documentation.usageExamples && documentation.usageExamples.length > 0 && (
                                <section id="usage">
                                    <h4 className="text-xl font-bold text-editor-text-primary mb-3">Usage Examples</h4>
                                    <div className="space-y-3">
                                        {documentation.usageExamples.map((example, index) => (
                                            <div key={index} className="bg-editor-bg p-4 rounded-lg border border-editor-border">
                                                <p className="text-xs text-editor-text-secondary mb-2 font-semibold">Example {index + 1}</p>
                                                <pre className="text-sm text-editor-text-primary font-mono overflow-x-auto whitespace-pre-wrap">
                                                    {example}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Properties */}
                            {documentation.properties && documentation.properties.length > 0 && (
                                <section id="properties">
                                    <h4 className="text-xl font-bold text-editor-text-primary mb-3">Properties</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-editor-bg border-b-2 border-editor-border">
                                                    <th className="px-4 py-3 text-left text-editor-text-secondary font-semibold">Name</th>
                                                    <th className="px-4 py-3 text-left text-editor-text-secondary font-semibold">Type</th>
                                                    <th className="px-4 py-3 text-left text-editor-text-secondary font-semibold">Required</th>
                                                    <th className="px-4 py-3 text-left text-editor-text-secondary font-semibold">Default</th>
                                                    <th className="px-4 py-3 text-left text-editor-text-secondary font-semibold">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documentation.properties.map((prop, index) => (
                                                    <tr key={index} className="border-b border-editor-border hover:bg-editor-bg/50">
                                                        <td className="px-4 py-3 font-mono text-editor-accent font-medium">
                                                            {prop.name}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-editor-text-primary">
                                                            <code className="bg-editor-bg px-2 py-0.5 rounded text-xs">
                                                                {prop.type}
                                                            </code>
                                                        </td>
                                                        <td className="px-4 py-3 text-editor-text-primary">
                                                            {prop.required ? (
                                                                <span className="text-red-500 font-semibold">✓ Required</span>
                                                            ) : (
                                                                <span className="text-editor-text-secondary">Optional</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-editor-text-secondary text-xs">
                                                            {prop.defaultValue ? (
                                                                <code className="bg-editor-bg px-2 py-0.5 rounded">
                                                                    {String(prop.defaultValue)}
                                                                </code>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-editor-text-primary">
                                                            {prop.description}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {/* Changelog */}
                            {documentation.changelog && (
                                <section id="changelog">
                                    <h4 className="text-xl font-bold text-editor-text-primary mb-3">Changelog</h4>
                                    <div className="prose prose-invert max-w-none text-editor-text-primary">
                                        <ReactMarkdown>{documentation.changelog}</ReactMarkdown>
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            <BookOpen size={48} className="mx-auto text-editor-text-secondary mb-4" />
                            <h4 className="text-lg font-semibold text-editor-text-primary mb-2">No Documentation Available</h4>
                            <p className="text-sm text-editor-text-secondary">
                                This component doesn't have documentation yet.
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-editor-border flex justify-end flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-editor-accent text-editor-bg font-medium rounded-md hover:opacity-90 transition-opacity"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComponentDocumentationViewer;

