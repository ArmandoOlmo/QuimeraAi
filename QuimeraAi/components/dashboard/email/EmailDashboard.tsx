/**
 * EmailDashboard
 * Thin shell — handles project selection then delegates to UserEmailHub.
 * Preserves the useEmailDashboardContext for backward compatibility.
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { parseEmailReviewQueueParams } from '../../../services/email/emailReviewQueueLinkService.ts';
import DashboardSidebar from '../DashboardSidebar';
import QuimeraLoader from '../../ui/QuimeraLoader';
import EmailProjectSelectorPage from './EmailProjectSelectorPage';
import UserEmailHub from './UserEmailHub';

// Email Dashboard Context — kept for backward compatibility with downstream modules
interface EmailDashboardContextData {
    userId: string;
    projectId: string;
    projectName: string;
}

const EmailDashboardContext = createContext<EmailDashboardContextData>({
    userId: '',
    projectId: '',
    projectName: '',
});

export const useEmailDashboardContext = () => useContext(EmailDashboardContext);

interface EmailDashboardProps {
    projectId?: string;
}

const EmailDashboard: React.FC<EmailDashboardProps> = ({ projectId: propProjectId }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { projects, activeProject, activeProjectId } = useProject();
    const { navigate, query } = useRouter();
    const userId = user?.id || '';
    const reviewQueueParams = parseEmailReviewQueueParams(query);

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(reviewQueueParams.projectId || null);
    const [showAllProjects, setShowAllProjects] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const effectiveProjectId = propProjectId || selectedProjectId || activeProjectId || '';
    const effectiveProject = projects.find(p => p.id === effectiveProjectId) || activeProject;

    // Sync selected project with active project
    useEffect(() => {
        if (activeProjectId) {
            setSelectedProjectId(activeProjectId);
        }
    }, [activeProjectId]);

    useEffect(() => {
        if (reviewQueueParams.projectId) {
            setSelectedProjectId(reviewQueueParams.projectId);
        }
    }, [reviewQueueParams.projectId]);

    // Loading state
    if (!userId) {
        return (
            <div className="min-h-screen bg-q-bg flex items-center justify-center">
                <div className="text-center">
                    <QuimeraLoader size="md" />
                    <p className="text-q-text-muted">{t('common.loading', 'Cargando...')}</p>
                </div>
            </div>
        );
    }

    // No project selected — show project selector
    if (!effectiveProjectId || projects.length === 0 || showAllProjects) {
        return (
            <EmailProjectSelectorPage
                onProjectSelect={(pid) => {
                    setSelectedProjectId(pid);
                    setShowAllProjects(false);
                }}
                onBack={() => {
                    if (showAllProjects && effectiveProjectId) {
                        setShowAllProjects(false);
                    } else {
                        navigate(ROUTES.DASHBOARD);
                    }
                }}
            />
        );
    }

    // Render the full hub
    return (
        <EmailDashboardContext.Provider value={{ userId, projectId: effectiveProjectId, projectName: effectiveProject?.name || '' }}>
            <UserEmailHub
                userId={userId}
                projectId={effectiveProjectId}
                projectName={effectiveProject?.name || ''}
                initialTab={reviewQueueParams.tab}
                reviewQueueFilters={reviewQueueParams.filters}
                hasReviewQueueFilter={reviewQueueParams.hasFilter}
                onBack={() => setShowAllProjects(true)}
            />
        </EmailDashboardContext.Provider>
    );
};

export default EmailDashboard;
