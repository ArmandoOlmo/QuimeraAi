import React, { useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
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
  const layoutClasses = 'flex h-screen bg-q-bg text-q-text';
  const shellClasses = 'flex-1 flex flex-col overflow-hidden relative';
  const contentClasses = ['flex-1 overflow-auto', noPadding ? '' : 'p-6'].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses}>
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className={shellClasses}>
        <AdminPageHeader
          title={title}
          icon={icon}
          onBack={onBack}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {/* Content */}
        <main className={contentClasses}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminViewLayout;
