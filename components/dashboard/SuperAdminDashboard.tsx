
import React, { useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Shield, Users, LayoutTemplate, Bot, BarChart3, CreditCard, Puzzle, ArrowLeft, Menu, Image, MessageSquare } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import TenantManagement from './admin/TenantManagement';
import LLMPromptManagement from './admin/LLMPromptManagement';
import UsageStatistics from './admin/UsageStatistics';
import BillingManagement from './admin/BillingManagement';
import TemplateManagement from './admin/TemplateManagement';
import ComponentsDashboard from './admin/ComponentsDashboard';
import ImageLibraryManagement from './admin/ImageLibraryManagement';
import GlobalAssistantSettings from './admin/GlobalAssistantSettings';

const AdminCard: React.FC<{ icon: React.ReactNode, title: string, description: string, onClick?: () => void }> = ({ icon, title, description, onClick }) => (
    <div onClick={onClick} className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border hover:border-editor-accent transition-colors cursor-pointer group">
        <div className="flex items-center space-x-4">
            <div className="bg-editor-accent/10 p-3 rounded-lg text-editor-accent">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-editor-text-primary group-hover:text-editor-accent transition-colors">{title}</h3>
                <p className="text-sm text-editor-text-secondary mt-1">{description}</p>
            </div>
        </div>
    </div>
);

const SuperAdminDashboard = () => {
    const { setView, adminView, setAdminView } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const adminFeatures = [
        { id: 'tenants', title: "Tenant Management", description: "Administer clients and workspaces.", icon: <Users size={24} /> },
        { id: 'global-assistant', title: "Global Assistant", description: "Configure system-wide AI chat and voice.", icon: <MessageSquare size={24} /> },
        { id: 'templates', title: "Website Templates", description: "Create and manage site templates.", icon: <LayoutTemplate size={24} /> },
        { id: 'components', title: "Components", description: "Manage library and design defaults.", icon: <Puzzle size={24} /> },
        { id: 'images', title: "Image Library", description: "Manage global stock images.", icon: <Image size={24} /> },
        { id: 'prompts', title: "LLM Prompts", description: "Configure and manage LLM prompts.", icon: <Bot size={24} /> },
        { id: 'stats', title: "Usage Statistics", description: "View platform usage and analytics.", icon: <BarChart3 size={24} /> },
        { id: 'billing', title: "Payments & Plans", description: "Handle subscriptions and billing.", icon: <CreditCard size={24} /> },
    ];

    const handleCardClick = (id: string) => {
        switch (id) {
            case 'tenants': setAdminView('tenants'); break;
            case 'prompts': setAdminView('prompts'); break;
            case 'stats': setAdminView('stats'); break;
            case 'billing': setAdminView('billing'); break;
            case 'templates': setAdminView('templates'); break;
            case 'components': setAdminView('components'); break;
            case 'images': setAdminView('images'); break;
            case 'global-assistant': setAdminView('global-assistant'); break;
            default: break;
        }
    };

    if (adminView === 'tenants') return <TenantManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'prompts') return <LLMPromptManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'stats') return <UsageStatistics onBack={() => setAdminView('main')} />;
    if (adminView === 'billing') return <BillingManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'templates') return <TemplateManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'components') return <ComponentsDashboard onBack={() => setAdminView('main')} />;
    if (adminView === 'images') return <ImageLibraryManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'global-assistant') return <GlobalAssistantSettings onBack={() => setAdminView('main')} />;
    

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                 <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                         <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 text-editor-text-secondary hover:text-editor-text-primary lg:hidden mr-2"
                            title="Open menu"
                        >
                            <Menu />
                        </button>
                        <div className="flex items-center space-x-2">
                             <Shield className="text-editor-accent" />
                             <h1 className="text-xl font-bold text-editor-text-primary">Super Admin Panel</h1>
                        </div>
                    </div>
                     <button 
                        onClick={() => setView('dashboard')}
                        className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
                    >
                        <ArrowLeft size={16} className="mr-1.5" />
                        Back to Dashboard
                    </button>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    <p className="text-editor-text-secondary mb-8">You have access to all administrative functions of the platform.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {adminFeatures.map(feature => (
                            <AdminCard 
                                key={feature.id}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                onClick={() => handleCardClick(feature.id)}
                            />
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default SuperAdminDashboard;
