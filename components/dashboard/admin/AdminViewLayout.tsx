import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AdminViewLayoutProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  noPadding?: boolean;
}

const AdminViewLayout: React.FC<AdminViewLayoutProps> = ({ title, onBack, children, noPadding = false }) => {
  return (
    <div className="w-full h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-editor-border bg-editor-panel-bg sticky top-0 z-10">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-editor-border rounded-md transition-colors focus:ring-2 focus:ring-editor-accent"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-editor-text-primary">{title}</h2>
      </div>
      
      {/* Content */}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

export default AdminViewLayout;
