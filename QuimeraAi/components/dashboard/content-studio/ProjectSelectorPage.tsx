import React from 'react';
import BaseProjectSelectorPage from '../assets/ProjectSelectorPage';

interface ContentStudioProjectSelectorPageProps {
    onProjectSelect: (projectId: string) => void;
    onBack?: () => void;
}

const ContentStudioProjectSelectorPage: React.FC<ContentStudioProjectSelectorPageProps> = (props) => (
    <BaseProjectSelectorPage {...props} variant="contentStudio" />
);

export default ContentStudioProjectSelectorPage;
