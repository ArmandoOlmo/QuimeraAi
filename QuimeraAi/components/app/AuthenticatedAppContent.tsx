import React, { Suspense, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
import { useSafeAdmin } from '../../contexts/admin';
import { useSEO } from '../../hooks/useSEO';
import GlobalSEO from '../GlobalSEO';
import AdPixelsInjector from '../AdPixelsInjector';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { AdminView, View } from '../../types/ui';

const GlobalAiAssistant = lazyWithRetry(() => import('../ui/GlobalAiAssistant'));
const OnboardingModal = lazyWithRetry(() => import('../onboarding/OnboardingModal'));
const AIWebsiteStudio = lazyWithRetry(() => import('../onboarding/AIWebsiteStudio'));
const ViewRouter = lazyWithRetry(() => import('../ViewRouter'));

const MinimalLoader = () => (
  <div className="min-h-screen bg-background" />
);

const GlobalAdPixels: React.FC = () => {
  const adminContext = useSafeAdmin();

  if (!adminContext || !adminContext.globalAdPixels) return null;

  return <AdPixelsInjector config={adminContext.globalAdPixels} />;
};

interface AuthenticatedAppContentProps {
  routeView: View;
  routeAdminView: AdminView | null;
  routeProjectId: string | null;
}

const AuthenticatedAppContent: React.FC<AuthenticatedAppContentProps> = ({
  routeView,
  routeAdminView,
  routeProjectId,
}) => {
  const { userDocument } = useAuth();
  const { view, setView, setAdminView, isSidebarOpen, setIsSidebarOpen, previewRef } = useUI();
  const { activeProjectId, loadProject, data, isLoadingProjects } = useProject();
  const seoConfig = useSEO();
  const loadingRouteProjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (routeView && routeView !== view) {
      setView(routeView);
    }
    if (routeView === 'superadmin') {
      const targetAdminView = routeAdminView || 'main';
      setAdminView(targetAdminView);
    }

    const needsLoad = routeProjectId !== activeProjectId || !data;
    const shouldLoadProject = routeProjectId && !isLoadingProjects && needsLoad && loadingRouteProjectRef.current !== routeProjectId;

    if (shouldLoadProject) {
      loadingRouteProjectRef.current = routeProjectId;
      loadProject(routeProjectId, false, false);
    } else if (routeProjectId === activeProjectId && data) {
      loadingRouteProjectRef.current = null;
    }
  }, [routeView, routeAdminView, routeProjectId, view, activeProjectId, setView, setAdminView, loadProject, isLoadingProjects, data]);

  return (
    <>
      <GlobalAdPixels />
      <GlobalSEO config={seoConfig} />
      <Suspense fallback={<MinimalLoader />}>
        <ViewRouter
          view={view}
          userDocument={userDocument}
          activeProjectId={activeProjectId}
          data={data}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          previewRef={previewRef}
        />
      </Suspense>
      <Suspense fallback={null}>
        <GlobalAiAssistant />
      </Suspense>
      <Suspense fallback={null}>
        <OnboardingModal />
      </Suspense>
      <Suspense fallback={null}>
        <AIWebsiteStudio />
      </Suspense>
    </>
  );
};

export default AuthenticatedAppContent;
