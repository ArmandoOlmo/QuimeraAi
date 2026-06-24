import React from 'react';
import { Menu } from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { AppButton } from '../../ui/system';
import { AppShellTopbar } from '@/src/design-system/components/AppShell';

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
    <AppShellTopbar
      className={`admin-dashboard-topbar ${sticky ? zIndexClassName : ''} ${className}`}
    >
      <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0 min-w-0">
        {onMenuClick && !hideMenuButton && (
          <AppButton
            variant="icon"
            size="icon-md"
            type="button"
            onClick={onMenuClick}
            className="lg:hidden text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay active:bg-q-surface-overlay touch-manipulation"
            title={menuTitle}
            aria-label={menuTitle}
          >
            <Menu className="icon-lg" />
          </AppButton>
        )}

        <div className="min-w-0 flex items-center gap-1 sm:gap-2">
          {icon && (
            <span className="flex flex-shrink-0 items-center justify-center quimera-dashboard-header-icon [&_svg]:icon-lg">
              {icon}
            </span>
          )}
          <h1 className="truncate text-sm sm:text-xl font-semibold sm:font-bold text-q-text">{title}</h1>
        </div>
      </div>

      {centerContent && (
        <div className="hidden sm:flex items-center absolute left-1/2 -translate-x-1/2">
          {centerContent}
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 mr-2.5">
        {rightContent}
        {onBack && <HeaderBackButton onClick={onBack} />}
      </div>
    </AppShellTopbar>
  );
};

export default AdminPageHeader;
