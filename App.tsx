
import React from 'react';
import Controls from './components/Controls';
import LandingPage from './components/LandingPage';
import BrowserPreview from './components/BrowserPreview';
import EditorHeader from './components/EditorHeader';
import { EditorProvider, useEditor } from './contexts/EditorContext';
import Dashboard from './components/dashboard/Dashboard';
import SuperAdminDashboard from './components/dashboard/SuperAdminDashboard';
import Auth from './components/Auth';
import VerificationScreen from './components/VerificationScreen';
import { auth, signOut } from './firebase';
import ProfileModal from './components/dashboard/ProfileModal';
import CMSDashboard from './components/cms/CMSDashboard';
import NavigationDashboard from './components/dashboard/navigation/NavigationDashboard';
import AiAssistantDashboard from './components/dashboard/ai/AiAssistantDashboard';
import GlobalAiAssistant from './components/ui/GlobalAiAssistant';
import OnboardingWizard from './components/ui/OnboardingWizard';
import LeadsDashboard from './components/dashboard/leads/LeadsDashboard';
import DomainsDashboard from './components/dashboard/domains/DomainsDashboard';


const AppContent: React.FC = () => {
  const { isSidebarOpen, setIsSidebarOpen, view, previewRef, activeProjectId, data, userDocument, isOnboardingOpen, setIsOnboardingOpen } = useEditor();

  // Helper to render the correct main view
  const renderMainView = () => {
      if (view === 'superadmin' && userDocument?.role === 'superadmin') {
        return <SuperAdminDashboard />;
      }

      if (view === 'cms') {
          return <CMSDashboard />;
      }

      if (view === 'navigation') {
          return <NavigationDashboard />;
      }
      
      if (view === 'ai-assistant') {
          return <AiAssistantDashboard />;
      }
      
      if (view === 'leads') {
          return <LeadsDashboard />;
      }
      
      if (view === 'domains') {
          return <DomainsDashboard />;
      }

      if (view === 'dashboard' || view === 'websites' || view === 'assets' || !activeProjectId || !data) {
        return <Dashboard />;
      }

      // Editor View
      return (
        <div className="flex flex-col h-screen bg-editor-bg text-editor-text-primary">
          <EditorHeader />
          <div className="flex flex-1 overflow-hidden relative">
            <Controls />
            {/* Backdrop for mobile sidebar */}
            <div 
              aria-hidden="true"
              onClick={() => setIsSidebarOpen(false)} 
              className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            />
            <main className="flex-1 p-4 sm:p-8 flex justify-center">
              <BrowserPreview ref={previewRef}>
                <LandingPage />
              </BrowserPreview>
            </main>
          </div>
        </div>
      );
  };

  return (
    <>
        {renderMainView()}
        <GlobalAiAssistant />
        <OnboardingWizard isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
    </>
  );
};

const AuthGate: React.FC = () => {
  const { user, loadingAuth, verificationEmail, setVerificationEmail, isProfileModalOpen, closeProfileModal } = useEditor();

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
  return (
    <EditorProvider>
      <AuthGate />
    </EditorProvider>
  );
};

export default App;
