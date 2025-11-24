import React, { useEffect } from 'react';
import { EditorProvider, useEditor } from './contexts/EditorContext';
import { ToastProvider } from './contexts/ToastContext';
import Auth from './components/Auth';
import VerificationScreen from './components/VerificationScreen';
import { auth, signOut } from './firebase';
import ProfileModal from './components/dashboard/ProfileModal';
import GlobalAiAssistant from './components/ui/GlobalAiAssistant';
import OnboardingWizard from './components/ui/OnboardingWizard';
import GlobalSEO from './components/GlobalSEO';
import { useSEO } from './hooks/useSEO';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeMonitoring, setUserContext, clearUserContext } from './utils/monitoring';
import ViewRouter from './components/ViewRouter';


const AppContent: React.FC = () => {
  const { 
    isSidebarOpen, 
    setIsSidebarOpen, 
    view, 
    previewRef, 
    activeProjectId, 
    data, 
    userDocument, 
    isOnboardingOpen, 
    setIsOnboardingOpen 
  } = useEditor();
  const seoConfig = useSEO();

  return (
    <>
      <GlobalSEO config={seoConfig} />
      <ViewRouter
        view={view}
        userDocument={userDocument}
        activeProjectId={activeProjectId}
        data={data}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        previewRef={previewRef}
      />
      <GlobalAiAssistant />
      <OnboardingWizard isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
    </>
  );
};

const AuthGate: React.FC = () => {
  const { user, loadingAuth, verificationEmail, setVerificationEmail, isProfileModalOpen, closeProfileModal, userDocument } = useEditor();

  // Set user context for monitoring when user changes
  useEffect(() => {
    if (user && userDocument) {
      setUserContext({
        id: user.uid,
        email: user.email || undefined,
        role: userDocument.role,
      });
    } else {
      clearUserContext();
    }
  }, [user, userDocument]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-editor-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-editor-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (user) {
    if (user.emailVerified) {
        return (
            <>
                <AppContent />
                {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />}
            </>
        );
    } else {
        const handleGoToLogin = async () => {
            await signOut(auth);
            setVerificationEmail(null); 
        };
        return <VerificationScreen email={user.email!} onGoToLogin={handleGoToLogin} />;
    }
  }

  if (verificationEmail) {
    return <VerificationScreen email={verificationEmail} onGoToLogin={() => setVerificationEmail(null)} />;
  }

  return <Auth onVerificationEmailSent={setVerificationEmail} />;
}


const App: React.FC = () => {
  // Initialize monitoring on app start
  useEffect(() => {
    initializeMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <EditorProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </EditorProvider>
    </ErrorBoundary>
  );
};

export default App;
