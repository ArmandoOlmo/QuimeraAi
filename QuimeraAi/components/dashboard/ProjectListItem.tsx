
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Project } from '../../types';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { Pencil, Trash2, Copy, Clock, Loader2, MoreVertical, ExternalLink, Download, Calendar, Zap } from 'lucide-react';
import { trackProjectOpened, trackProjectDeleted } from '../../utils/analytics';
import { downloadProjectAsJSON } from '../../utils/projectExporter';
import Modal from '../ui/Modal';

interface ProjectListItemProps {
  project: Project;
  tokenUsage?: { tokensUsed: number; creditsUsed: number };
  maxTokens?: number;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, tokenUsage, maxTokens = 1 }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { createProjectFromTemplate, loadProject, deleteProject } = useProject();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isTemplate = project.status === 'Template';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleOpenProject = () => {
    if (isDeleting) return;

    // Track analytics
    if (!isTemplate) {
      trackProjectOpened(project.id, project.name, project.status);
    }

    if (isTemplate) {
      createProjectFromTemplate(project.id);
    } else {
      loadProject(project.id);
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      if (!isTemplate) {
        trackProjectDeleted(project.id, project.name);
      }

      await deleteProject(project.id);
    } catch (err) {
      console.error("Deletion failed", err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      alert(t('project.deleteError'));
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    handleOpenProject();
  };

  const handleDuplicateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!user) return;

    const newName = prompt(t('project.actions.enterDuplicateName'), `${project.name} (Copy)`);
    if (!newName) return;

    await createProjectFromTemplate(project.id, newName);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!user?.email) {
      alert(t('project.actions.emailRequired'));
      return;
    }
    downloadProjectAsJSON(project, user.email);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('common.today');
    if (diffDays === 1) return t('common.yesterday');
    if (diffDays < 7) return t('common.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('common.weeksAgo', { count: Math.floor(diffDays / 7) });
    if (diffDays < 365) return t('common.monthsAgo', { count: Math.floor(diffDays / 30) });
    return t('common.yearsAgo', { count: Math.floor(diffDays / 365) });
  };

  const statusColor = {
    'Published': 'bg-green-500/20 text-green-500',
    'Draft': 'bg-muted text-muted-foreground',
    'Template': 'bg-primary/20 text-primary',
  }[project.status];

  const translatedStatus = {
    'Published': t('dashboard.published'),
    'Draft': t('dashboard.draft'),
    'Template': t('dashboard.template'),
  }[project.status] || project.status;

  return (
    <div
      onClick={handleOpenProject}
      className={`
        group relative flex items-center gap-4 p-4 
        bg-card rounded-xl border border-border
        hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ExternalLink size={24} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColor}`}>
            {translatedStatus}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>{t('common.updated')} {formatDate(project.lastUpdated)}</span>
        </div>
        {/* Credit Usage Bar - List view */}
        {project.status !== 'Template' && (
          <div className="flex items-center gap-2 mt-1.5">
            <Zap size={12} className="text-yellow-400 flex-shrink-0" aria-hidden="true" />
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, maxTokens > 0 && tokenUsage ? (tokenUsage.creditsUsed / maxTokens) * 100 : 0)}%`,
                  minWidth: tokenUsage && tokenUsage.creditsUsed > 0 ? '4%' : '0%',
                }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {(tokenUsage?.creditsUsed || 0).toLocaleString()} créditos
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 relative" ref={menuRef}>
        <button
          onClick={toggleMenu}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t('common.openMenu')}
        >
          {isDeleting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <MoreVertical size={20} />
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && !isDeleting && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-lg shadow-xl border border-border z-50 overflow-hidden">
            <button
              onClick={handleEditClick}
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-secondary transition-colors text-foreground"
            >
              <Pencil size={16} />
              <span>{isTemplate ? t('project.actions.useTemplate') : t('project.actions.edit')}</span>
            </button>

            {!isTemplate && (
              <button
                onClick={handleDuplicateClick}
                className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-secondary transition-colors text-foreground"
              >
                <Copy size={16} />
                <span>{t('project.actions.duplicate')}</span>
              </button>
            )}

            <button
              onClick={handleDownloadClick}
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-secondary transition-colors text-foreground"
            >
              <Download size={16} />
              <span>{t('project.actions.export')}</span>
            </button>

            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-destructive/10 text-destructive transition-colors"
            >
              <Trash2 size={16} />
              <span>{isTemplate ? t('common.remove') : t('project.actions.delete')}</span>
            </button>
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">{t('common.confirm')}</h3>
          <p className="text-gray-400 mb-6">
            {isTemplate
              ? t('project.deleteConfirm.template')
              : t('project.deleteConfirm.project', { name: project.name })}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectListItem;
