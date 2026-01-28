// SimpleEditorHeader - Updated with publish functionality and device preview controls
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';
import { PreviewDevice } from '../types';
import { LayoutDashboard, Check, CloudUpload, Globe, SlidersHorizontal, Menu, ArrowLeft, Monitor, Tablet, Smartphone } from 'lucide-react';

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
  const { navigate } = useRouter();

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
          className={`h-10 w-10 md:h-9 md:w-9 flex items-center justify-center hover:bg-secondary/80 rounded-xl md:rounded-full transition-colors touch-manipulation md:hidden ${isSidebarOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
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

      {/* CENTER SECTION - Device Preview Controls */}
      <div className="hidden md:flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
        {([
          { name: 'desktop' as PreviewDevice, icon: <Monitor className="w-4 h-4" /> },
          { name: 'tablet' as PreviewDevice, icon: <Tablet className="w-4 h-4" /> },
          { name: 'mobile' as PreviewDevice, icon: <Smartphone className="w-4 h-4" /> },
        ]).map(({ name, icon }) => (
          <button
            key={name}
            title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`)}
            onClick={() => setPreviewDevice(name)}
            className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${previewDevice === name
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Back Button - Go to projects/websites */}
        <button
          onClick={() => navigate(ROUTES.WEBSITES)}
          className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.back')}</span>
        </button>

        {/* Save Button */}
        {showSaveButton && (
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
                const success = await publishProject();
                setPublishState(success ? 'published' : 'error');
                setTimeout(() => setPublishState('idle'), 3000);
              } catch (error) {
                console.error('[SimpleEditorHeader] Error publishing:', error);
                setPublishState('error');
                setTimeout(() => setPublishState('idle'), 3000);
              }
            }}
            disabled={publishState === 'publishing'}
            className={`font-medium text-sm h-9 px-3 transition-colors flex items-center gap-1.5 ${publishState === 'published'
              ? 'text-green-500'
              : publishState === 'error'
                ? 'text-red-500'
                : 'text-primary hover:text-primary/80'
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
              t('editor.publish')
            )}
          </button>
        )}
      </div>
    </header>
  );
};

export default SimpleEditorHeader;

