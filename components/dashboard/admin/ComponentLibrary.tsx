
import React from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { PageSection } from '../../../types';

const Label: React.FC<{ children: React.ReactNode, htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const ToggleControl: React.FC<{ label?: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
    <div className={`flex items-center ${label ? 'justify-between' : 'justify-start'}`}>
        {label && <Label>{label}</Label>}
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label || 'Enable section'}
            onClick={() => onChange(!checked)}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const componentNames: Record<PageSection, string> = {
    hero: 'Hero Section',
    features: 'Features Section',
    testimonials: 'Testimonials Section',
    slideshow: 'Slideshow Section',
    pricing: 'Pricing Section',
    faq: 'FAQ Section',
    portfolio: 'Portfolio Section',
    leads: 'Leads/Contact Section',
    newsletter: 'Newsletter Section',
    cta: 'CTA Section',
    services: 'Services Section',
    team: 'Team Section',
    video: 'Video Section',
    howItWorks: 'How It Works Section',
    chatbot: 'AI Chatbot Widget',
    footer: 'Footer Section',
    header: 'Header / Navigation',
    typography: 'Global Typography',
};

const ComponentLibrary: React.FC = () => {
    const { componentStatus, updateComponentStatus } = useEditor();

    return (
        <div className="p-6 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-editor-text-primary mb-2">Component Library</h2>
                <p className="text-editor-text-secondary mb-8">
                    Enable or disable components globally across the entire platform. Disabled components will not be available in the editor for any user.
                </p>

                <div className="bg-editor-panel-bg border border-editor-border rounded-lg">
                    <ul className="divide-y divide-editor-border">
                        {(Object.keys(componentNames) as PageSection[]).map((key) => (
                            <li key={key} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-editor-text-primary">{componentNames[key]}</p>
                                    <p className={`text-sm ${componentStatus[key] ? 'text-green-400' : 'text-red-400'}`}>
                                        {componentStatus[key] ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                                <ToggleControl 
                                    checked={componentStatus[key]}
                                    onChange={(isEnabled) => updateComponentStatus(key, isEnabled)}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ComponentLibrary;
