
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../../types';
import { useEditor } from '../../contexts/EditorContext';
import { Pencil, Trash2, Copy, Clock, Loader2, MoreVertical, ExternalLink, Download, Calendar } from 'lucide-react';
import { trackProjectOpened, trackProjectDeleted } from '../../utils/analytics';
import { downloadProjectAsJSON } from '../../utils/projectExporter';

interface ProjectListItemProps {
  project: Project;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project }) => {
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
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    
    if (isDeleting) return;

    const confirmMsg = isTemplate 
      ? 'Remove this template from your view?' 
      : `Delete "${project.name}" permanently?`;

    if (window.confirm(confirmMsg)) {
      setIsDeleting(true);
      try {
        if (!isTemplate) {
          trackProjectDeleted(project.id, project.name);
        }
        
        await deleteProject(project.id);
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
  };

  const handleDuplicateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!user) return;

    const newName = prompt("Enter name for duplicated project:", `${project.name} (Copy)`);
    if (!newName) return;

    await createProjectFromTemplate(project.id, newName);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    downloadProjectAsJSON(project);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const statusColor = {
    'Published': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'Draft': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'Template': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  }[project.status];

  return (
    <div
      onClick={handleOpenProject}
      className={`
        group relative flex items-center gap-4 p-4 
        bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700
        hover:border-blue-400 dark:hover:border-blue-500 
        hover:shadow-lg transition-all duration-200 cursor-pointer
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
        {project.thumbnailUrl ? (
          <img 
            src={project.thumbnailUrl} 
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ExternalLink size={24} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {project.name}
          </h3>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColor}`}>
            {project.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock size={14} />
          <span>Updated {formatDate(project.lastUpdated)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 relative" ref={menuRef}>
        <button
          onClick={toggleMenu}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="More options"
        >
          {isDeleting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <MoreVertical size={20} />
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && !isDeleting && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            <button
              onClick={handleEditClick}
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Pencil size={16} />
              <span>Edit</span>
            </button>
            
            {!isTemplate && (
              <button
                onClick={handleDuplicateClick}
                className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Copy size={16} />
                <span>Duplicate</span>
              </button>
            )}

            <button
              onClick={handleDownloadClick}
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Download size={16} />
              <span>Download</span>
            </button>

            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
              <span>{isTemplate ? 'Remove' : 'Delete'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectListItem;
