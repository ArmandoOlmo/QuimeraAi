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
    { name: 'desktop', icon: <Monitor /> },
    { name: 'tablet', icon: <Tablet /> },
    { name: 'mobile', icon: <Smartphone /> },
  ];

  return (
    <header className="bg-editor-bg border-b border-editor-border h-[65px] flex-shrink-0 z-20">
      <div className="mx-auto px-4 sm:px-6 h-full flex justify-between items-center">
        <div className="flex items-center space-x-4">
            <button 
                title={t('editor.toggleSidebar')} 
                className="p-2 text-editor-text-secondary hover:text-editor-text-primary md:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                <Menu />
            </button>
            <div className="flex items-center space-x-2">
                <button 
                  title={t('editor.goToDashboard')} 
                  className="p-2 text-editor-text-secondary hover:text-editor-text-primary rounded-md hover:bg-editor-border transition-colors"
                  onClick={handleGoToDashboard}
                >
                    <LayoutDashboard />
                </button>
                <div className="w-px h-6 bg-editor-border hidden sm:block"></div>
                 {isEditingName ? (
                  <input
                    ref={inputRef}
                    value={projectName}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    className="bg-editor-panel-bg text-xl font-bold text-editor-text-primary rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-editor-accent"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-editor-border"
                    title={t('editor.renameProject')}
                  >
                    <Box width="28" height="28" className="text-editor-accent flex-shrink-0" />
                    <span className="text-xl font-bold text-editor-text-primary hidden sm:inline">{projectName}</span>
                  </button>
                )}
            </div>
        </div>

        <div className="hidden sm:flex items-center justify-center space-x-2 bg-editor-panel-bg p-1 rounded-lg">
            {deviceOptions.map(({ name, icon }) => (
                <button
                    key={name}
                    title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`)}
                    onClick={() => setPreviewDevice(name)}
                    className={`p-2 rounded-md transition-colors ${previewDevice === name ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'}`}
                >
                    {icon}
                </button>
            ))}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
           <LanguageSelector />
           <ThemeToggle />
           <button
                title={saveState === 'idle' ? t('editor.saveChanges') : t('editor.saved')}
                onClick={handleSaveClick}
                disabled={saveState === 'saved'}
                className="flex items-center p-2 rounded-md transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border disabled:text-green-500"
           >
                {saveState === 'idle' ? <CloudUpload /> : <Check />}
                <span className="hidden sm:inline ml-2 font-semibold">{saveState === 'idle' ? t('common.save') : t('editor.saved')}</span>
           </button>
           <button className="bg-editor-accent text-editor-bg font-bold py-2 px-3 sm:px-5 rounded-lg shadow-md hover:bg-editor-accent-hover transition-all duration-300 transform hover:scale-105">
             {t('editor.publish')}
           </button>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;