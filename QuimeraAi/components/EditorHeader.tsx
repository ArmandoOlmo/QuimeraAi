import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { PreviewDevice } from '../types';
// Replaced non-existent 'Cube' icon with 'Box'.
import { Menu, Monitor, Tablet, Smartphone, LayoutDashboard, Check, CloudUpload, Box } from 'lucide-react';

const EditorHeader: React.FC = () => {
  const { t } = useTranslation();
  const { isSidebarOpen, setIsSidebarOpen, previewDevice, setPreviewDevice, previewOrientation, setPreviewOrientation, setView } = useUI();
  const { activeProject, renameActiveProject, saveProject, publishProject, isEditingTemplate, exitTemplateEditor } = useProject();

  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(activeProject?.name || t('editor.untitledProject'));
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
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

  const orientationOptions = [
    { value: 'portrait', label: t('editor.portrait'), short: 'P' },
    { value: 'landscape', label: t('editor.landscape'), short: 'L' },
  ] as const;

  const orientationDisabled = previewDevice === 'desktop';

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

        {/* CENTER SECTION - Device & Orientation */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1">
            {deviceOptions.map(({ name, icon }) => (
              <button
                key={name}
                title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`)}
                onClick={() => setPreviewDevice(name)}
                className={`h-9 w-9 flex items-center justify-center transition-all ${previewDevice === name
                    ? 'text-editor-accent'
                    : 'text-editor-text-secondary hover:text-editor-text-primary'
                  }`}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {orientationOptions.map((option) => (
              <button
                key={option.value}
                title={`${option.label}${orientationDisabled ? ` (${t('editor.desktopOnlyLandscape')})` : ''}`}
                onClick={() => setPreviewOrientation(option.value)}
                disabled={orientationDisabled}
                className={`h-9 w-9 text-xs font-semibold transition-all ${previewOrientation === option.value
                    ? 'text-editor-accent'
                    : 'text-editor-text-secondary hover:text-editor-text-primary'
                  } ${orientationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-pressed={previewOrientation === option.value}
                aria-label={`${t('editor.preview')} ${option.label}`}
              >
                {option.short}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT SECTION - Actions */}
        <div className="flex items-center gap-1">
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

          {/* Publish Button */}
          <button 
            onClick={async () => {
              console.log('[EditorHeader] Publish button clicked');
              console.log('[EditorHeader] publishProject function:', typeof publishProject);
              console.log('[EditorHeader] activeProject:', activeProject?.id, activeProject?.name);
              
              if (!publishProject) {
                console.error('[EditorHeader] publishProject is not available!');
                return;
              }
              
              setPublishState('publishing');
              try {
                console.log('[EditorHeader] Calling publishProject...');
                const success = await publishProject();
                console.log('[EditorHeader] publishProject result:', success);
                setPublishState(success ? 'published' : 'error');
                setTimeout(() => setPublishState('idle'), 3000);
              } catch (error) {
                console.error('[EditorHeader] Error publishing:', error);
                setPublishState('error');
                setTimeout(() => setPublishState('idle'), 3000);
              }
            }}
            disabled={publishState === 'publishing'}
            className={`font-medium text-sm h-9 px-3 transition-colors flex items-center gap-1.5 ${
              publishState === 'published' 
                ? 'text-green-500' 
                : publishState === 'error'
                  ? 'text-red-500'
                  : 'text-editor-accent hover:text-editor-accent-hover'
            } ${publishState === 'publishing' ? 'opacity-50 cursor-wait' : ''}`}
          >
            {publishState === 'publishing' ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {t('editor.publishing', 'Publicando...')}
              </>
            ) : publishState === 'published' ? (
              <>
                <Check className="w-4 h-4" />
                {t('editor.published', '¡Publicado!')}
              </>
            ) : publishState === 'error' ? (
              t('editor.publishError', 'Error')
            ) : (
              t('editor.publish')
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;