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
      <div className="min-h-screen bg-editor-bg flex items-center justify-center relative overflow-hidden">
        {/* Pulsing halo effect */}
        <div className="absolute">
          <div className="relative flex items-center justify-center">
            {/* Multiple pulsing halos */}
            <div className="absolute w-32 h-32 rounded-full bg-yellow-400/20 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute w-24 h-24 rounded-full bg-yellow-400/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}></div>
            <div className="absolute w-40 h-40 rounded-full bg-yellow-400/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.4s' }}></div>
            
            {/* Logo container with glow */}
            <div className="relative z-10 w-20 h-20 rounded-full bg-editor-panel-bg shadow-2xl flex items-center justify-center border-2 border-yellow-400/30">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" 
                alt="Quimera Logo" 
                className="w-14 h-14 object-contain animate-pulse"
                style={{ animationDuration: '1.5s' }}
              />
            </div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="absolute bottom-1/3 text-center">
          <p className="text-editor-text-secondary text-sm animate-pulse">Loading...</p>
        </div>
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
