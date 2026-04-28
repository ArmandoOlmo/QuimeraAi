// SimpleEditorHeader - Updated with publish functionality and device preview controls
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';
import { PreviewDevice } from '../types';
import { LayoutDashboard, Check, CloudUpload, Globe, SlidersHorizontal, Menu, Monitor, Smartphone } from 'lucide-react';
import HeaderBackButton from './ui/HeaderBackButton';

interface SimpleEditorHeaderProps {
  onOpenMobileMenu?: () => void;
  showSaveButton?: boolean;
  showPublishButton?: boolean;
}

const SimpleEditorHeader: React.FC<SimpleEditorHeaderProps> = ({
  onOpenMobileMenu,
  showSaveButton = true,
  showPublishButton = true,
}) => {
  const { t } = useTranslation();
  const { isSidebarOpen, setIsSidebarOpen, previewDevice, setPreviewDevice } = useUI();
  const { activeProject, renameActiveProject, saveProject, publishProject, isEditingTemplate, exitTemplateEditor } = useProject();
  const { navigate, goBack } = useRouter();

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
    <header className="h-14 px-3 md:px-6 border-b border-q-border bg-q-bg flex items-center justify-between z-20 sticky top-0 relative" role="banner">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Mobile Menu Button - Opens DashboardSidebar */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="h-10 w-10 flex items-center justify-center text-q-text-muted hover:text-q-text transition-colors touch-manipulation lg:hidden"
            title={t('common.menu')}
            aria-label={t('common.menu')}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Dashboard Button - More prominent on mobile */}
        <button
          title={t('editor.goToDashboard')}
          className="h-10 w-10 md:h-9 md:w-9 flex items-center justify-center text-q-text-muted hover:text-q-text transition-colors touch-manipulation"
          onClick={handleGoToDashboard}
        >
          <LayoutDashboard className="w-5 h-5 md:w-4 md:h-4" />
        </button>

        {/* Mobile Controls Button - Editor Controls Panel */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`h-10 w-10 md:h-9 md:w-9 flex items-center justify-center transition-colors touch-manipulation md:hidden ${isSidebarOpen ? 'text-q-accent' : 'text-q-text-muted hover:text-q-text'
            }`}
          title={t('editor.toggleControls')}
          aria-label={t('editor.toggleControls')}
          aria-pressed={isSidebarOpen}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Project Name - Hidden on mobile (already shown in BrowserPreview) */}
        <div className="hidden md:flex items-center gap-2">
          <Globe className="text-q-accent" size={24} aria-hidden="true" />

          {/* Project Name */}
          {isEditingName ? (
            <input
              ref={inputRef}
              value={projectName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="bg-transparent text-xl font-bold text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent rounded px-2 py-1 min-w-[120px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xl font-bold text-q-text hover:text-q-accent transition-colors px-2 py-1 rounded hover:bg-q-surface-elevated"
              title={t('editor.renameProject')}
            >
              {projectName}
            </button>
          )}
        </div>
      </div>

      {/* CENTER SECTION - Device Preview Controls */}
      <div className="hidden md:flex items-center gap-2 bg-q-surface-overlay/50 rounded-lg p-1 absolute left-1/2 -translate-x-1/2">
        {([
          { name: 'desktop' as PreviewDevice, icon: <Monitor className="w-4 h-4" />, label: t('editor.desktop') },
          { name: 'mobile' as PreviewDevice, icon: <Smartphone className="w-4 h-4" />, label: t('editor.mobile') },
        ]).map(({ name, icon, label }) => (
          <button
            key={name}
            title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`)}
            onClick={() => setPreviewDevice(name)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${previewDevice === name
                ? 'bg-q-accent text-q-text-on-accent'
                : 'text-q-text-muted hover:text-q-text hover:bg-q-bg/50'
              }
            `}
          >
            {icon}
            <span className="capitalize">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Save Button */}
        {showSaveButton && (
          <button
            title={saveState === 'idle' ? t('editor.saveChanges') : t('editor.saved')}
            onClick={handleSaveClick}
            disabled={saveState === 'saved'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              saveState === 'saved'
                ? 'bg-green-500/20 text-green-500'
                : 'text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay/50'
            }`}
          >
            {saveState === 'idle' ? (
              <CloudUpload className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {saveState === 'idle' ? t('common.save') : t('editor.saved')}
            </span>
          </button>
        )}

        {/* Publish Button */}
        {showPublishButton && (
          <button
            onClick={async () => {
              if (!publishProject) {
                console.error('[SimpleEditorHeader] publishProject not available');
                return;
              }

              setPublishState('publishing');
              try {
                // Wrap in timeout to prevent hanging indefinitely on Firestore issues
                const timeoutPromise = new Promise<boolean>((_, reject) =>
                  setTimeout(() => reject(new Error('Publish timed out after 30 seconds')), 30000)
                );
                const success = await Promise.race([publishProject(), timeoutPromise]);
                setPublishState(success ? 'published' : 'error');
                setTimeout(() => setPublishState('idle'), 3000);
              } catch (error) {
                console.error('[SimpleEditorHeader] Error publishing:', error);
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
                  : 'bg-q-accent text-q-text-on-accent hover:opacity-90'
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
        )}

        <HeaderBackButton onClick={() => goBack()} />
      </div>
    </header>
  );
};

export default SimpleEditorHeader;
