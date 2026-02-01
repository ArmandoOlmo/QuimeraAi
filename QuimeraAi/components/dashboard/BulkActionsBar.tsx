import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Download, CheckCircle, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onChangeStatus: (status: 'Published' | 'Draft') => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onChangeStatus,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="bg-card border-2 border-primary shadow-2xl shadow-primary/20 rounded-full px-6 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{selectedCount}</span>
          </div>
          <span className="text-sm font-medium text-foreground">{t('bulk.selected')}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Export */}
          <button
            onClick={onExportSelected}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={t('bulk.exportSelected')}
            aria-label={t('bulk.exportSelected')}
          >
            <Download size={18} />
          </button>

          {/* Mark as Published */}
          <button
            onClick={() => onChangeStatus('Published')}
            className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-sm font-medium flex items-center gap-1.5"
            title={t('dashboard.published')}
            aria-label={t('dashboard.published')}
          >
            <CheckCircle size={16} />
            <span className="hidden sm:inline">{t('bulk.publish')}</span>
          </button>

          {/* Mark as Draft */}
          <button
            onClick={() => onChangeStatus('Draft')}
            className="px-3 py-1.5 rounded-lg bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 transition-colors text-sm font-medium"
            title={t('dashboard.draft')}
            aria-label={t('dashboard.draft')}
          >
            {t('bulk.draft')}
          </button>

          {/* Delete */}
          <button
            onClick={onDeleteSelected}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center gap-1.5"
            title={t('bulk.deleteSelected')}
            aria-label={t('bulk.deleteSelected')}
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">{t('bulk.delete')}</span>
          </button>
        </div>

        {/* Clear selection */}
        <div className="pl-4 border-l border-border">
          <button
            onClick={onClearSelection}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={t('bulk.clearSelection')}
            aria-label={t('bulk.clearSelection')}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;

