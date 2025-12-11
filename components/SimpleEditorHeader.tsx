import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';
import ThemeToggle from './ui/ThemeToggle';
import { LayoutDashboard, Check, CloudUpload, Globe, SlidersHorizontal, Menu } from 'lucide-react';

interface SimpleEditorHeaderProps {
  onOpenMobileMenu?: () => void;
}

const SimpleEditorHeader: React.FC<SimpleEditorHeaderProps> = ({ onOpenMobileMenu }) => {
  const { t } = useTranslation();
  const { isSidebarOpen, setIsSidebarOpen } = useUI();
  const { activeProject, renameActiveProject, saveProject, isEditingTemplate, exitTemplateEditor } = useProject();
  const { navigate } = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(activeProject?.name || t('editor.untitledProject'));
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeProject) {
      setProjectName(activeProject.name);
    }
  }, [activeProject]);

  useEffect(() => {
    if (isEditingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (projectName.trim() && activeProject && projectName.trim() !== activeProject.name) {
      renameActiveProject(projectName.trim());
    } else if (activeProject) {
      setProjectName(activeProject.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      if (activeProject) {
        setProjectName(activeProject.name);
      }
    }
  };

  const handleSaveClick = () => {
    saveProject();
    setSaveState('saved');
    setTimeout(() => {
        setSaveState('idle');
    }, 2500);
  };

  const handleGoToDashboard = () => {
    if (isEditingTemplate) {
      exitTemplateEditor();
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  return (
    <header className="h-14 px-3 md:px-6 border-b border-border flex items-center gap-2 md:gap-4 bg-background z-20 sticky top-0" role="banner">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {/* Mobile Menu Button - Opens DashboardSidebar */}
        {onOpenMobileMenu && (
          <button 
            onClick={onOpenMobileMenu}
            className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl transition-colors touch-manipulation lg:hidden"
            title={t('common.menu')}
            aria-label={t('common.menu')}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Dashboard Button - More prominent on mobile */}
        <button 
          title={t('editor.goToDashboard')} 
          className="h-10 w-10 md:h-9 md:w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl md:rounded-full transition-colors touch-manipulation"
          onClick={handleGoToDashboard}
        >
          <LayoutDashboard className="w-5 h-5 md:w-4 md:h-4" />
        </button>
        
        {/* Mobile Controls Button - Editor Controls Panel */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`h-10 w-10 md:h-9 md:w-9 flex items-center justify-center hover:bg-secondary/80 rounded-xl md:rounded-full transition-colors touch-manipulation md:hidden ${
            isSidebarOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
          title={t('editor.toggleControls')}
          aria-label={t('editor.toggleControls')}
          aria-pressed={isSidebarOpen}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Project Name - Hidden on mobile (already shown in BrowserPreview) */}
        <div className="hidden md:flex items-center gap-2">
          <Globe className="text-primary" size={24} aria-hidden="true" />
          
          {/* Project Name */}
          {isEditingName ? (
            <input
              ref={inputRef}
              value={projectName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="bg-transparent text-xl font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 min-w-[120px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xl font-bold text-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-border/40"
              title={t('editor.renameProject')}
            >
              {projectName}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Save Button */}
        <button
          title={saveState === 'idle' ? t('editor.saveChanges') : t('editor.saved')}
          onClick={handleSaveClick}
          disabled={saveState === 'saved'}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-border/40 disabled:text-green-500 disabled:hover:bg-transparent"
        >
          {saveState === 'idle' ? (
            <CloudUpload className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span className="hidden lg:inline">
            {saveState === 'idle' ? t('common.save') : t('editor.saved')}
          </span>
        </button>

        {/* Publish Button */}
        <button className="text-primary hover:text-primary/80 font-medium text-sm h-9 px-3 transition-colors">
          {t('editor.publish')}
        </button>
      </div>
    </header>
  );
};

export default SimpleEditorHeader;

