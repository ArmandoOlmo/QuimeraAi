import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { PreviewDevice } from '../types';
import { useRouter } from '../hooks/useRouter';
// Replaced non-existent 'Cube' icon with 'Box'.
import { Menu, Monitor, Tablet, Smartphone, LayoutDashboard, Check, CloudUpload, Box, Globe } from 'lucide-react';
import HeaderBackButton from './ui/HeaderBackButton';

const EditorHeader: React.FC = () => {
  const { t } = useTranslation();
  const { isSidebarOpen, setIsSidebarOpen, previewDevice, setPreviewDevice, previewOrientation, setPreviewOrientation, setView } = useUI();
  const { activeProject, renameActiveProject, saveProject, publishProject, isEditingTemplate, exitTemplateEditor } = useProject();
  const { goBack } = useRouter();

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

  const deviceOptions: { name: PreviewDevice; icon: React.ReactNode; label: string }[] = [
    { name: 'desktop', icon: <Monitor className="w-4 h-4" />, label: t('editor.desktop') },
    { name: 'tablet', icon: <Tablet className="w-4 h-4" />, label: t('editor.tablet') },
    { name: 'mobile', icon: <Smartphone className="w-4 h-4" />, label: t('editor.mobile') },
  ];

  const orientationOptions = [
    { value: 'portrait', label: t('editor.portrait'), short: 'P' },
    { value: 'landscape', label: t('editor.landscape'), short: 'L' },
  ] as const;

  const orientationDisabled = previewDevice === 'desktop';

  return (
    <header className="bg-editor-bg border-b border-editor-border h-14 flex-shrink-0 z-20">
      <div className="h-full flex items-center justify-between px-3 gap-3 relative">

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
          <div className="w-px h-6 bg-editor-border" />

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

        {/* CENTER SECTION - Device Toggle */}
        <div className="hidden md:flex items-center gap-2 bg-secondary/50 rounded-lg p-1 absolute left-1/2 -translate-x-1/2">
          {deviceOptions.map(({ name, icon, label }) => (
            <button
              key={name}
              title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`)}
              onClick={() => setPreviewDevice(name)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${previewDevice === name
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }
              `}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* RIGHT SECTION - Actions */}
        <div className="flex items-center gap-2">
          {/* Save Button */}
          <button
            title={saveState === 'idle' ? t('editor.saveChanges') : t('editor.saved')}
            onClick={handleSaveClick}
            disabled={saveState === 'saved'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              saveState === 'saved'
                ? 'bg-green-500/20 text-green-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
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
                // Wrap in timeout to prevent hanging indefinitely on Firestore issues
                const timeoutPromise = new Promise<boolean>((_, reject) =>
                  setTimeout(() => reject(new Error('Publish timed out after 30 seconds')), 30000)
                );
                const success = await Promise.race([publishProject(), timeoutPromise]);
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              publishState === 'published'
                ? 'bg-green-500/20 text-green-500'
                : publishState === 'error'
                  ? 'bg-red-500/20 text-red-500'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
            } ${publishState === 'publishing' ? 'opacity-50 cursor-wait' : ''}`}
          >
            {publishState === 'publishing' ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">{t('editor.publishing', 'Publicando...')}</span>
              </>
            ) : publishState === 'published' ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">{t('editor.published', '¡Publicado!')}</span>
              </>
            ) : publishState === 'error' ? (
              <span>{t('editor.publishError', 'Error')}</span>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{t('editor.publish')}</span>
              </>
            )}
          </button>
          <HeaderBackButton onClick={() => goBack()} className="border-editor-border/60 bg-editor-panel-bg/60 text-editor-text-secondary hover:bg-editor-border/40 hover:text-editor-text-primary focus:ring-editor-accent/25" />
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
