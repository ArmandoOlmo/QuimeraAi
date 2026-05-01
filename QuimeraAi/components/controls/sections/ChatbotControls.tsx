/**
 * ChatbotControls.tsx
 * Section controls for the Chatbot component
 */
import React from 'react';
import ColorControl from '../../ui/ColorControl';
import TabbedControls from '../../ui/TabbedControls';
import {
  Input, TextArea, Select
} from '../../ui/EditorControlPrimitives';
import { ControlsDeps } from '../ControlsShared';
import { MessageSquare, Settings, Palette , Layers } from 'lucide-react';

export const renderChatbotControlsWithTabs = (deps: ControlsDeps) => {
  const { data, setNestedData, t } = deps;
  if (!data?.chatbot) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t("controls.glassmorphismTransparencia", "Glassmorphism Background")}
          checked={data?.chatbot?.glassEffect || false}
          onChange={(v) => setNestedData("chatbot.glassEffect", v)}
        />
      </div>

      {/* Content Settings */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MessageSquare size={14} />
          {t('controls.content', 'Contenido')}
        </label>
        
        <Input 
          label={t('controls.welcomeMessage', 'Mensaje de Bienvenida')} 
          value={data?.chatbot?.welcomeMessage} 
          onChange={(val) => setNestedData('chatbot.welcomeMessage', val)} 
        />
        
        <Input 
          label={t('controls.placeholderText', 'Texto de Placeholder')} 
          value={data?.chatbot?.placeholderText} 
          onChange={(val) => setNestedData('chatbot.placeholderText', val)} 
        />
        
        <TextArea 
          label={t('controls.knowledgeBase', 'Base de Conocimiento')} 
          value={data?.chatbot?.knowledgeBase} 
          onChange={(val) => setNestedData('chatbot.knowledgeBase', val)} 
          rows={4} 
        />
      </div>

      {/* Behavior Settings */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings size={14} />
          {t('controls.behavior', 'Comportamiento')}
        </label>
        
        <Select
          label={t('controls.position', 'Posición')}
          value={data?.chatbot?.position || 'bottom-right'}
          onChange={(val) => setNestedData('chatbot.position', val)}
          options={[
            { value: 'bottom-right', label: 'Inferior Derecha' },
            { value: 'bottom-left', label: 'Inferior Izquierda' },
            { value: 'top-right', label: 'Superior Derecha' },
            { value: 'top-left', label: 'Superior Izquierda' },
          ]}
          noMargin
        />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Palette size={14} />
          {t('controls.colors', 'Colores')}
        </label>
        <ColorControl 
          label={t('controls.primaryColor', 'Color Principal')} 
          value={data?.chatbot?.colors?.primary || '#4f46e5'} 
          onChange={(v) => setNestedData('chatbot.colors.primary', v)} 
        />
        <ColorControl 
          label={t('editor.controls.common.background', 'Fondo')} 
          value={data?.chatbot?.colors?.background || '#0f172a'} 
          onChange={(v) => setNestedData('chatbot.colors.background', v)} 
        />
        <ColorControl 
          label={t('controls.text', 'Texto')} 
          value={data?.chatbot?.colors?.text || '#ffffff'} 
          onChange={(v) => setNestedData('chatbot.colors.text', v)} 
        />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
