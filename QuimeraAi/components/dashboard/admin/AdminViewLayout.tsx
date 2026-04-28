import React, { useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import AdminPageHeader from './AdminPageHeader';

interface AdminViewLayoutProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  noPadding?: boolean;
  icon?: React.ReactNode;
}

const AdminViewLayout: React.FC<AdminViewLayoutProps> = ({ title, onBack, children, noPadding = false, icon }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-q-bg text-q-text">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <DashboardWaveRibbons />
        <AdminPageHeader
          title={title}
          icon={icon}
          onBack={onBack}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {/* Content */}
        <main className={`flex-1 overflow-auto ${noPadding ? '' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminViewLayout;
