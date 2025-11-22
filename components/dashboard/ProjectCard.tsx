
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Project } from '../../types';
import { useEditor } from '../../contexts/EditorContext';
import { Pencil, Trash2, Copy, Clock, Loader2, MoreVertical, ExternalLink, Download } from 'lucide-react';
import { trackProjectOpened, trackProjectDeleted } from '../../utils/analytics';
import { downloadProjectAsJSON } from '../../utils/projectExporter';

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
  const { createProjectFromTemplate, loadProject, deleteProject, user } = useEditor();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
  }

  const projectLabel = `${project.name} - ${project.status} ${isTemplate ? 'template' : 'project'}`;

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false); // Close menu immediately
    
    if (isDeleting) return;

    const confirmMsg = isTemplate 
        ? 'Remove this template from your view?' 
        : `Delete "${project.name}" permanently?`;

    if (window.confirm(confirmMsg)) {
        setIsDeleting(true);
        try {
            // Track analytics before deletion
            if (!isTemplate) {
              trackProjectDeleted(project.id, project.name);
            }
            
            await deleteProject(project.id);
            // Component will unmount on success as parent list updates via Context
        } catch (err) {
            console.error("Deletion failed", err);
            setIsDeleting(false);
            alert("Failed to delete project. Please try again.");
        }
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

  return (
    <article 
      className={`group flex flex-col bg-card border rounded-2xl overflow-hidden transition-all duration-500 h-full relative ${
        isSelected ? 'border-primary border-2 shadow-xl shadow-primary/20' : 'border-border hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10'
      }`}
      aria-label={projectLabel}
    >
      
      {/* Loading Overlay */}
      {isDeleting && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center" role="status" aria-live="polite">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" aria-hidden="true" />
              <span className="text-xs font-bold text-red-500">Deleting...</span>
          </div>
      )}

      {/* Image Container - Clickable to Open */}
      <div 
        className="relative aspect-[4/3] overflow-hidden bg-secondary cursor-pointer"
        onClick={handleOpenProject}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenProject();
          }
        }}
        aria-label={`Open ${project.name}`}
      >
        <img 
            src={project.thumbnailUrl} 
            alt={`${project.name} preview`} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
        />
        
        {/* Gradient Overlay - Oscuro en todos los modos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
             {/* Selection Checkbox */}
             {isSelectable && !isTemplate && (
               <div className="pointer-events-auto">
                 <input
                   type="checkbox"
                   checked={isSelected}
                   onChange={handleCheckboxClick}
                   onClick={handleCheckboxClick}
                   className="w-5 h-5 rounded border-2 border-white/50 bg-black/20 backdrop-blur-md checked:bg-primary checked:border-primary cursor-pointer transition-all"
                   aria-label={`Select ${project.name}`}
                 />
               </div>
             )}
             <div className="pointer-events-none">
               {getStatusBadge(project.status)}
             </div>
        </div>

        {/* Menu Button (Replacing Hover Overlay) */}
        <div className="absolute top-2 right-2 z-20" ref={menuRef}>
             <button 
                onClick={toggleMenu}
                className="p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors shadow-sm"
                aria-label="Project options menu"
                aria-expanded={showMenu}
                aria-haspopup="true"
             >
                 <MoreVertical size={16} aria-hidden="true" />
             </button>
             
             {showMenu && (
                 <div 
                   className="absolute right-0 top-full mt-2 w-40 bg-popover border border-border rounded-lg shadow-xl py-1 flex flex-col z-30 animate-fade-in-up"
                   role="menu"
                   aria-label="Project actions"
                 >
                     <button 
                        onClick={handleEditClick}
                        className="text-left px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-2"
                        role="menuitem"
                     >
                         {isTemplate ? <Copy size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
                         {isTemplate ? 'Use Template' : 'Edit'}
                     </button>
                     {!isTemplate && (
                       <button 
                          onClick={handleExportClick}
                          className="text-left px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-2"
                          role="menuitem"
                       >
                           <Download size={14} aria-hidden="true" />
                           Export
                       </button>
                     )}
                     <button 
                        onClick={handleDeleteClick}
                        className="text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                        role="menuitem"
                     >
                         <Trash2 size={14} aria-hidden="true" />
                         Delete
                     </button>
                 </div>
             )}
        </div>

        {/* Hover Actions Overlay (Simplified) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
            <span className="bg-white text-black font-bold py-2 px-4 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center">
                {isTemplate ? <Copy size={14} className="mr-2"/> : <ExternalLink size={14} className="mr-2"/>}
                {isTemplate ? 'Use Template' : 'Open'}
            </span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-4 flex flex-col flex-grow bg-card relative z-10">
        <div className="flex justify-between items-start mb-2 gap-3">
            {/* Title - Clickable to Open */}
            <h3 
                className="font-bold text-base text-foreground truncate hover:text-primary hover:underline transition-all flex-1 cursor-pointer" 
                title={project.name}
                onClick={handleOpenProject}
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
        
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
            <span className="flex items-center text-[11px] text-muted-foreground font-medium">
                <Clock size={12} className="mr-1.5" aria-hidden="true"/> 
                <time dateTime={project.lastUpdated}>
                  {new Date(project.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </time>
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest" aria-label="Version 1.0">v1.0</span>
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
