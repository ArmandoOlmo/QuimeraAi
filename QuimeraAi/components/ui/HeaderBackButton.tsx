import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-q-border/50 bg-secondary/50 px-3 text-sm font-medium text-q-text-muted transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 ${className}`}
      aria-label={resolvedLabel}
      title={resolvedLabel}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{resolvedLabel}</span>
    </button>
  );
};

export default HeaderBackButton;
