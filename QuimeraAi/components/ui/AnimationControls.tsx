import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimationType } from '../../types';
import { Wand2 } from 'lucide-react';

interface AnimationControlsProps {
  animationType?: AnimationType;
  enableCardAnimation?: boolean;
  onChangeAnimationType: (type: AnimationType) => void;
  onToggleAnimation: (enabled: boolean) => void;
  label?: string;
}

const AnimationControls: React.FC<AnimationControlsProps> = ({
  animationType = 'fade-in-up',
  enableCardAnimation = true,
  onChangeAnimationType,
  onToggleAnimation,
  label: labelProp
}) => {
  const { t } = useTranslation();
  const label = labelProp || t('controls.cardAnimations');
  return (
    <div className="space-y-3 p-3 bg-editor-border/20 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 size={14} className="text-editor-accent" />
        <label className="text-xs font-bold text-editor-text-primary uppercase tracking-wider">
          {label}
        </label>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
          {t('controls.enableAnimations')}
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={enableCardAnimation}
          onClick={() => onToggleAnimation(!enableCardAnimation)}
          className={`${enableCardAnimation ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent/40 focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
        >
          <span
            aria-hidden="true"
            className={`${enableCardAnimation ? 'translate-x-[16px]' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>

      {enableCardAnimation && (
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
            {t('controls.animationType')}
          </label>
          <select
            value={animationType}
            onChange={(e) => onChangeAnimationType(e.target.value as AnimationType)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all"
          >
            <option value="none">{t('controls.animNone')}</option>
            <option value="fade-in">{t('controls.animFadeIn')}</option>
            <option value="fade-in-up">{t('controls.animFadeInUp')}</option>
            <option value="fade-in-down">{t('controls.animFadeInDown')}</option>
            <option value="slide-up">{t('controls.animSlideUp')}</option>
            <option value="slide-down">{t('controls.animSlideDown')}</option>
            <option value="scale-in">{t('controls.animScaleIn')}</option>
            <option value="bounce-in">{t('controls.animBounceIn')}</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default AnimationControls;





























