import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils';

interface HeaderBackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({
  onClick,
  label,
  className = '',
}) => {
  const { t } = useTranslation();
  const resolvedLabel = label || t('common.back', 'Volver');
  const backButtonClasses = 'no-min-touch inline-flex h-9 min-h-9 max-h-9 w-9 min-w-9 max-w-9 items-center justify-center rounded-[var(--q-radius-md)] border border-border-subtle bg-q-surface p-0 text-sm font-medium text-q-text-muted transition-colors hover:bg-q-surface-overlay hover:text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent/25';
  const iconClasses = 'icon-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        backButtonClasses,
        className
      )}
      aria-label={resolvedLabel}
      title={resolvedLabel}
    >
      <ArrowLeft className={iconClasses} />
    </button>
  );
};

export default HeaderBackButton;
