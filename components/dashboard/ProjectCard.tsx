
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Project } from '../../types';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { Pencil, Trash2, Copy, Clock, Loader2, MoreVertical, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';
import { trackProjectOpened, trackProjectDeleted } from '../../utils/analytics';
import { downloadProjectAsJSON } from '../../utils/projectExporter';
import ThumbnailEditor from '../ui/ThumbnailEditor';
import Modal from '../ui/Modal';

interface ProjectCardProps {
  project: Project;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelectable = false,
  isSelected = false,
  onSelect
}) => {
  const { t } = useTranslation();
  const { user, userDocument } = useAuth();
  const { createProjectFromTemplate, loadProject, deleteProject, refreshProjects } = useProject();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showThumbnailEditor, setShowThumbnailEditor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isTemplate = project.status === 'Template';

  // Extract actual colors from project (check theme.globalColors first, then fallback to section colors)
  const getProjectColors = () => {
    // Try globalColors first
    const gc = project.theme?.globalColors;
    if (gc?.primary || gc?.secondary || gc?.accent) {
      return [gc.primary, gc.secondary, gc.accent, gc.background, gc.text].filter(Boolean) as string[];
    }

    // Fallback to hero colors
    const hc = project.data?.hero?.colors;
    if (hc) {
      return [hc.primary, hc.secondary, hc.background, hc.text, hc.heading].filter(Boolean) as string[];
    }

    // Fallback to header colors
    const headerC = project.data?.header?.colors;
    if (headerC) {
      return [headerC.background, headerC.text, headerC.accent].filter(Boolean) as string[];
    }

    return [];
  };

  const themeColors = getProjectColors();

  // Check if user can delete templates (only owner and superadmin)
  const canDeleteTemplate = () => {
    if (!isTemplate) return true; // Users can always delete their own projects
    const userRole = userDocument?.role || '';
    return ['owner', 'superadmin'].includes(userRole);
  };

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
  }

  const projectLabel = `${project.name} - ${project.status} ${isTemplate ? 'template' : 'project'}`;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false); // Close menu immediately
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      // Track analytics before deletion
      if (!isTemplate) {
        trackProjectDeleted(project.id, project.name);
      }

      await deleteProject(project.id);
      // Component will unmount on success as parent list updates via Context
    } catch (err: any) {
      console.error("Deletion failed", err);
      setIsDeleting(false);
      setShowDeleteConfirm(false); // Close modal on error
      const errorMessage = err?.message || t('project.deleteError');
      alert(errorMessage);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    handleOpenProject();
  }

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (user) {
      downloadProjectAsJSON(project, user.email || 'unknown');
    }
  }

  // Visual Helpers
  const getStatusBadge = (status: string) => {
    const styles = {
      'Published': 'bg-green-500/90 text-white border-green-500/50',
      'Draft': 'bg-slate-500/90 text-white border-slate-500/50',
      'Template': 'bg-amber-500/90 text-white border-amber-500/50',
    }[status] || 'bg-blue-500/90 text-white border-blue-500/50';

    const translatedStatus = {
      'Published': t('dashboard.published'),
      'Draft': t('dashboard.draft'),
      'Template': t('dashboard.template'),
    }[status] || status;

    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${styles}`}>
        {translatedStatus}
      </span>
    );
  };

  const handleCheckboxClick = (e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(project.id);
    }
  };

  return (
    <article
      className={`group relative rounded-2xl overflow-hidden transition-all duration-500 h-[400px] ${isSelected ? 'ring-4 ring-primary shadow-2xl shadow-primary/30' : 'hover:shadow-2xl hover:scale-[1.02]'
        }`}
      aria-label={projectLabel}
    >

      {/* Loading Overlay */}
      {isDeleting && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" aria-hidden="true" />
          <span className="text-xs font-bold text-red-500">{t('project.actions.deleting')}</span>
        </div>
      )}

      {/* Full Background Image - Clickable to Open */}
      <div
        className="relative w-full h-full overflow-hidden cursor-pointer"
        onClick={handleOpenProject}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenProject();
          }
        }}
        aria-label={t('project.aria.open', { name: project.name })}
      >
        <img
          src={project.thumbnailUrl}
          alt={`${project.name} preview`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />

        {/* Dark Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        {/* Top Section: Badges and Menu */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
          <div className="flex gap-2 items-center">
            {/* Selection Checkbox */}
            {isSelectable && !isTemplate && (
              <div className="pointer-events-auto">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={handleCheckboxClick}
                  onClick={handleCheckboxClick}
                  className="w-5 h-5 rounded border-2 border-white/50 bg-black/30 backdrop-blur-md checked:bg-primary checked:border-primary cursor-pointer transition-all"
                  aria-label={t('project.aria.select', { name: project.name })}
                />
              </div>
            )}
            <div className="pointer-events-none">
              {getStatusBadge(project.status)}
            </div>
          </div>

          {/* Color Swatches + Menu Button - Aligned */}
          <div className="flex items-center gap-2">
            {/* Color Swatches */}
            {themeColors.length > 0 && (
              <div className="flex gap-0.5">
                {themeColors.map((color, index) => (
                  <div
                    key={index}
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}

            {/* Menu Button */}
            <div ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu(e);
                }}
                className="p-2 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors shadow-lg pointer-events-auto"
                aria-label={t('project.aria.optionsMenu')}
                aria-expanded={showMenu}
                aria-haspopup="true"
              >
                <MoreVertical size={18} aria-hidden="true" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-44 bg-popover border border-border rounded-xl shadow-2xl py-2 flex flex-col z-30 animate-fade-in-up"
                  role="menu"
                  aria-label={t('project.aria.actionsMenu')}
                >
                  <button
                    onClick={handleEditClick}
                    className="text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary flex items-center gap-3"
                    role="menuitem"
                  >
                    {isTemplate ? <Copy size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
                    {isTemplate ? t('project.actions.useTemplate') : t('project.actions.edit')}
                  </button>
                  {!isTemplate && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          setShowThumbnailEditor(true);
                        }}
                        className="text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary flex items-center gap-3"
                        role="menuitem"
                      >
                        <ImageIcon size={16} aria-hidden="true" />
                        {t('project.actions.changeThumbnail')}
                      </button>
                      <button
                        onClick={handleExportClick}
                        className="text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary flex items-center gap-3"
                        role="menuitem"
                      >
                        <Download size={16} aria-hidden="true" />
                        {t('project.actions.export')}
                      </button>
                    </>
                  )}
                  {canDeleteTemplate() && (
                    <button
                      onClick={handleDeleteClick}
                      className="text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-3"
                      role="menuitem"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      {t('project.actions.delete')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
          <span className="bg-white text-black font-bold py-3 px-6 rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
            {isTemplate ? <Copy size={16} /> : <ExternalLink size={16} />}
            {isTemplate ? t('project.actions.useTemplate') : t('project.actions.open')}
          </span>
        </div>

        {/* Bottom Section: Title and Date */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pointer-events-none">
          <div className="flex items-center gap-3 mb-2">
            {project.faviconUrl && (
              <img
                src={project.faviconUrl}
                alt="Favicon"
                className="w-8 h-8 rounded-md object-contain bg-white/10 backdrop-blur-sm p-1 flex-shrink-0 border border-white/20"
              />
            )}
            <h3
              className="font-bold text-2xl text-white line-clamp-2 pointer-events-auto cursor-pointer hover:text-primary/90 transition-colors"
              title={project.name}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenProject();
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenProject();
                }
              }}
            >
              {project.name}
            </h3>
          </div>
          <div className="flex items-center text-white/90">
            <Clock size={16} className="mr-2" aria-hidden="true" />
            <time dateTime={project.lastUpdated} className="text-sm font-medium">
              {t('common.updated')} {new Date(project.lastUpdated).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
            </time>
          </div>
        </div>
      </div>

      {/* Thumbnail Editor Modal - Using Portal to avoid transform context issues */}
      {showThumbnailEditor && createPortal(
        <ThumbnailEditor
          project={project}
          onClose={() => setShowThumbnailEditor(false)}
          onUpdate={() => {
            // Refresh projects to get the updated thumbnail from Firestore
            refreshProjects();
          }}
        />,
        document.body
      )}

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
    </article>
  );
};

export default ProjectCard;
