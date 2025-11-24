import React, { useEffect, useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { LLMPrompt } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import PromptEditorModal from './PromptEditorModal';
import { ArrowLeft, Menu, Bot, Plus, Edit, Trash2 } from 'lucide-react';

interface LLMPromptManagementProps {
    onBack: () => void;
}

const LLMPromptManagement: React.FC<LLMPromptManagementProps> = ({ onBack }) => {
    const { prompts, fetchAllPrompts, deletePrompt } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [promptToEdit, setPromptToEdit] = useState<LLMPrompt | null>(null);

    useEffect(() => {
        const loadPrompts = async () => {
            setLoading(true);
            await fetchAllPrompts();
            setLoading(false);
        };
        loadPrompts();
    }, []);

    const handleCreate = () => {
        setPromptToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (prompt: LLMPrompt) => {
        setPromptToEdit(prompt);
        setIsModalOpen(true);
    };

    const handleDelete = (promptId: string) => {
        if (window.confirm('Are you sure you want to delete this prompt? This cannot be undone.')) {
            deletePrompt(promptId);
        }
    };

    const groupedPrompts = prompts.reduce((acc, prompt) => {
        const area = prompt.area || 'Other';
        if (!acc[area]) {
            acc[area] = [];
        }
        acc[area].push(prompt);
        return acc;
    }, {} as Record<string, LLMPrompt[]>);

    const areaOrder: (keyof typeof groupedPrompts)[] = ['Onboarding', 'Content Generation', 'Image Generation', 'File Management', 'Other'];


    const PromptRow: React.FC<{ prompt: LLMPrompt }> = ({ prompt }) => (
        <tr className="border-b border-editor-border hover:bg-editor-panel-bg/50">
            <td className="p-4">
                <p className="font-semibold text-editor-text-primary">{prompt.name}</p>
                <p className="text-xs text-editor-text-secondary font-mono">{prompt.id}</p>
            </td>
            <td className="p-4 text-sm text-editor-text-secondary max-w-sm truncate" title={prompt.description}>
                {prompt.description}
            </td>
            <td className="p-4 text-sm text-editor-text-secondary font-mono">
                {prompt.model}
            </td>
            <td className="p-4 text-sm text-center text-editor-text-secondary">
                {prompt.version}
            </td>
            <td className="p-4 text-right">
                <div className="inline-flex items-center space-x-2">
                    <button 
                        onClick={() => handleEdit(prompt)}
                        className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-editor-accent transition-colors"
                        title="Edit Prompt"
                    >
                        <Edit size={18} />
                    </button>
                     <button 
                        onClick={() => handleDelete(prompt.id)}
                        className="p-2 text-editor-text-secondary rounded-full hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete Prompt"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
    
    const PromptCard: React.FC<{ prompt: LLMPrompt }> = ({ prompt }) => (
        <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border">
            <div className="mb-3">
                <p className="font-semibold text-editor-text-primary">{prompt.name}</p>
                <p className="text-xs text-editor-text-secondary font-mono">{prompt.id}</p>
            </div>
            <p className="text-sm text-editor-text-secondary mb-3 pb-3 border-b border-editor-border">{prompt.description}</p>
            <div className="text-xs space-y-2 mb-4">
                <div className="flex justify-between"><span className="text-editor-text-secondary">Model:</span> <span className="font-mono bg-editor-bg px-2 py-0.5 rounded">{prompt.model}</span></div>
                <div className="flex justify-between"><span className="text-editor-text-secondary">Version:</span> <span className="font-semibold">{prompt.version}</span></div>
            </div>
            <div className="flex justify-end items-center space-x-2">
                 <button onClick={() => handleEdit(prompt)} className="flex items-center text-xs font-semibold py-1.5 px-3 rounded-md bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"><Edit size={14} className="mr-1.5" /> Edit</button>
                 <button onClick={() => handleDelete(prompt.id)} className="flex items-center text-xs font-semibold py-1.5 px-3 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 size={14} className="mr-1.5" /> Delete</button>
            </div>
        </div>
    );

    return (
        <>
            <PromptEditorModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                promptToEdit={promptToEdit}
            />
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center">
                            <button 
                                onClick={onBack}
                                className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full md:hidden mr-2 transition-colors"
                                title="Back to Admin"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Bot className="text-editor-accent w-5 h-5" />
                                <h1 className="text-lg font-semibold text-editor-text-primary">LLM Prompt Management</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={handleCreate}
                                className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                            >
                                <Plus className="w-4 h-4" />
                                Create Prompt
                            </button>
                            <button 
                                onClick={onBack}
                                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                            >
                                <ArrowLeft size={16} className="mr-1.5" />
                                Back to Admin
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                         {/* Mobile & Tablet View */}
                        <div className="lg:hidden">
                            {loading ? (
                                <p className="text-center py-8 text-editor-text-secondary">Loading prompts...</p>
                            ) : prompts.length === 0 ? (
                                <p className="text-center py-8 text-editor-text-secondary">No prompts found. Create one to get started.</p>
                            ) : (
                                areaOrder.map(area => (
                                    groupedPrompts[area] && (
                                        <div key={area} className="mb-6">
                                            <h2 className="text-lg font-semibold text-editor-text-primary mb-3">{area}</h2>
                                            <div className="space-y-4">
                                                {groupedPrompts[area].map(prompt => <PromptCard key={prompt.id} prompt={prompt} />)}
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                        </div>
                        
                        {/* Desktop View */}
                        <div className="hidden lg:block bg-editor-panel-bg border border-editor-border rounded-lg overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-editor-panel-bg/50">
                                    <tr className="border-b border-editor-border">
                                        <th className="p-4 text-sm font-semibold text-editor-text-secondary">Name / ID</th>
                                        <th className="p-4 text-sm font-semibold text-editor-text-secondary">Description</th>
                                        <th className="p-4 text-sm font-semibold text-editor-text-secondary">Model</th>
                                        <th className="p-4 text-sm font-semibold text-editor-text-secondary text-center">Version</th>
                                        <th className="p-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-editor-text-secondary">
                                                Loading prompts...
                                            </td>
                                        </tr>
                                    ) : prompts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-editor-text-secondary">
                                                No prompts found. Create one to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        areaOrder.map(area => {
                                            if (groupedPrompts[area]) {
                                                return (
                                                    <React.Fragment key={area}>
                                                        <tr className="bg-editor-panel-bg/30">
                                                            <th colSpan={5} className="p-2 text-sm font-semibold text-editor-text-primary tracking-wider">
                                                                {area}
                                                            </th>
                                                        </tr>
                                                        {groupedPrompts[area].map(prompt => <PromptRow key={prompt.id} prompt={prompt} />)}
                                                    </React.Fragment>
                                                )
                                            }
                                            return null;
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default LLMPromptManagement;