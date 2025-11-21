
import React, { useState, useRef } from 'react';
import { useEditor } from '../contexts/EditorContext';
import { PageSection, PricingTier } from '../types';
import ColorControl from './ui/ColorControl';
import FontManager from './ui/FontManager';
import ImagePicker from './ui/ImagePicker';
import { 
    Trash2, Plus, ChevronDown, ChevronRight, ArrowLeft, HelpCircle, 
    Layout, Image, List, Star, PlaySquare, Users, DollarSign, 
    Briefcase, MessageCircle, Mail, Send, Type, MousePointerClick,
    Settings, AlignJustify, MonitorPlay, Grid, GripVertical, Upload, Menu as MenuIcon, MessageSquare, FileText
} from 'lucide-react';
import AIFormControl from './ui/AIFormControl';
import AIContentAssistant from './ui/AIContentAssistant';

// --- Helper Components ---

const Input = ({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className={`mb-3 ${className || ''}`}>
    {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
    <input 
      {...props} 
      className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
    />
  </div>
);

const TextArea = ({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div className={`mb-3 ${className || ''}`}>
    {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
    <textarea 
      {...props} 
      className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent resize-y min-h-[80px] transition-all placeholder:text-editor-text-secondary/50"
    />
  </div>
);

const ToggleControl = ({ label, checked, onChange }: { label?: string, checked: boolean, onChange: (checked: boolean) => void }) => (
    <div className={`flex items-center ${label ? 'justify-between mb-3' : ''}`}>
        {label && <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>}
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const FontSizeSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {['sm', 'md', 'lg', 'xl'].map((size) => (
                <button
                    key={size}
                    onClick={() => onChange(size)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                >
                    {size.toUpperCase()}
                </button>
            ))}
        </div>
    </div>
);

interface AccordionItemProps {
    title: string;
    icon?: React.ElementType;
    isOpen: boolean;
    onDoubleClick: () => void;
    isVisible: boolean;
    onToggleVisibility: (val: boolean) => void;
    children: React.ReactNode;
    dragHandlers?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
}

const AccordionItem: React.FC<AccordionItemProps> = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    onDoubleClick, 
    isVisible, 
    onToggleVisibility, 
    children,
    dragHandlers
}) => (
    <div 
        className={`border-b border-editor-border bg-editor-bg transition-colors ${isOpen ? 'bg-editor-bg' : ''} ${dragHandlers?.draggable ? 'cursor-move' : ''}`}
        {...dragHandlers}
    >
        <div 
            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-editor-panel-bg/50 transition-colors select-none ${isOpen ? 'bg-editor-panel-bg/50' : ''}`}
            onDoubleClick={onDoubleClick}
        >
            <div className="flex items-center gap-3">
                {dragHandlers?.draggable && (
                     <div className="text-editor-text-secondary hover:text-editor-text-primary -ml-1 cursor-grab active:cursor-grabbing">
                         <GripVertical size={16} />
                     </div>
                )}
                {Icon && <Icon size={18} className={`text-editor-text-secondary ${isOpen ? 'text-editor-accent' : ''}`} />}
                <span className={`font-semibold text-sm ${isOpen ? 'text-editor-accent' : 'text-editor-text-primary'}`}>{title}</span>
            </div>
            <div className="flex items-center gap-3">
                <ToggleControl checked={isVisible} onChange={onToggleVisibility} />
                {isOpen ? <ChevronDown size={16} className="text-editor-text-secondary" /> : <ChevronRight size={16} className="text-editor-text-secondary" />}
            </div>
        </div>
        {isOpen && (
            <div className="p-4 bg-editor-panel-bg border-t border-editor-border animate-fade-in-up cursor-default">
                {children}
            </div>
        )}
    </div>
);

// --- Main Component ---

const Controls: React.FC = () => {
  const { 
      data, setData, 
      activeSection, onSectionSelect, 
      sectionVisibility, setSectionVisibility, 
      componentOrder, setComponentOrder,
      isSidebarOpen,
      uploadImageAndGetURL,
      menus,
      setView
  } = useEditor();
  
  const [aiAssistField, setAiAssistField] = useState<{path: string, value: string, context: string} | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);

  // Helper to update nested data safely with functional updates
  const setNestedData = (path: string, value: any) => {
    setData(prevData => {
        if (!prevData) return null;
        // Create a deep copy to avoid mutation and ensure React detects changes
        const newData = JSON.parse(JSON.stringify(prevData));
        
        const keys = path.split('.');
        let current: any = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!current[key]) current[key] = {};
          
          // CRITICAL FIX: Prevent traversing primitive values to avoid "Cannot create property..." error
          if (typeof current[key] !== 'object') {
              console.warn(`Controls: Cannot traverse path '${path}' at '${key}': value is primitive.`);
              return prevData; // Return previous state to abort invalid update
          }
          
          current = current[key];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
    });
  };

  const handleAiApply = (text: string) => {
    if (aiAssistField) {
        setNestedData(aiAssistField.path, text);
        setAiAssistField(null);
    }
  };

  const toggleVisibility = (section: PageSection | 'header') => {
      if (section === 'header') return; // Header usually always visible or handled differently
      setSectionVisibility(prev => ({
          ...prev,
          [section]: !prev[section as PageSection]
      }));
  };

  const toggleSection = (section: PageSection | 'header') => {
      if (activeSection === section) {
          (onSectionSelect as any)(null); // Close if active
      } else {
          onSectionSelect(section as any);
      }
  };
  
  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Use index as identifier
      e.dataTransfer.setData("text/plain", index.toString()); 
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;

      const sortableSections = componentOrder.filter(k => k !== 'footer');
      const newOrder = [...sortableSections];
      const [movedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, movedItem);

      // Always keep footer at the end if it exists in current setup
      setComponentOrder([...newOrder, 'footer']);
      setDraggedIndex(null);
  };
  
  const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingKnowledge(true);
      try {
          // Read text from file (Basic txt/md support for demo)
          const text = await file.text();
          
          // Append to existing knowledge base
          const currentKB = data?.chatbot?.knowledgeBase || "";
          const newKB = currentKB + "\n\n" + `--- SOURCE: ${file.name} ---\n` + text;
          
          setNestedData('chatbot.knowledgeBase', newKB);
          alert(`Successfully trained bot with content from ${file.name}`);
      } catch (error) {
          console.error("Failed to read file", error);
          alert("Failed to read file. Please upload a text-based file.");
      } finally {
          setIsUploadingKnowledge(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // --- Section Renderers ---

  const renderHeaderControls = () => {
      if (!data?.header) return null;
      
      const activeMenuId = data.header.menuId || '';

      return (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Layout</label>
                       <select 
                          value={data.header.layout} 
                          onChange={(e) => setNestedData('header.layout', e.target.value)}
                          className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
                       >
                           <option value="classic">Classic (Left)</option>
                           <option value="minimal">Minimal</option>
                           <option value="center">Center</option>
                           <option value="stack">Stack</option>
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Style</label>
                       <select 
                          value={data.header.style} 
                          onChange={(e) => setNestedData('header.style', e.target.value)}
                          className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
                       >
                           <option value="sticky-solid">Solid</option>
                           <option value="sticky-transparent">Transparent</option>
                           <option value="floating">Floating</option>
                       </select>
                   </div>
              </div>

              <hr className="border-editor-border/50" />

              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
                  <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
                      {['text', 'image', 'both'].map(type => (
                          <button 
                              key={type}
                              onClick={() => setNestedData('header.logoType', type)}
                              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${data.header.logoType === type ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
                          >
                              {type}
                          </button>
                      ))}
                  </div>

                  {(data.header.logoType === 'text' || data.header.logoType === 'both') && (
                      <Input label="Logo Text" value={data.header.logoText} onChange={(e) => setNestedData('header.logoText', e.target.value)} />
                  )}
                  
                  {(data.header.logoType === 'image' || data.header.logoType === 'both') && (
                      <div className="space-y-3 mt-3">
                          <ImagePicker 
                            label="Logo Image" 
                            value={data.header.logoImageUrl} 
                            onChange={(url) => {
                                setNestedData('header.logoImageUrl', url);
                                // If uploading/selecting, ensure image mode is active if previously text only
                                if (data.header.logoType === 'text') {
                                    setNestedData('header.logoType', 'image');
                                }
                            }}
                          />
                          <div>
                              <div className="flex justify-between items-center mb-1">
                                  <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Logo Width</label>
                                  <span className="text-xs text-editor-text-primary">{data.header.logoWidth}px</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="40" 
                                  max="300" 
                                  step="5"
                                  value={data.header.logoWidth} 
                                  onChange={(e) => setNestedData('header.logoWidth', parseInt(e.target.value))}
                                  className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                              />
                          </div>
                      </div>
                  )}
              </div>

              <hr className="border-editor-border/50" />

              <div className="grid grid-cols-2 gap-4">
                  <ToggleControl label="Sticky" checked={data.header.isSticky} onChange={(v) => setNestedData('header.isSticky', v)} />
                  <ToggleControl label="Glass Effect" checked={data.header.glassEffect} onChange={(v) => setNestedData('header.glassEffect', v)} />
              </div>
              
              <hr className="border-editor-border/50" />
              
              {/* New Login Area Controls */}
              <div className="space-y-3">
                  <ToggleControl label="Show Login Button" checked={data.header.showLogin !== false} onChange={(v) => setNestedData('header.showLogin', v)} />
                  
                  {data.header.showLogin !== false && (
                      <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                          <Input label="Text" value={data.header.loginText || 'Login'} onChange={(e) => setNestedData('header.loginText', e.target.value)} className="mb-0" />
                          <Input label="URL" value={data.header.loginUrl || '#'} onChange={(e) => setNestedData('header.loginUrl', e.target.value)} className="mb-0" />
                      </div>
                  )}
              </div>

              <hr className="border-editor-border/50" />
              
              {/* Navigation Menu Selector */}
              <div className="space-y-2">
                   <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Navigation Source</label>
                   <div className="flex gap-2 mb-3">
                        <select
                            value={activeMenuId}
                            onChange={(e) => {
                                const val = e.target.value;
                                setNestedData('header.menuId', val === '' ? undefined : val);
                            }}
                            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary focus:ring-1 focus:ring-editor-accent focus:outline-none"
                        >
                            <option value="">Manual (Custom Links)</option>
                            {menus.map(menu => (
                                <option key={menu.id} value={menu.id}>{menu.title}</option>
                            ))}
                        </select>
                         <button 
                            onClick={() => setView('navigation')}
                            className="p-2 bg-editor-bg border border-editor-border rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg"
                            title="Manage Menus"
                         >
                             <Settings size={16} />
                         </button>
                   </div>
                  
                  {activeMenuId ? (
                       <div className="p-3 bg-editor-accent/10 border border-editor-accent/20 rounded text-xs text-editor-text-primary mb-2">
                           Links are currently being pulled from the <strong>{menus.find(m => m.id === activeMenuId)?.title || 'selected'}</strong> menu.
                       </div>
                  ) : (
                      <>
                          <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider mb-2">Custom Links</h4>
                          {(data.header.links || []).map((link, i) => (
                              <div key={i} className="flex gap-2 mb-2">
                                  <input className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.text} onChange={(e) => setNestedData(`header.links.${i}.text`, e.target.value)} />
                                  <input className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.href} onChange={(e) => setNestedData(`header.links.${i}.href`, e.target.value)} />
                                   <button 
                                      onClick={() => {
                                          const newLinks = data.header.links.filter((_, idx) => idx !== i);
                                          setNestedData('header.links', newLinks);
                                      }}
                                      className="text-editor-text-secondary hover:text-red-400"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          ))}
                          <button 
                              onClick={() => setNestedData('header.links', [...(data.header.links || []), { text: 'New Link', href: '#' }])}
                              className="text-xs text-editor-accent hover:underline flex items-center mt-1"
                          >
                              <Plus size={12} className="mr-1"/> Add Link
                          </button>
                      </>
                  )}
              </div>

              <hr className="border-editor-border/50" />
              <ColorControl label="Background" value={data.header.colors.background} onChange={(v) => setNestedData('header.colors.background', v)} />
              <ColorControl label="Text" value={data.header.colors.text} onChange={(v) => setNestedData('header.colors.text', v)} />
          </div>
      )
  }

  const renderHeroControls = () => {
      if (!data?.hero) return null;
      return (
          <div className="space-y-4">
              <AIFormControl label="Headline" onAssistClick={() => setAiAssistField({ path: 'hero.headline', value: data.hero.headline, context: 'Hero Headline' })}>
                  <TextArea value={data.hero.headline} onChange={(e) => setNestedData('hero.headline', e.target.value)} rows={2} />
              </AIFormControl>
              <FontSizeSelector label="Headline Size" value={data.hero.headlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.headlineFontSize', v)} />
              
              <AIFormControl label="Subheadline" onAssistClick={() => setAiAssistField({ path: 'hero.subheadline', value: data.hero.subheadline, context: 'Hero Subheadline' })}>
                  <TextArea value={data.hero.subheadline} onChange={(e) => setNestedData('hero.subheadline', e.target.value)} rows={3} />
              </AIFormControl>
              <FontSizeSelector label="Subheadline Size" value={data.hero.subheadlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.subheadlineFontSize', v)} />
              
              <ImagePicker label="Hero Image" value={data.hero.imageUrl} onChange={(url) => setNestedData('hero.imageUrl', url)} />
              
              <div className="grid grid-cols-2 gap-4">
                  <Input label="Primary CTA" value={data.hero.primaryCta} onChange={(e) => setNestedData('hero.primaryCta', e.target.value)} />
                  <Input label="Secondary CTA" value={data.hero.secondaryCta} onChange={(e) => setNestedData('hero.secondaryCta', e.target.value)} />
              </div>
              <hr className="border-editor-border/50" />
              <ColorControl label="Background" value={data.hero.colors.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
              <ColorControl label="Title" value={data.hero.colors.heading || '#ffffff'} onChange={(v) => setNestedData('hero.colors.heading', v)} />
              <ColorControl label="Text" value={data.hero.colors.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
              
              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-2">Primary Button</h5>
              <ColorControl label="Background" value={data.hero.colors.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
              <ColorControl label="Text" value={data.hero.colors.buttonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />

              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-2">Secondary Button</h5>
              <ColorControl label="Background" value={data.hero.colors.secondaryButtonBackground || '#334155'} onChange={(v) => setNestedData('hero.colors.secondaryButtonBackground', v)} />
              <ColorControl label="Text" value={data.hero.colors.secondaryButtonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.secondaryButtonText', v)} />
          </div>
      );
  };

  const renderListSectionControls = (sectionKey: string, itemLabel: string, fields: { key: string, label: string, type: 'input' | 'textarea' | 'select' | 'image', options?: string[] }[]) => {
       if (!data) return null;
       const sectionData = (data as any)[sectionKey];
       if (!sectionData) return null;

       return (
          <div className="space-y-4">
              <Input label="Title" value={sectionData.title} onChange={(e) => setNestedData(`${sectionKey}.title`, e.target.value)} />
              <FontSizeSelector label="Title Size" value={sectionData.titleFontSize || 'md'} onChange={(v) => setNestedData(`${sectionKey}.titleFontSize`, v)} />
              
              {sectionData.description !== undefined && (
                  <>
                      <TextArea label="Description" value={sectionData.description} onChange={(e) => setNestedData(`${sectionKey}.description`, e.target.value)} rows={2} />
                      <FontSizeSelector label="Description Size" value={sectionData.descriptionFontSize || 'md'} onChange={(v) => setNestedData(`${sectionKey}.descriptionFontSize`, v)} />
                  </>
              )}
              
              {/* Specific Controls for some sections */}
              {sectionKey === 'howItWorks' && (
                   <div>
                       <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Steps Count</label>
                       <select 
                            value={sectionData.steps} 
                            onChange={(e) => setNestedData(`${sectionKey}.steps`, parseInt(e.target.value))}
                            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
                       >
                           <option value={3}>3 Steps</option>
                           <option value={4}>4 Steps</option>
                       </select>
                   </div>
              )}

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider mb-2">{itemLabel}s</h4>
              {(sectionData.items || []).map((item: any, index: number) => (
                  <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-editor-text-secondary">{itemLabel} #{index + 1}</span>
                          <button 
                              onClick={() => {
                                  const newItems = (sectionData.items || []).filter((_: any, i: number) => i !== index);
                                  setNestedData(`${sectionKey}.items`, newItems);
                              }}
                              className="text-editor-text-secondary hover:text-red-400 transition-colors"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>
                      {fields.map(field => (
                          <div key={field.key} className="mb-2 last:mb-0">
                             {field.type === 'textarea' ? (
                                 <textarea 
                                    placeholder={field.label} 
                                    value={item[field.key]} 
                                    onChange={(e) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, e.target.value)} 
                                    rows={2} 
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                 />
                             ) : field.type === 'select' ? (
                                 <select
                                    value={item[field.key]}
                                    onChange={(e) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, e.target.value)}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                 >
                                     {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                 </select>
                             ) : field.type === 'image' ? (
                                <ImagePicker 
                                    label={field.label}
                                    value={item[field.key]}
                                    onChange={(url) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, url)}
                                />
                             ) : (
                                 <input 
                                    placeholder={field.label} 
                                    value={item[field.key]} 
                                    onChange={(e) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, e.target.value)} 
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                 />
                             )}
                          </div>
                      ))}
                  </div>
              ))}
               <button 
                  onClick={() => {
                      const newItem = fields.reduce((acc, field) => ({...acc, [field.key]: ''}), {});
                      setNestedData(`${sectionKey}.items`, [...(sectionData.items || []), newItem]);
                  }}
                  className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                  <Plus size={14} /> Add {itemLabel}
              </button>
              
              <hr className="border-editor-border/50" />
              {sectionData.colors?.background && <ColorControl label="Background" value={sectionData.colors.background} onChange={(v) => setNestedData(`${sectionKey}.colors.background`, v)} />}
              {sectionData.colors?.heading && <ColorControl label="Title" value={sectionData.colors.heading} onChange={(v) => setNestedData(`${sectionKey}.colors.heading`, v)} />}
              {sectionData.colors?.text && <ColorControl label="Text" value={sectionData.colors.text} onChange={(v) => setNestedData(`${sectionKey}.colors.text`, v)} />}
          </div>
       )
  }

  const renderChatbotControls = () => {
      if (!data?.chatbot) return null;
      return (
          <div className="space-y-4">
              <Input label="Welcome Message" value={data.chatbot.welcomeMessage} onChange={(e) => setNestedData('chatbot.welcomeMessage', e.target.value)} />
              <Input label="Placeholder Text" value={data.chatbot.placeholderText} onChange={(e) => setNestedData('chatbot.placeholderText', e.target.value)} />
              
              <div className="mb-4">
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Position</label>
                  <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                      <button onClick={() => setNestedData('chatbot.position', 'bottom-left')} className={`flex-1 py-1 text-xs font-medium rounded-sm ${data.chatbot.position === 'bottom-left' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}>Left</button>
                      <button onClick={() => setNestedData('chatbot.position', 'bottom-right')} className={`flex-1 py-1 text-xs font-medium rounded-sm ${data.chatbot.position === 'bottom-right' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}>Right</button>
                  </div>
              </div>

              <hr className="border-editor-border/50" />
              
              <div className="space-y-2">
                  <h4 className="font-bold text-editor-text-primary text-sm flex items-center"><FileText size={14} className="mr-2 text-editor-accent"/> Knowledge Base</h4>
                  <p className="text-xs text-editor-text-secondary">
                      Upload documents (TXT, MD) or paste text below to train your chatbot. The more info you provide, the smarter it gets.
                  </p>
                  
                  <div className="relative">
                        <input 
                            type="file" 
                            accept=".txt,.md,.json,.csv" 
                            onChange={handleKnowledgeUpload} 
                            className="hidden" 
                            ref={fileInputRef}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingKnowledge}
                            className="w-full flex items-center justify-center py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent transition-colors text-xs font-bold mb-2 disabled:opacity-50"
                        >
                            {isUploadingKnowledge ? 'Training...' : 'Upload Training File'} <Upload size={12} className="ml-2"/>
                        </button>
                  </div>

                  <TextArea 
                    label="Raw Context" 
                    value={data.chatbot.knowledgeBase} 
                    onChange={(e) => setNestedData('chatbot.knowledgeBase', e.target.value)} 
                    rows={6}
                    placeholder="Paste business info, policies, or FAQs here..."
                  />
              </div>

              <hr className="border-editor-border/50" />
              <ColorControl label="Primary Color" value={data.chatbot.colors.primary} onChange={(v) => setNestedData('chatbot.colors.primary', v)} />
              <ColorControl label="Background" value={data.chatbot.colors.background} onChange={(v) => setNestedData('chatbot.colors.background', v)} />
              <ColorControl label="Text" value={data.chatbot.colors.text} onChange={(v) => setNestedData('chatbot.colors.text', v)} />
          </div>
      );
  };

  const renderPricingControls = () => {
      if (!data?.pricing) return null;
      return (
        <div className="space-y-4">
            <Input label="Title" value={data.pricing.title} onChange={(e) => setNestedData('pricing.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={data.pricing.titleFontSize || 'md'} onChange={(v) => setNestedData('pricing.titleFontSize', v)} />

            <TextArea label="Description" value={data.pricing.description} onChange={(e) => setNestedData('pricing.description', e.target.value)} rows={2} />
            <FontSizeSelector label="Description Size" value={data.pricing.descriptionFontSize || 'md'} onChange={(v) => setNestedData('pricing.descriptionFontSize', v)} />
            
            <hr className="border-editor-border/50" />
            <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider mb-2">Tiers</h4>
            {(data.pricing.tiers || []).map((tier, index) => (
                 <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
                     <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-editor-text-secondary">Tier #{index + 1}</span>
                          <button onClick={() => {
                              const newTiers = data.pricing.tiers.filter((_, i) => i !== index);
                              setNestedData('pricing.tiers', newTiers);
                          }} className="text-editor-text-secondary hover:text-red-400"><Trash2 size={14} /></button>
                     </div>
                     <div className="grid grid-cols-2 gap-2 mb-2">
                        <Input placeholder="Name" value={tier.name} onChange={(e) => setNestedData(`pricing.tiers.${index}.name`, e.target.value)} className="mb-0" />
                        <Input placeholder="Price" value={tier.price} onChange={(e) => setNestedData(`pricing.tiers.${index}.price`, e.target.value)} className="mb-0" />
                     </div>
                     <Input placeholder="Frequency (e.g. /mo)" value={tier.frequency} onChange={(e) => setNestedData(`pricing.tiers.${index}.frequency`, e.target.value)} className="mb-2" />
                     <div className="mb-2">
                        <label className="block text-[10px] font-bold text-editor-text-secondary mb-1">FEATURES (One per line)</label>
                        <textarea 
                            value={tier.features.join('\n')} 
                            onChange={(e) => setNestedData(`pricing.tiers.${index}.features`, e.target.value.split('\n'))}
                            rows={4}
                            className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                        />
                     </div>
                     <ToggleControl label="Featured Plan" checked={tier.featured} onChange={(v) => setNestedData(`pricing.tiers.${index}.featured`, v)} />
                 </div>
            ))}
            <button onClick={() => setNestedData('pricing.tiers', [...data.pricing.tiers, { name: 'New', price: '$0', frequency: '', features: [], buttonText: 'Select' }])} className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Tier</button>
            <hr className="border-editor-border/50" />
            <ColorControl label="Background" value={data.pricing.colors.background} onChange={(v) => setNestedData('pricing.colors.background', v)} />
            <ColorControl label="Title" value={data.pricing.colors.heading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.heading', v)} />
            <ColorControl label="Text" value={data.pricing.colors.text} onChange={(v) => setNestedData('pricing.colors.text', v)} />
            <ColorControl label="Button Background" value={data.pricing.colors.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.buttonBackground', v)} />
            <ColorControl label="Button Text" value={data.pricing.colors.buttonText || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.buttonText', v)} />
        </div>
      );
  }

  const renderVideoControls = () => {
      if (!data?.video) return null;
      return (
          <div className="space-y-4">
            <Input label="Title" value={data.video.title} onChange={(e) => setNestedData('video.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={data.video.titleFontSize || 'md'} onChange={(v) => setNestedData('video.titleFontSize', v)} />
            
            <TextArea label="Description" value={data.video.description} onChange={(e) => setNestedData('video.description', e.target.value)} rows={2} />
            <FontSizeSelector label="Description Size" value={data.video.descriptionFontSize || 'md'} onChange={(v) => setNestedData('video.descriptionFontSize', v)} />
            
            <div>
                 <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Source</label>
                 <select 
                    value={data.video.source} 
                    onChange={(e) => setNestedData('video.source', e.target.value)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                >
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="upload">Direct URL</option>
                </select>
            </div>
            {data.video.source === 'upload' ? (
                <Input label="Video URL" value={data.video.videoUrl} onChange={(e) => setNestedData('video.videoUrl', e.target.value)} />
            ) : (
                <Input label="Video ID" value={data.video.videoId} onChange={(e) => setNestedData('video.videoId', e.target.value)} />
            )}
            <div className="space-y-2">
                <ToggleControl label="Autoplay (Muted)" checked={data.video.autoplay} onChange={(v) => setNestedData('video.autoplay', v)} />
                <ToggleControl label="Loop" checked={data.video.loop} onChange={(v) => setNestedData('video.loop', v)} />
                <ToggleControl label="Show Controls" checked={data.video.showControls} onChange={(v) => setNestedData('video.showControls', v)} />
            </div>
            <hr className="border-editor-border/50" />
            <ColorControl label="Background" value={data.video.colors.background} onChange={(v) => setNestedData('video.colors.background', v)} />
            <ColorControl label="Title" value={data.video.colors.heading || '#ffffff'} onChange={(v) => setNestedData('video.colors.heading', v)} />
            <ColorControl label="Text" value={data.video.colors.text} onChange={(v) => setNestedData('video.colors.text', v)} />
        </div>
      )
  }

  const renderFooterControls = () => {
        if (!data?.footer) return null;

         return (
            <div className="space-y-4">
                <Input label="Title" value={data.footer.title} onChange={(e) => setNestedData('footer.title', e.target.value)} />
                <FontSizeSelector label="Title Size" value={data.footer.titleFontSize || 'sm'} onChange={(v) => setNestedData('footer.titleFontSize', v)} />
                
                <TextArea label="Description" value={data.footer.description} onChange={(e) => setNestedData('footer.description', e.target.value)} rows={2} />
                <FontSizeSelector label="Description Size" value={data.footer.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('footer.descriptionFontSize', v)} />
                
                <Input label="Copyright" value={data.footer.copyrightText} onChange={(e) => setNestedData('footer.copyrightText', e.target.value)} />
                <hr className="border-editor-border/50" />
                <div className="space-y-4">
                    <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider">Link Columns</h4>
                    {(data.footer.linkColumns || []).map((col, colIndex) => (
                        <div key={colIndex} className="bg-editor-bg p-3 rounded border border-editor-border space-y-2">
                             <div className="flex justify-between items-center mb-2">
                                <input placeholder="Column Title" value={col.title} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.title`, e.target.value)} className="bg-transparent border-b border-editor-border focus:border-editor-accent w-full text-sm font-bold text-editor-text-primary px-1" />
                                <button onClick={() => {
                                        const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                                        setNestedData('footer.linkColumns', newCols);
                                }} className="text-red-400 hover:text-red-500 ml-1"><Trash2 size={14}/></button>
                             </div>
                             
                             {/* Menu Selector per Column */}
                             <select
                                value={col.menuId || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNestedData(`footer.linkColumns.${colIndex}.menuId`, val === '' ? undefined : val);
                                }}
                                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary mb-2"
                             >
                                 <option value="">Manual Links</option>
                                 {menus.map(menu => (
                                     <option key={menu.id} value={menu.id}>{menu.title}</option>
                                 ))}
                             </select>
                             
                             {/* Conditional Link List */}
                             {col.menuId ? (
                                 <p className="text-[10px] text-editor-text-secondary italic">Using links from menu: {menus.find(m => m.id === col.menuId)?.title}</p>
                             ) : (
                                 <>
                                     {(col.links || []).map((link, linkIndex) => (
                                         <div key={linkIndex} className="flex gap-2 items-center mb-1">
                                             <input placeholder="Text" value={link.text} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary" />
                                             <input placeholder="Href" value={link.href} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary" />
                                              <button onClick={() => {
                                                 const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                                                 setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                                             }} className="text-editor-text-secondary hover:text-red-400"><Trash2 size={12}/></button>
                                         </div>
                                     ))}
                                     <button onClick={() => {
                                          const newLinks = [...(col.links || []), { text: 'New Link', href: '#' }];
                                          setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                                     }} className="text-xs text-editor-accent hover:underline mt-1">+ Add Link</button>
                                 </>
                             )}
                        </div>
                    ))}
                    <button onClick={() => setNestedData('footer.linkColumns', [...(data.footer.linkColumns || []), { title: 'New Column', links: [] }])} className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Column</button>
                </div>
                 <div className="space-y-4">
                     <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider">Social Links</h4>
                     {(data.footer.socialLinks || []).map((link, index) => (
                         <div key={index} className="flex items-center gap-2 mb-2">
                            <span className="text-xs uppercase w-20 text-editor-text-secondary font-mono flex-shrink-0">{link.platform}</span>
                            <Input value={link.href} onChange={(e) => setNestedData(`footer.socialLinks.${index}.href`, e.target.value)} className="mb-0 flex-1" />
                         </div>
                     ))}
                 </div>
                 <hr className="border-editor-border/50" />
                 <div className="space-y-2">
                    <ColorControl label="Background" value={data.footer.colors.background} onChange={(v) => setNestedData('footer.colors.background', v)} />
                    <ColorControl label="Title" value={data.footer.colors.heading || '#ffffff'} onChange={(v) => setNestedData('footer.colors.heading', v)} />
                    <ColorControl label="Text" value={data.footer.colors.text} onChange={(v) => setNestedData('footer.colors.text', v)} />
                 </div>
            </div>
        );
  }
  
  // Map section IDs to Icons and Renderers
  const sectionConfig: Record<PageSection, { label: string, icon: React.ElementType, renderer: () => React.ReactNode }> = {
      hero: { label: 'Hero Section', icon: Image, renderer: renderHeroControls },
      features: { label: 'Features', icon: List, renderer: () => renderListSectionControls('features', 'Feature', [{key: 'title', label: 'Title', type: 'input'}, {key: 'description', label: 'Description', type: 'textarea'}, {key: 'imageUrl', label: 'Image', type: 'image'}]) },
      testimonials: { label: 'Testimonials', icon: Star, renderer: () => renderListSectionControls('testimonials', 'Testimonial', [{key: 'quote', label: 'Quote', type: 'textarea'}, {key: 'name', label: 'Name', type: 'input'}, {key: 'title', label: 'Role', type: 'input'}, {key: 'avatar', label: 'Avatar', type: 'image'}]) },
      services: { label: 'Services', icon: Layout, renderer: () => renderListSectionControls('services', 'Service', [{key: 'title', label: 'Title', type: 'input'}, {key: 'description', label: 'Description', type: 'textarea'}, {key: 'icon', label: 'Icon', type: 'select', options: ['code', 'brush', 'megaphone', 'chart', 'scissors', 'camera']}]) },
      team: { label: 'Team', icon: Users, renderer: () => renderListSectionControls('team', 'Member', [{key: 'name', label: 'Name', type: 'input'}, {key: 'role', label: 'Role', type: 'input'}, {key: 'imageUrl', label: 'Photo', type: 'image'}]) },
      pricing: { label: 'Pricing', icon: DollarSign, renderer: renderPricingControls },
      faq: { label: 'FAQ', icon: HelpCircle, renderer: () => renderListSectionControls('faq', 'Question', [{ key: 'question', label: 'Question', type: 'input' }, { key: 'answer', label: 'Answer', type: 'textarea' }]) },
      portfolio: { label: 'Portfolio', icon: Briefcase, renderer: () => renderListSectionControls('portfolio', 'Project', [{key: 'title', label: 'Title', type: 'input'}, {key: 'description', label: 'Description', type: 'textarea'}, {key: 'imageUrl', label: 'Image', type: 'image'}]) },
      leads: { label: 'Leads Form', icon: Mail, renderer: () => (
          <div className="space-y-4">
             <Input label="Title" value={data?.leads.title} onChange={(e) => setNestedData('leads.title', e.target.value)} />
             <FontSizeSelector label="Title Size" value={data?.leads.titleFontSize || 'md'} onChange={(v) => setNestedData('leads.titleFontSize', v)} />
             
             <TextArea label="Description" value={data?.leads.description} onChange={(e) => setNestedData('leads.description', e.target.value)} rows={2} />
             <FontSizeSelector label="Description Size" value={data?.leads.descriptionFontSize || 'md'} onChange={(v) => setNestedData('leads.descriptionFontSize', v)} />
             
             <Input label="Button Text" value={data?.leads.buttonText} onChange={(e) => setNestedData('leads.buttonText', e.target.value)} />
             <hr className="border-editor-border/50" />
             <ColorControl label="Background" value={data?.leads.colors.background || '#000000'} onChange={(v) => setNestedData('leads.colors.background', v)} />
             <ColorControl label="Title" value={data?.leads.colors.heading || '#ffffff'} onChange={(v) => setNestedData('leads.colors.heading', v)} />
             <ColorControl label="Button Background" value={data?.leads.colors.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('leads.colors.buttonBackground', v)} />
             <ColorControl label="Button Text" value={data?.leads.colors.buttonText || '#ffffff'} onChange={(v) => setNestedData('leads.colors.buttonText', v)} />
          </div>
      ) },
      newsletter: { label: 'Newsletter', icon: Send, renderer: () => (
         <div className="space-y-4">
            <Input label="Title" value={data?.newsletter.title} onChange={(e) => setNestedData('newsletter.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={data?.newsletter.titleFontSize || 'md'} onChange={(v) => setNestedData('newsletter.titleFontSize', v)} />

            <TextArea label="Description" value={data?.newsletter.description} onChange={(e) => setNestedData('newsletter.description', e.target.value)} rows={2} />
            <FontSizeSelector label="Description Size" value={data?.newsletter.descriptionFontSize || 'md'} onChange={(v) => setNestedData('newsletter.descriptionFontSize', v)} />
            
            <Input label="Button Text" value={data?.newsletter.buttonText} onChange={(e) => setNestedData('newsletter.buttonText', e.target.value)} />
            <hr className="border-editor-border/50" />
            <ColorControl label="Background" value={data?.newsletter.colors.background || '#000000'} onChange={(v) => setNestedData('newsletter.colors.background', v)} />
            <ColorControl label="Title" value={data?.newsletter.colors.heading || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.heading', v)} />
            <ColorControl label="Button Background" value={data?.newsletter.colors.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('newsletter.colors.buttonBackground', v)} />
            <ColorControl label="Button Text" value={data?.newsletter.colors.buttonText || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.buttonText', v)} />
        </div>
      ) },
      cta: { label: 'Call to Action', icon: MessageCircle, renderer: () => (
          <div className="space-y-4">
             <Input label="Title" value={data?.cta.title} onChange={(e) => setNestedData('cta.title', e.target.value)} />
             <FontSizeSelector label="Title Size" value={data?.cta.titleFontSize || 'md'} onChange={(v) => setNestedData('cta.titleFontSize', v)} />

             <TextArea label="Description" value={data?.cta.description} onChange={(e) => setNestedData('cta.description', e.target.value)} rows={2} />
             <FontSizeSelector label="Description Size" value={data?.cta.descriptionFontSize || 'md'} onChange={(v) => setNestedData('cta.descriptionFontSize', v)} />

             <Input label="Button Text" value={data?.cta.buttonText} onChange={(e) => setNestedData('cta.buttonText', e.target.value)} />
              <hr className="border-editor-border/50" />
              <ColorControl label="Gradient Start" value={data?.cta.colors.gradientStart || '#000'} onChange={(v) => setNestedData('cta.colors.gradientStart', v)} />
              <ColorControl label="Gradient End" value={data?.cta.colors.gradientEnd || '#000'} onChange={(v) => setNestedData('cta.colors.gradientEnd', v)} />
              <ColorControl label="Title" value={data?.cta.colors.heading || '#ffffff'} onChange={(v) => setNestedData('cta.colors.heading', v)} />
              <ColorControl label="Button Background" value={data?.cta.colors.buttonBackground || '#ffffff'} onChange={(v) => setNestedData('cta.colors.buttonBackground', v)} />
              <ColorControl label="Button Text" value={data?.cta.colors.buttonText || '#4f46e5'} onChange={(v) => setNestedData('cta.colors.buttonText', v)} />
          </div>
      ) },
      slideshow: { label: 'Slideshow', icon: PlaySquare, renderer: () => renderListSectionControls('slideshow', 'Slide', [{key: 'imageUrl', label: 'Image', type: 'image'}, {key: 'altText', label: 'Alt Text', type: 'input'}]) },
      video: { label: 'Video', icon: MonitorPlay, renderer: renderVideoControls },
      howItWorks: { label: 'How It Works', icon: Grid, renderer: () => renderListSectionControls('howItWorks', 'Step', [{key: 'title', label: 'Title', type: 'input'}, {key: 'description', label: 'Description', type: 'textarea'}, {key: 'icon', label: 'Icon', type: 'select', options: ['upload', 'process', 'magic-wand', 'download', 'share', 'search']}]) },
      chatbot: { label: 'AI Chatbot', icon: MessageSquare, renderer: renderChatbotControls },
      footer: { label: 'Footer', icon: Type, renderer: renderFooterControls },
      header: { label: 'Navigation Bar', icon: AlignJustify, renderer: renderHeaderControls },
      typography: { label: 'Global Typography', icon: Type, renderer: () => <FontManager /> }
  };

  if (!data) return null;

  const sortableSections = componentOrder.filter(k => k !== 'footer');

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-80 bg-editor-bg border-r border-editor-border transform transition-transform duration-300 ease-in-out
      md:translate-x-0 md:static md:h-full md:w-80 flex flex-col
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
       <div className="p-4 border-b border-editor-border bg-editor-panel-bg">
            <h2 className="text-lg font-bold text-editor-text-primary flex items-center">
                <Settings size={20} className="mr-2 text-editor-accent" /> Page Settings
            </h2>
       </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-editor-border scrollbar-track-editor-bg">
         {/* Navigation Section (Always Present) */}
         <AccordionItem 
            title="Navigation Bar" 
            icon={AlignJustify}
            isOpen={activeSection as any === 'header'}
            onDoubleClick={() => toggleSection('header')}
            isVisible={true} 
            onToggleVisibility={() => {}} 
         >
             {renderHeaderControls()}
         </AccordionItem>

         {/* Global Typography (New) */}
         <AccordionItem
            title="Global Typography"
            icon={Type}
            isOpen={activeSection as any === 'typography'}
            onDoubleClick={() => toggleSection('typography' as any)}
            isVisible={true}
            onToggleVisibility={() => {}}
         >
             <FontManager />
         </AccordionItem>

         {/* Dynamic Sections */}
         {sortableSections.map((sectionKey, index) => {
             const config = sectionConfig[sectionKey];
             if (!config) return null;

             return (
                 <AccordionItem
                    key={sectionKey}
                    title={config.label}
                    icon={config.icon}
                    isOpen={activeSection === sectionKey}
                    onDoubleClick={() => toggleSection(sectionKey)}
                    isVisible={sectionVisibility[sectionKey]}
                    onToggleVisibility={() => toggleVisibility(sectionKey)}
                    dragHandlers={{
                        draggable: true,
                        onDragStart: (e) => handleDragStart(e, index),
                        onDragOver: handleDragOver,
                        onDrop: (e) => handleDrop(e, index),
                        style: { opacity: draggedIndex === index ? 0.4 : 1 }
                    }}
                 >
                     {config.renderer()}
                 </AccordionItem>
             );
         })}

         {/* Footer Section */}
         <AccordionItem
            title="Footer"
            icon={Type}
            isOpen={activeSection === 'footer'}
            onDoubleClick={() => toggleSection('footer')}
            isVisible={sectionVisibility['footer']}
            onToggleVisibility={() => toggleVisibility('footer')}
         >
             {renderFooterControls()}
         </AccordionItem>
      </div>
      
      <AIContentAssistant 
        isOpen={!!aiAssistField}
        onClose={() => setAiAssistField(null)}
        onApply={handleAiApply}
        initialText={aiAssistField?.value || ''}
        contextPrompt={aiAssistField?.context || ''}
      />
    </aside>
  );
};

export default Controls;
