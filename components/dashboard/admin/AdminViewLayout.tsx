import React, { useState } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';

interface AdminViewLayoutProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  noPadding?: boolean;
}

const AdminViewLayout: React.FC<AdminViewLayoutProps> = ({ title, onBack, children, noPadding = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-editor-bg text-editor-text-primary">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden transition-colors"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-editor-text-primary">{title}</h2>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-auto ${noPadding ? '' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminViewLayout;
