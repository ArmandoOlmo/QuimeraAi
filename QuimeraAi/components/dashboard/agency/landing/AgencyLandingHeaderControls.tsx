import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, CloudUpload, Globe, Monitor, SlidersHorizontal, Smartphone } from 'lucide-react';
import { useUI } from '../../../../contexts/core/UIContext';
import { useProject } from '../../../../contexts/project';
import { PreviewDevice } from '../../../../types';

const DEVICE_SLOT_ID = 'agency-landing-header-device-controls';
const ACTIONS_SLOT_ID = 'agency-landing-header-actions';

const usePortalTarget = (id: string) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(id));
  }, [id]);

  return target;
};

const AgencyLandingDeviceControls: React.FC = () => {
  const { t } = useTranslation();
  const { previewDevice, setPreviewDevice } = useUI();
  const devices = [
    { name: 'desktop' as PreviewDevice, icon: Monitor, label: t('editor.desktop', 'Escritorio') },
    { name: 'mobile' as PreviewDevice, icon: Smartphone, label: t('editor.mobile', 'Móvil') },
  ];

  return (
    <div className="flex items-center gap-2 rounded-lg bg-q-surface-overlay/50 p-1">
      {devices.map(({ name, icon: Icon, label }) => (
        <button
          key={name}
          type="button"
          title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`, label)}
          onClick={() => setPreviewDevice(name)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            previewDevice === name
              ? 'bg-q-accent text-q-text-on-accent'
              : 'text-q-text-muted hover:bg-q-bg/50 hover:text-q-text'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

const AgencyLandingActionControls: React.FC = () => {
  const { t } = useTranslation();
  const { isSidebarOpen, setIsSidebarOpen } = useUI();
  const { saveProject, publishProject } = useProject();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const saveLabel = saveState === 'saving'
    ? t('common.saving', 'Guardando...')
    : saveState === 'saved'
      ? t('editor.saved', 'Guardado')
      : saveState === 'error'
        ? t('editor.publishError', 'Error')
        : t('common.save', 'Guardar');

  const handleSaveClick = async () => {
    setSaveState('saving');
    try {
      await saveProject();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.error('[AgencyLandingHeaderControls] Error saving agency landing:', error);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const handlePublishClick = async () => {
    if (!publishProject) {
      console.error('[AgencyLandingHeaderControls] publishProject not available');
      return;
    }

    setPublishState('publishing');
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Publish timed out after 30 seconds')), 30000)
      );
      const success = await Promise.race([publishProject(), timeoutPromise]);
      setPublishState(success ? 'published' : 'error');
      setTimeout(() => setPublishState('idle'), 3000);
    } catch (error) {
      console.error('[AgencyLandingHeaderControls] Error publishing agency landing:', error);
      setPublishState('error');
      setTimeout(() => setPublishState('idle'), 3000);
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors md:hidden ${
          isSidebarOpen ? 'text-q-accent' : 'text-q-text-muted hover:bg-q-surface-overlay/50 hover:text-q-text'
        }`}
        title={t('editor.toggleControls')}
        aria-label={t('editor.toggleControls')}
        aria-pressed={isSidebarOpen}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      <button
        type="button"
        title={saveState === 'idle' ? t('editor.saveChanges') : saveLabel}
        onClick={handleSaveClick}
        disabled={saveState === 'saving' || saveState === 'saved'}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          saveState === 'saved'
            ? 'bg-green-500/20 text-green-500'
            : saveState === 'error'
              ? 'bg-red-500/20 text-red-500'
              : 'text-q-text-muted hover:bg-q-surface-overlay/50 hover:text-q-text'
        } ${saveState === 'saving' ? 'cursor-wait opacity-70' : ''}`}
      >
        {saveState === 'saving' ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : saveState === 'saved' ? (
          <Check className="h-4 w-4" />
        ) : (
          <CloudUpload className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {saveLabel}
        </span>
      </button>

      <button
        type="button"
        onClick={handlePublishClick}
        disabled={publishState === 'publishing'}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          publishState === 'published'
            ? 'bg-green-500/20 text-green-500'
            : publishState === 'error'
              ? 'bg-red-500/20 text-red-500'
              : 'bg-q-accent text-q-text-on-accent hover:opacity-90'
        } ${publishState === 'publishing' ? 'cursor-wait opacity-70' : ''}`}
      >
        {publishState === 'publishing' ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="hidden sm:inline">{t('editor.publishing', 'Publicando...')}</span>
          </>
        ) : publishState === 'published' ? (
          <>
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">{t('editor.published', 'Publicado')}</span>
          </>
        ) : publishState === 'error' ? (
          <span>{t('editor.publishError', 'Error')}</span>
        ) : (
          <>
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t('editor.publish', 'Publicar')}</span>
          </>
        )}
      </button>
    </div>
  );
};

export const AgencyLandingHeaderControls: React.FC = () => {
  const deviceTarget = usePortalTarget(DEVICE_SLOT_ID);
  const actionsTarget = usePortalTarget(ACTIONS_SLOT_ID);

  return (
    <>
      {deviceTarget ? createPortal(<AgencyLandingDeviceControls />, deviceTarget) : null}
      {actionsTarget ? createPortal(<AgencyLandingActionControls />, actionsTarget) : null}
    </>
  );
};
