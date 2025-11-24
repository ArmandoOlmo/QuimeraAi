import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../contexts/EditorContext';
import ThemeToggle from './ui/ThemeToggle';
import LanguageSelector from './ui/LanguageSelector';
import { Menu, LayoutDashboard, Check, CloudUpload, Globe } from 'lucide-react';

interface SimpleEditorHeaderProps {
  onMenuClick?: () => void;
}

const SimpleEditorHeader: React.FC<SimpleEditorHeaderProps> = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { 
    setView, 
    activeProject, 
    renameActiveProject, 
    saveProject,
    isEditingTemplate, 
    exitTemplateEditor 
  } = useEditor();

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
      setView('dashboard');
    }
  };

  return (
    <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0" role="banner">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors lg:hidden"
            title={t('common.menu')}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        
        {/* Dashboard Button */}
        <button 
          title={t('editor.goToDashboard')} 
          className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors"
          onClick={handleGoToDashboard}
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
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

      <div className="flex items-center gap-2">
        {/* Theme & Language */}
        <ThemeToggle />
        <LanguageSelector />

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
        <button className="bg-primary hover:opacity-90 text-primary-foreground font-medium text-sm h-9 px-4 rounded-lg transition-all shadow-sm">
          {t('editor.publish')}
        </button>
      </div>
    </header>
  );
};

export default SimpleEditorHeader;

