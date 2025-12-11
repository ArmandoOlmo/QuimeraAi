import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import { useEditor } from '../../../contexts/EditorContext';
import { CustomComponent, EditableComponentID } from '../../../types';
import { X } from 'lucide-react';

interface CreateComponentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComponentCreated: (component: CustomComponent) => void;
}

// Re-using componentOptions from ComponentDesigner.tsx
const componentOptions: { id: EditableComponentID, name: string }[] = [
    { id: 'hero', name: 'Hero Section' },
    { id: 'banner', name: 'Banner Section' },
    { id: 'features', name: 'Features Section' },
    { id: 'services', name: 'Services Section' },
    { id: 'testimonials', name: 'Testimonials Section' },
    { id: 'team', name: 'Team Section' },
    { id: 'cta', name: 'CTA Section' },
];

const CreateComponentModal: React.FC<CreateComponentModalProps> = ({ isOpen, onClose, onComponentCreated }) => {
    const { createNewCustomComponent } = useAdmin();
    const [name, setName] = useState('');
    const [baseComponent, setBaseComponent] = useState<EditableComponentID>('hero');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Component name cannot be empty.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const newComponent = await createNewCustomComponent(name, baseComponent);
            onComponentCreated(newComponent);
            handleClose();
        } catch (err) {
            console.error('Failed to create component:', err);
            setError('Failed to create component. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setName('');
        setBaseComponent('hero');
        setError('');
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <div className="p-6 border-b border-editor-border flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Create New Component</h2>
                <button onClick={handleClose} className="p-1 rounded-full hover:bg-editor-border"><X/></button>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="p-6 md:p-8 overflow-y-auto space-y-4">
                    {error && <p className="bg-red-500/10 text-red-400 text-sm p-3 rounded-md">{error}</p>}
                    
                    <div>
                        <label htmlFor="component-name" className="block text-sm font-medium text-editor-text-secondary mb-1">Component Name</label>
                        <input 
                            id="component-name" 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                            className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none" 
                            placeholder="e.g., Product Hero"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="base-component-type" className="block text-sm font-medium text-editor-text-secondary mb-1">Base Component Type</label>
                        <select 
                            id="base-component-type" 
                            value={baseComponent} 
                            onChange={(e) => setBaseComponent(e.target.value as EditableComponentID)} 
                            className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none"
                        >
                            {componentOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-6 bg-editor-panel-bg/50 border-t border-editor-border flex justify-end items-center space-x-3">
                    <button type="button" onClick={handleClose} className="font-semibold py-2 px-5 rounded-lg hover:bg-editor-border transition-colors">Cancel</button>
                    <button type="submit" disabled={isLoading} className="text-editor-accent font-bold py-2 px-4 hover:text-editor-accent-hover transition-colors disabled:opacity-50 flex items-center">
                        {isLoading && <div className="w-4 h-4 border-2 border-editor-accent border-t-transparent rounded-full animate-spin mr-2"></div>}
                        {isLoading ? 'Creating...' : 'Create Component'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateComponentModal;
