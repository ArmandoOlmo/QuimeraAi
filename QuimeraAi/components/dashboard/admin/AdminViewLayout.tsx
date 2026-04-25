import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import HeaderBackButton from '../../ui/HeaderBackButton';

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

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <DashboardWaveRibbons />
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
          <div className="flex items-center gap-2">
            <HeaderBackButton onClick={onBack} className="border-editor-border/60 bg-editor-panel-bg/60 text-editor-text-secondary hover:bg-editor-border/40 hover:text-editor-text-primary focus:ring-editor-accent/25" />
          </div>
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
