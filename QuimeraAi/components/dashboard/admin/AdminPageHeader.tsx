import React from 'react';
import { Menu } from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';

interface AdminPageHeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  onBack?: () => void;
  onMenuClick?: () => void;
  menuTitle?: string;
  hideMenuButton?: boolean;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  sticky?: boolean;
  zIndexClassName?: string;
  className?: string;
}

const adminBackButtonClassName =
  'border-editor-border/60 bg-editor-panel-bg/60 text-editor-text-secondary hover:bg-editor-border/40 hover:text-editor-text-primary focus:ring-editor-accent/25';

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  icon,
  onBack,
  onMenuClick,
  menuTitle = 'Open menu',
  hideMenuButton = false,
  centerContent,
  rightContent,
  sticky = false,
  zIndexClassName = 'z-10',
  className = '',
}) => {
  return (
    <header
      className={`relative h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 ${sticky ? `sticky top-0 ${zIndexClassName}` : ''} ${className}`}
    >
      <div className="min-w-0 flex items-center gap-3">
        {onMenuClick && !hideMenuButton && (
          <button
            type="button"
            onClick={onMenuClick}
            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden transition-colors"
            title={menuTitle}
            aria-label={menuTitle}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0 flex items-center gap-2">
          {icon && (
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-editor-accent">
              {icon}
            </span>
          )}
          <h1 className="truncate text-lg font-semibold text-editor-text-primary">{title}</h1>
        </div>
      </div>

      {centerContent && (
        <div className="hidden sm:flex items-center absolute left-1/2 -translate-x-1/2">
          {centerContent}
        </div>
      )}

      <div className="flex flex-shrink-0 items-center gap-2">
        {rightContent}
        {onBack && <HeaderBackButton onClick={onBack} className={adminBackButtonClassName} />}
      </div>
    </header>
  );
};

export default AdminPageHeader;
