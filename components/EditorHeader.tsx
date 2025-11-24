import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../contexts/EditorContext';
import { PreviewDevice } from '../types';
import ThemeToggle from './ui/ThemeToggle';
import LanguageSelector from './ui/LanguageSelector';
// Replaced non-existent 'Cube' icon with 'Box'.
import { Menu, Monitor, Tablet, Smartphone, LayoutDashboard, Check, CloudUpload, Box } from 'lucide-react';

const EditorHeader: React.FC = () => {
  const { t } = useTranslation();
  const { 
    isSidebarOpen, setIsSidebarOpen, 
    previewDevice, setPreviewDevice, 
    setView, 
    activeProject, renameActiveProject, saveProject,
    isEditingTemplate, exitTemplateEditor 
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
      setProjectName(activeProject.name); // Revert if empty or unchanged
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

  const deviceOptions: { name: PreviewDevice; icon: React.ReactNode }[] = [
    { name: 'desktop', icon: <Monitor className="w-4 h-4" /> },
    { name: 'tablet', icon: <Tablet className="w-4 h-4" /> },
    { name: 'mobile', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-editor-bg border-b border-editor-border/50 h-14 flex-shrink-0 z-20">
      <div className="h-full flex items-center justify-between px-3 gap-3">
        
        {/* LEFT SECTION - Navigation & Project */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile Menu */}
          <button 
            title={t('editor.toggleSidebar')} 
            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full transition-colors md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Dashboard Button */}
          <button 
            title={t('editor.goToDashboard')} 
            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-md transition-colors"
            onClick={handleGoToDashboard}
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-editor-border/50" />

          {/* Project Name */}
          {isEditingName ? (
            <input
              ref={inputRef}
              value={projectName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="bg-transparent text-sm font-medium text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent rounded px-2 h-9 min-w-[120px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1.5 px-2 h-9 rounded hover:bg-editor-border/40 transition-colors group min-w-0"
              title={t('editor.renameProject')}
            >
              <span className="text-sm font-medium text-editor-text-primary truncate max-w-[200px]">
                {projectName}
              </span>
            </button>
          )}
        </div>

        {/* CENTER SECTION - Device Preview */}
        <div className="hidden md:flex items-center gap-1">
          {deviceOptions.map(({ name, icon }) => (
            <button
              key={name}
              title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`)}
              onClick={() => setPreviewDevice(name)}
              className={`h-9 w-9 flex items-center justify-center rounded-md transition-all ${
                previewDevice === name 
                  ? 'bg-editor-accent text-white' 
                  : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* RIGHT SECTION - Actions */}
        <div className="flex items-center gap-1">
          {/* Theme & Language - Subtle icons only */}
          <ThemeToggle />
          <LanguageSelector />

          {/* Save Button - Subtle */}
          <button
            title={saveState === 'idle' ? t('editor.saveChanges') : t('editor.saved')}
            onClick={handleSaveClick}
            disabled={saveState === 'saved'}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:text-green-500 disabled:hover:bg-transparent"
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

          {/* Publish Button - Primary CTA */}
          <button className="bg-editor-accent hover:bg-editor-accent-hover text-white font-medium text-sm h-9 px-4 rounded-md transition-colors shadow-sm">
            {t('editor.publish')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;