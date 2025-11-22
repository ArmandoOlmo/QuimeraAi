
import React, { useState, useRef } from 'react';
import { useEditor } from '../contexts/EditorContext';
import { PageSection, PricingTier } from '../types';
import ColorControl from './ui/ColorControl';
import FontManager from './ui/FontManager';
import ImagePicker from './ui/ImagePicker';
import { useClickOutside } from '../hooks/useClickOutside';
import { 
    Trash2, Plus, ChevronDown, ChevronRight, ArrowLeft, HelpCircle, 
    Layout, Image, List, Star, PlaySquare, Users, DollarSign, 
    Briefcase, MessageCircle, Mail, Send, Type, MousePointerClick,
    Settings, AlignJustify, MonitorPlay, Grid, GripVertical, Upload, Menu as MenuIcon, MessageSquare, FileText, PlusCircle, X
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
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
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

const PaddingSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {['sm', 'md', 'lg'].map((size) => (
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

const BorderRadiusSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {[{v: 'none', l: 'None'}, {v: 'md', l: 'Med'}, {v: 'xl', l: 'Lg'}, {v: 'full', l: 'Full'}].map((opt) => (
                <button
                    key={opt.v}
                    onClick={() => onChange(opt.v)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                >
                    {opt.l}
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
    onRemove?: () => void;
    canRemove?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    onDoubleClick, 
    isVisible, 
    onToggleVisibility, 
    children,
    dragHandlers,
    onRemove,
    canRemove = false
}) => {
    return (
        <div 
            className={`border-b border-editor-border bg-editor-bg transition-colors ${isOpen ? 'bg-editor-bg' : ''}`}
            style={dragHandlers?.style}
            onDragOver={dragHandlers?.draggable ? dragHandlers.onDragOver : undefined}
            onDrop={dragHandlers?.draggable ? dragHandlers.onDrop : undefined}
        >
            <div 
                className={`flex items-center justify-between p-4 hover:bg-editor-panel-bg/50 transition-colors select-none ${isOpen ? 'bg-editor-panel-bg/50' : ''}`}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {dragHandlers?.draggable && (
                         <div 
                            className="text-editor-text-secondary hover:text-editor-text-primary -ml-1 cursor-grab active:cursor-grabbing flex-shrink-0"
                            draggable={true}
                            onDragStart={dragHandlers.onDragStart}
                            onDragEnd={dragHandlers.onDragEnd}
                         >
                             <GripVertical size={16} />
                         </div>
                    )}
                    <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0" onDoubleClick={onDoubleClick}>
                        {Icon && <Icon size={18} className={`text-editor-text-secondary ${isOpen ? 'text-editor-accent' : ''} flex-shrink-0`} />}
                        <span className={`font-semibold text-sm ${isOpen ? 'text-editor-accent' : 'text-editor-text-primary'} truncate`}>{title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {canRemove && onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Remove ${title} from this page?`)) {
                                    onRemove();
                                }
                            }}
                            className="p-1 text-editor-text-secondary hover:text-red-400 transition-colors"
                            title="Remove from page"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <ToggleControl checked={isVisible} onChange={onToggleVisibility} />
                    <div className="cursor-pointer" onDoubleClick={onDoubleClick}>
                        {isOpen ? <ChevronDown size={16} className="text-editor-text-secondary" /> : <ChevronRight size={16} className="text-editor-text-secondary" />}
                    </div>
                </div>
            </div>
            {isOpen && (
                <div className="p-4 bg-editor-panel-bg border-t border-editor-border animate-fade-in-up cursor-default">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- Main Component ---

const Controls: React.FC = () => {
  const { 
      data, setData, 
      activeSection, onSectionSelect, 
      sectionVisibility, setSectionVisibility, 
      componentOrder, setComponentOrder,
      componentStatus,
      isSidebarOpen,
      uploadImageAndGetURL,
      menus,
      setView
  } = useEditor();
  
  const [aiAssistField, setAiAssistField] = useState<{path: string, value: string, context: string} | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const addComponentRef = useRef<HTMLDivElement>(null);

  // Close add component dropdown when clicking outside
  useClickOutside(addComponentRef, () => setIsAddComponentOpen(false));

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
  const handleDragStart = (e: React.DragEvent, sectionKey: PageSection) => {
      const sections = componentOrder.filter(k => k !== 'footer');
      setDraggedIndex(sections.indexOf(sectionKey));
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", sectionKey); 
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetSection: PageSection) => {
      e.preventDefault();
      
      if (draggedIndex === null) return;
      
      const sections = componentOrder.filter(k => k !== 'footer');
      const targetIndex = sections.indexOf(targetSection);
      if (draggedIndex === targetIndex) return;

      const newOrder = [...sections];
      const [movedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, movedItem);

      // Always keep footer at the end if it exists in current setup
      setComponentOrder([...newOrder, 'footer']);
      setDraggedIndex(null);
  };
  
  const handleDragEnd = () => {
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
              <h4 className="font-bold text-editor-text-primary text-sm">Height & Hover</h4>
              <div>
                  <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Height</label>
                      <span className="text-xs text-editor-text-primary">{data.header.height || 70}px</span>
                  </div>
                  <input
                      type="range" min="50" max="120" step="5"
                      value={data.header.height || 70}
                      onChange={(e) => setNestedData('header.height', parseInt(e.target.value))}
                      className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                  />
              </div>

              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Link Hover Style</label>
                  <div className="grid grid-cols-2 gap-2">
                      {[
                          {value: 'simple', label: 'Simple'},
                          {value: 'underline', label: 'Underline'},
                          {value: 'bracket', label: 'Bracket'},
                          {value: 'highlight', label: 'Highlight'},
                          {value: 'glow', label: 'Glow'}
                      ].map(style => (
                          <button 
                              key={style.value}
                              onClick={() => setNestedData('header.hoverStyle', style.value)}
                              className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${data.header.hoverStyle === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
                          >
                              {style.label}
                          </button>
                      ))}
                  </div>
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Call-to-Action Button</h4>
              <ToggleControl label="Show CTA Button" checked={data.header.showCta !== false} onChange={(v) => setNestedData('header.showCta', v)} />
              
              {data.header.showCta !== false && (
                  <div className="space-y-3 animate-fade-in-up">
                      <Input label="Button Text" value={data.header.ctaText || 'Get Started'} onChange={(e) => setNestedData('header.ctaText', e.target.value)} />
                      <div>
                          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Button Radius</label>
                          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                              {[{v: 'none', l: 'None'}, {v: 'md', l: 'Med'}, {v: 'xl', l: 'Lg'}, {v: 'full', l: 'Full'}].map((opt) => (
                                  <button
                                      key={opt.v}
                                      onClick={() => setNestedData('header.buttonBorderRadius', opt.v)}
                                      className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.header.buttonBorderRadius === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                                  >
                                      {opt.l}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Colors</h4>
              <ColorControl label="Background" value={data.header.colors.background} onChange={(v) => setNestedData('header.colors.background', v)} />
              <ColorControl label="Text" value={data.header.colors.text} onChange={(v) => setNestedData('header.colors.text', v)} />
              <ColorControl label="Accent" value={data.header.colors.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.accent', v)} />
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
              
              <div className="grid grid-cols-2 gap-4">
                  <Input label="Primary CTA" value={data.hero.primaryCta} onChange={(e) => setNestedData('hero.primaryCta', e.target.value)} />
                  <Input label="Secondary CTA" value={data.hero.secondaryCta} onChange={(e) => setNestedData('hero.secondaryCta', e.target.value)} />
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Badge</h4>
              <ToggleControl 
                  label="Show Badge" 
                  checked={data.hero.showBadge !== false} 
                  onChange={(v) => setNestedData('hero.showBadge', v)} 
              />
              {data.hero.showBadge !== false && (
                  <div className="space-y-3 animate-fade-in-up">
                      <div className="grid grid-cols-2 gap-3">
                          <Input 
                              label="Badge Icon" 
                              value={data.hero.badgeIcon || '✨'} 
                              onChange={(e) => setNestedData('hero.badgeIcon', e.target.value)} 
                              className="mb-0" 
                          />
                          <Input 
                              label="Badge Text" 
                              value={data.hero.badgeText || 'AI-Powered Generation'} 
                              onChange={(e) => setNestedData('hero.badgeText', e.target.value)} 
                              className="mb-0" 
                          />
                      </div>
                      <ColorControl 
                          label="Badge Color" 
                          value={data.hero.badgeColor || data.hero.colors.primary || '#4f46e5'} 
                          onChange={(v) => setNestedData('hero.badgeColor', v)} 
                      />
                      <ColorControl 
                          label="Badge Background" 
                          value={data.hero.badgeBackgroundColor || `${data.hero.colors.primary}15`} 
                          onChange={(v) => setNestedData('hero.badgeBackgroundColor', v)} 
                      />
                  </div>
              )}

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Statistics</h4>
              <ToggleControl 
                  label="Show Statistics" 
                  checked={data.hero.showStats !== false} 
                  onChange={(v) => setNestedData('hero.showStats', v)} 
              />
              {data.hero.showStats !== false && (
                  <div className="space-y-3 animate-fade-in-up">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                          <ColorControl 
                              label="Stats Value Color" 
                              value={data.hero.statsValueColor || data.hero.colors.primary || '#4f46e5'} 
                              onChange={(v) => setNestedData('hero.statsValueColor', v)} 
                          />
                          <ColorControl 
                              label="Stats Label Color" 
                              value={data.hero.statsLabelColor || data.hero.colors.text || '#94a3b8'} 
                              onChange={(v) => setNestedData('hero.statsLabelColor', v)} 
                          />
                      </div>
                      {(data.hero.stats || [
                          { value: '10K+', label: 'Artworks Created' },
                          { value: '5K+', label: 'Happy Users' },
                          { value: '4.9★', label: 'User Rating' }
                      ]).map((stat, index) => (
                          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-editor-text-secondary">Stat #{index + 1}</span>
                                  <button 
                                      onClick={() => {
                                          const newStats = (data.hero.stats || []).filter((_, i) => i !== index);
                                          setNestedData('hero.stats', newStats.length > 0 ? newStats : undefined);
                                      }}
                                      className="text-editor-text-secondary hover:text-red-400 transition-colors"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <input 
                                      placeholder="Value (e.g., 10K+)" 
                                      value={stat.value} 
                                      onChange={(e) => setNestedData(`hero.stats.${index}.value`, e.target.value)} 
                                      className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                  />
                                  <input 
                                      placeholder="Label" 
                                      value={stat.label} 
                                      onChange={(e) => setNestedData(`hero.stats.${index}.label`, e.target.value)} 
                                      className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                  />
                              </div>
                          </div>
                      ))}
                      <button 
                          onClick={() => {
                              const currentStats = data.hero.stats || [
                                  { value: '10K+', label: 'Artworks Created' },
                                  { value: '5K+', label: 'Happy Users' },
                                  { value: '4.9★', label: 'User Rating' }
                              ];
                              setNestedData('hero.stats', [...currentStats, { value: '0', label: 'New Stat' }]);
                          }}
                          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
                      >
                          <Plus size={14} /> Add Statistic
                      </button>
                  </div>
              )}

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Layout & Spacing</h4>
              <div className="grid grid-cols-2 gap-4">
                  <PaddingSelector label="Vertical Padding" value={data.hero.paddingY || 'md'} onChange={(v) => setNestedData('hero.paddingY', v)} />
                  <PaddingSelector label="Horizontal Padding" value={data.hero.paddingX || 'md'} onChange={(v) => setNestedData('hero.paddingX', v)} />
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Colors</h4>
              <ColorControl label="Background" value={data.hero.colors.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
              <ColorControl label="Title" value={data.hero.colors.heading || '#ffffff'} onChange={(v) => setNestedData('hero.colors.heading', v)} />
              <ColorControl label="Text" value={data.hero.colors.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
              
              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-2">Primary Button</h5>
              <div className="grid grid-cols-2 gap-4">
                  <ColorControl label="Background" value={data.hero.colors.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
                  <ColorControl label="Text" value={data.hero.colors.buttonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />
              </div>

              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-2">Secondary Button</h5>
              <div className="grid grid-cols-2 gap-4">
                  <ColorControl label="Background" value={data.hero.colors.secondaryButtonBackground || '#334155'} onChange={(v) => setNestedData('hero.colors.secondaryButtonBackground', v)} />
                  <ColorControl label="Text" value={data.hero.colors.secondaryButtonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.secondaryButtonText', v)} />
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Hero Image</h4>
              <ImagePicker label="Image URL" value={data.hero.imageUrl} onChange={(url) => setNestedData('hero.imageUrl', url)} />
              
              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Image Style</label>
                  <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                      {['default', 'rounded-full', 'glow', 'float', 'hexagon', 'polaroid'].map(style => (
                          <button 
                              key={style}
                              onClick={() => setNestedData('hero.imageStyle', style)}
                              className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors capitalize ${data.hero.imageStyle === style ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                          >
                              {style === 'rounded-full' ? 'Circle' : style}
                          </button>
                      ))}
                  </div>
              </div>

              <ToggleControl label="Drop Shadow" checked={data.hero.imageDropShadow || false} onChange={(v) => setNestedData('hero.imageDropShadow', v)} />

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Position</label>
                      <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                          {['left', 'right'].map(pos => (
                              <button 
                                  key={pos}
                                  onClick={() => setNestedData('hero.imagePosition', pos)}
                                  className={`flex-1 py-1 text-xs font-medium rounded-sm capitalize ${data.hero.imagePosition === pos ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
                              >
                                  {pos}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Alignment</label>
                      <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                          {['start', 'center', 'end'].map(align => (
                              <button 
                                  key={align}
                                  onClick={() => setNestedData('hero.imageJustification', align)}
                                  className={`flex-1 py-1 text-xs font-medium rounded-sm capitalize ${data.hero.imageJustification === align ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
                              >
                                  {align}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <div>
                  <BorderRadiusSelector label="Corner Radius (for 'Default' style)" value={data.hero.imageBorderRadius || 'md'} onChange={(v) => setNestedData('hero.imageBorderRadius', v)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Border Size</label>
                      <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                          {['none', 'sm', 'md', 'lg'].map(size => (
                              <button 
                                  key={size}
                                  onClick={() => setNestedData('hero.imageBorderSize', size)}
                                  className={`flex-1 py-1 text-xs font-medium rounded-sm uppercase ${data.hero.imageBorderSize === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
                              >
                                  {size}
                              </button>
                          ))}
                      </div>
                  </div>
                  <ColorControl label="Border Color" value={data.hero.imageBorderColor || 'transparent'} onChange={(v) => setNestedData('hero.imageBorderColor', v)} />
              </div>

              <div>
                  <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Image Width</label>
                      <span className="text-xs text-editor-text-primary">{data.hero.imageWidth || 100}%</span>
                  </div>
                  <input
                      type="range" min="25" max="100" step="5"
                      value={data.hero.imageWidth || 100}
                      onChange={(e) => setNestedData('hero.imageWidth', parseInt(e.target.value))}
                      className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                  />
              </div>

              <ToggleControl
                  label="Set Max Height"
                  checked={data.hero.imageHeightEnabled || false}
                  onChange={(v) => setNestedData('hero.imageHeightEnabled', v)}
              />
              {data.hero.imageHeightEnabled && (
                  <div className="animate-fade-in-up">
                      <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Max Height</label>
                          <span className="text-xs text-editor-text-primary">{data.hero.imageHeight || 500}px</span>
                      </div>
                      <input
                          type="range" min="200" max="800" step="10"
                          value={data.hero.imageHeight || 500}
                          onChange={(e) => setNestedData('hero.imageHeight', parseInt(e.target.value))}
                          className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                      />
                  </div>
              )}

              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                      {['auto', '1:1', '4:3', '3:4', '16:9', '9:16'].map(ratio => (
                          <button 
                              key={ratio}
                              onClick={() => setNestedData('hero.imageAspectRatio', ratio)}
                              className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors ${data.hero.imageAspectRatio === ratio ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                          >
                              {ratio}
                          </button>
                      ))}
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Object Fit</label>
                  <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                      {['cover', 'contain', 'fill', 'none', 'scale-down'].map(fit => (
                          <button 
                              key={fit}
                              onClick={() => setNestedData('hero.imageObjectFit', fit)}
                              className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors capitalize ${data.hero.imageObjectFit === fit ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                          >
                              {fit === 'scale-down' ? 'Scale' : fit}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  const renderFeaturesControls = () => {
      if (!data?.features) return null;
      return (
          <div className="space-y-4">
              <Input label="Title" value={data.features.title} onChange={(e) => setNestedData('features.title', e.target.value)} />
              <FontSizeSelector label="Title Size" value={data.features.titleFontSize || 'md'} onChange={(v) => setNestedData('features.titleFontSize', v)} />
              
              <TextArea label="Description" value={data.features.description} onChange={(e) => setNestedData('features.description', e.target.value)} rows={2} />
              <FontSizeSelector label="Description Size" value={data.features.descriptionFontSize || 'md'} onChange={(v) => setNestedData('features.descriptionFontSize', v)} />
              
              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Grid Layout</h4>
              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Columns (Desktop)</label>
                  <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                      {[2, 3, 4].map(cols => (
                          <button 
                              key={cols}
                              onClick={() => setNestedData('features.gridColumns', cols)}
                              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.features.gridColumns === cols ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                          >
                              {cols}
                          </button>
                      ))}
                  </div>
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Card Image</h4>
              <div>
                  <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Image Height</label>
                      <span className="text-xs text-editor-text-primary">{data.features.imageHeight || 200}px</span>
                  </div>
                  <input
                      type="range" min="100" max="600" step="10"
                      value={data.features.imageHeight || 200}
                      onChange={(e) => setNestedData('features.imageHeight', parseInt(e.target.value))}
                      className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                  />
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Object Fit</label>
                  <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                      {['cover', 'contain', 'fill', 'none', 'scale-down'].map(fit => (
                          <button 
                              key={fit}
                              onClick={() => setNestedData('features.imageObjectFit', fit)}
                              className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors capitalize ${data.features.imageObjectFit === fit ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                          >
                              {fit === 'scale-down' ? 'Scale' : fit}
                          </button>
                      ))}
                  </div>
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Layout & Spacing</h4>
              <div className="grid grid-cols-2 gap-4">
                  <PaddingSelector label="Vertical Padding" value={data.features.paddingY || 'md'} onChange={(v) => setNestedData('features.paddingY', v)} />
                  <PaddingSelector label="Horizontal Padding" value={data.features.paddingX || 'md'} onChange={(v) => setNestedData('features.paddingX', v)} />
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Colors</h4>
              <ColorControl label="Background" value={data.features.colors?.background || '#000000'} onChange={(v) => setNestedData('features.colors.background', v)} />
              <ColorControl label="Title" value={data.features.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('features.colors.heading', v)} />
              <ColorControl label="Text" value={data.features.colors?.text || '#ffffff'} onChange={(v) => setNestedData('features.colors.text', v)} />
              <ColorControl label="Accent" value={data.features.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('features.colors.accent', v)} />
              <ColorControl label="Border" value={data.features.colors?.borderColor || 'transparent'} onChange={(v) => setNestedData('features.colors.borderColor', v)} />

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider mb-2">Features</h4>
              {(data.features.items || []).map((item, index) => (
                  <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-editor-text-secondary">Feature #{index + 1}</span>
                          <button 
                              onClick={() => {
                                  const newItems = data.features.items.filter((_, i) => i !== index);
                                  setNestedData('features.items', newItems);
                              }}
                              className="text-editor-text-secondary hover:text-red-400 transition-colors"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>
                      <Input placeholder="Title" value={item.title} onChange={(e) => setNestedData(`features.items.${index}.title`, e.target.value)} className="mb-2" />
                      <textarea 
                          placeholder="Description" 
                          value={item.description} 
                          onChange={(e) => setNestedData(`features.items.${index}.description`, e.target.value)} 
                          rows={2} 
                          className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
                      />
                      <ImagePicker 
                          label="Image"
                          value={item.imageUrl}
                          onChange={(url) => setNestedData(`features.items.${index}.imageUrl`, url)}
                      />
                  </div>
              ))}
              <button 
                  onClick={() => {
                      setNestedData('features.items', [...(data.features.items || []), { title: '', description: '', imageUrl: '' }]);
                  }}
                  className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                  <Plus size={14} /> Add Feature
              </button>
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
            <h4 className="font-bold text-editor-text-primary text-sm">Layout & Spacing</h4>
            <div className="grid grid-cols-2 gap-4">
                <PaddingSelector label="Vertical Padding" value={data.pricing.paddingY || 'md'} onChange={(v) => setNestedData('pricing.paddingY', v)} />
                <PaddingSelector label="Horizontal Padding" value={data.pricing.paddingX || 'md'} onChange={(v) => setNestedData('pricing.paddingX', v)} />
            </div>
            
            <BorderRadiusSelector label="Card Corners" value={data.pricing.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('pricing.cardBorderRadius', v)} />
            
            <hr className="border-editor-border/50" />
            <h4 className="font-bold text-editor-text-primary text-sm">Section Colors</h4>
            <ColorControl label="Background" value={data.pricing.colors.background} onChange={(v) => setNestedData('pricing.colors.background', v)} />
            <ColorControl label="Title" value={data.pricing.colors.heading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.heading', v)} />
            <ColorControl label="Text" value={data.pricing.colors.text} onChange={(v) => setNestedData('pricing.colors.text', v)} />
            
            <hr className="border-editor-border/50" />
            <h4 className="font-bold text-editor-text-primary text-sm">Card Colors</h4>
            <ColorControl label="Card Background" value={data.pricing.colors.cardBackground || '#1f2937'} onChange={(v) => setNestedData('pricing.colors.cardBackground', v)} />
            <ColorControl label="Border Color" value={data.pricing.colors.borderColor || '#374151'} onChange={(v) => setNestedData('pricing.colors.borderColor', v)} />
            <ColorControl label="Featured Accent" value={data.pricing.colors.accent || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.accent', v)} />
            <ColorControl label="Checkmark Icon" value={data.pricing.colors.checkmarkColor || '#10b981'} onChange={(v) => setNestedData('pricing.colors.checkmarkColor', v)} />
            
            <hr className="border-editor-border/50" />
            <h4 className="font-bold text-editor-text-primary text-sm">Default Button Colors</h4>
            <div className="grid grid-cols-2 gap-3">
                <ColorControl label="Background" value={data.pricing.colors.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.buttonBackground', v)} />
                <ColorControl label="Text" value={data.pricing.colors.buttonText || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.buttonText', v)} />
            </div>
            
            <hr className="border-editor-border/50" />
            <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider mb-2">Pricing Tiers</h4>
            {(data.pricing.tiers || []).map((tier, index) => (
                 <div key={index} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-3 group">
                     <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-editor-text-secondary">Tier #{index + 1}</span>
                          <button onClick={() => {
                              const newTiers = data.pricing.tiers.filter((_, i) => i !== index);
                              setNestedData('pricing.tiers', newTiers);
                          }} className="text-editor-text-secondary hover:text-red-400"><Trash2 size={14} /></button>
                     </div>
                     
                     <div className="space-y-3">
                         <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Plan Name" value={tier.name} onChange={(e) => setNestedData(`pricing.tiers.${index}.name`, e.target.value)} className="mb-0" />
                            <Input placeholder="Price" value={tier.price} onChange={(e) => setNestedData(`pricing.tiers.${index}.price`, e.target.value)} className="mb-0" />
                         </div>
                         
                         <Input placeholder="Frequency (e.g. /month)" value={tier.frequency} onChange={(e) => setNestedData(`pricing.tiers.${index}.frequency`, e.target.value)} className="mb-0" />
                         
                         <TextArea 
                             placeholder="Description (optional)" 
                             value={tier.description || ''} 
                             onChange={(e) => setNestedData(`pricing.tiers.${index}.description`, e.target.value)} 
                             rows={2}
                             className="mb-0"
                         />
                         
                         <div>
                            <label className="block text-[10px] font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Features (One per line)</label>
                            <textarea 
                                value={tier.features.join('\n')} 
                                onChange={(e) => setNestedData(`pricing.tiers.${index}.features`, e.target.value.split('\n').filter(f => f.trim()))}
                                rows={4}
                                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                                className="w-full bg-editor-panel-bg border border-editor-border rounded px-3 py-2 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                            />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-2">
                             <Input 
                                 placeholder="Button Text" 
                                 value={tier.buttonText} 
                                 onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonText`, e.target.value)} 
                                 className="mb-0"
                             />
                             <Input 
                                 placeholder="Button Link" 
                                 value={tier.buttonLink || ''} 
                                 onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonLink`, e.target.value)} 
                                 className="mb-0"
                             />
                         </div>
                         
                         <ToggleControl 
                             label="Featured Plan (Highlighted)" 
                             checked={tier.featured} 
                             onChange={(v) => setNestedData(`pricing.tiers.${index}.featured`, v)} 
                         />
                     </div>
                 </div>
            ))}
            
            <button 
                onClick={() => setNestedData('pricing.tiers', [
                    ...data.pricing.tiers, 
                    { name: 'New Plan', price: '$0', frequency: '/mo', description: '', features: [], buttonText: 'Get Started', buttonLink: '#', featured: false }
                ])} 
                className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Plus size={14} /> Add Pricing Tier
            </button>
        </div>
      );
  }

  const renderTestimonialsControls = () => {
      if (!data?.testimonials) return null;
      return (
          <div className="space-y-4">
              <Input label="Title" value={data.testimonials.title} onChange={(e) => setNestedData('testimonials.title', e.target.value)} />
              <FontSizeSelector label="Title Size" value={data.testimonials.titleFontSize || 'md'} onChange={(v) => setNestedData('testimonials.titleFontSize', v)} />
              
              <TextArea label="Description" value={data.testimonials.description} onChange={(e) => setNestedData('testimonials.description', e.target.value)} rows={2} />
              <FontSizeSelector label="Description Size" value={data.testimonials.descriptionFontSize || 'md'} onChange={(v) => setNestedData('testimonials.descriptionFontSize', v)} />
              
              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Card Styling</h4>
              
              <ColorControl label="Card Background" value={data.testimonials.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('testimonials.colors.cardBackground', v)} />
              
              <BorderRadiusSelector label="Card Corners" value={data.testimonials.borderRadius || 'xl'} onChange={(v) => setNestedData('testimonials.borderRadius', v)} />
              
              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Card Shadow</label>
                  <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                      {['none', 'sm', 'md', 'lg', 'xl'].map((shadow) => (
                          <button
                              key={shadow}
                              onClick={() => setNestedData('testimonials.cardShadow', shadow)}
                              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors uppercase ${(data.testimonials.cardShadow || 'lg') === shadow ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                          >
                              {shadow}
                          </button>
                      ))}
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Border Style</label>
                  <div className="grid grid-cols-2 gap-2">
                      {[
                          {value: 'none', label: 'None'},
                          {value: 'solid', label: 'Solid'},
                          {value: 'gradient', label: 'Gradient'},
                          {value: 'glow', label: 'Glow'}
                      ].map(style => (
                          <button 
                              key={style.value}
                              onClick={() => setNestedData('testimonials.borderStyle', style.value)}
                              className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${(data.testimonials.borderStyle || 'solid') === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
                          >
                              {style.label}
                          </button>
                      ))}
                  </div>
              </div>

              <ColorControl label="Border Color" value={data.testimonials.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('testimonials.colors.borderColor', v)} />

              <div>
                  <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Padding</label>
                      <span className="text-xs text-editor-text-primary">{data.testimonials.cardPadding || 32}px</span>
                  </div>
                  <input
                      type="range" min="16" max="64" step="4"
                      value={data.testimonials.cardPadding || 32}
                      onChange={(e) => setNestedData('testimonials.cardPadding', parseInt(e.target.value))}
                      className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                  />
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Layout & Spacing</h4>
              <div className="grid grid-cols-2 gap-4">
                  <PaddingSelector label="Vertical Padding" value={data.testimonials.paddingY || 'md'} onChange={(v) => setNestedData('testimonials.paddingY', v)} />
                  <PaddingSelector label="Horizontal Padding" value={data.testimonials.paddingX || 'md'} onChange={(v) => setNestedData('testimonials.paddingX', v)} />
              </div>

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm">Section Colors</h4>
              <ColorControl label="Background" value={data.testimonials.colors?.background || '#000000'} onChange={(v) => setNestedData('testimonials.colors.background', v)} />
              <ColorControl label="Title" value={data.testimonials.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.heading', v)} />
              <ColorControl label="Text" value={data.testimonials.colors?.text || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.text', v)} />
              <ColorControl label="Accent" value={data.testimonials.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('testimonials.colors.accent', v)} />

              <hr className="border-editor-border/50" />
              <h4 className="font-bold text-editor-text-primary text-sm uppercase tracking-wider mb-2">Testimonials</h4>
              {(data.testimonials.items || []).map((item: any, index: number) => (
                  <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-editor-text-secondary">Testimonial #{index + 1}</span>
                          <button 
                              onClick={() => {
                                  const newItems = (data.testimonials.items || []).filter((_: any, i: number) => i !== index);
                                  setNestedData('testimonials.items', newItems);
                              }}
                              className="text-editor-text-secondary hover:text-red-400 transition-colors"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>
                      <textarea 
                          placeholder="Quote" 
                          value={item.quote} 
                          onChange={(e) => setNestedData(`testimonials.items.${index}.quote`, e.target.value)} 
                          rows={2} 
                          className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
                      />
                      <input 
                          placeholder="Name" 
                          value={item.name} 
                          onChange={(e) => setNestedData(`testimonials.items.${index}.name`, e.target.value)} 
                          className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
                      />
                      <input 
                          placeholder="Role" 
                          value={item.title} 
                          onChange={(e) => setNestedData(`testimonials.items.${index}.title`, e.target.value)} 
                          className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
                      />
                      <ImagePicker 
                          label="Avatar"
                          value={item.avatar}
                          onChange={(url) => setNestedData(`testimonials.items.${index}.avatar`, url)}
                      />
                  </div>
              ))}
              <button 
                  onClick={() => {
                      const newItem = { quote: '', name: '', title: '', avatar: '' };
                      setNestedData('testimonials.items', [...(data.testimonials.items || []), newItem]);
                  }}
                  className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                  <Plus size={14} /> Add Testimonial
              </button>
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
                             <div className="flex items-center gap-2 mb-2">
                                <input placeholder="Column Title" value={col.title} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.title`, e.target.value)} className="bg-transparent border-b border-editor-border focus:border-editor-accent flex-1 text-sm font-bold text-editor-text-primary px-1 min-w-0 focus:outline-none" />
                                <button onClick={() => {
                                        const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                                        setNestedData('footer.linkColumns', newCols);
                                }} className="text-red-400 hover:text-red-500 flex-shrink-0 hover:bg-red-500/10 rounded p-1 transition-colors"><Trash2 size={14}/></button>
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
                                             <input placeholder="Text" value={link.text} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                                             <input placeholder="Href" value={link.href} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                                              <button onClick={() => {
                                                 const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                                                 setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                                             }} className="text-editor-text-secondary hover:text-red-400 flex-shrink-0"><Trash2 size={12}/></button>
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
      features: { label: 'Features', icon: List, renderer: renderFeaturesControls },
      testimonials: { label: 'Testimonials', icon: Star, renderer: renderTestimonialsControls },
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
              <h4 className="font-bold text-editor-text-primary text-sm">Colors</h4>
              <ColorControl label="Section Background" value={data?.cta.colors.background || '#0f172a'} onChange={(v) => setNestedData('cta.colors.background', v)} />
              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-3">Card Gradient</h5>
              <ColorControl label="Gradient Start" value={data?.cta.colors.gradientStart || '#000'} onChange={(v) => setNestedData('cta.colors.gradientStart', v)} />
              <ColorControl label="Gradient End" value={data?.cta.colors.gradientEnd || '#000'} onChange={(v) => setNestedData('cta.colors.gradientEnd', v)} />
              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-3">Text & Button</h5>
              <ColorControl label="Title" value={data?.cta.colors.heading || '#ffffff'} onChange={(v) => setNestedData('cta.colors.heading', v)} />
              <ColorControl label="Description" value={data?.cta.colors.text || '#ffffff'} onChange={(v) => setNestedData('cta.colors.text', v)} />
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

  const sortableSections = componentOrder.filter(k => k !== 'footer' && componentStatus[k as PageSection]);
  
  // Get available components to add (those that are enabled globally but not in current page)
  const availableComponentsToAdd = (Object.keys(sectionConfig) as PageSection[]).filter(
    section => !componentOrder.includes(section) && componentStatus[section] && section !== 'header' && section !== 'typography' && section !== 'footer'
  );
  
  const handleAddComponent = (section: PageSection) => {
    // Add component to the order (before footer)
    const newOrder = [...componentOrder.filter(k => k !== 'footer'), section, 'footer'];
    setComponentOrder(newOrder);
    
    // Make it visible
    setSectionVisibility(prev => ({
      ...prev,
      [section]: true
    }));
    
    // Close the dropdown
    setIsAddComponentOpen(false);
    
    // Select the newly added component
    onSectionSelect(section as any);
  };
  
  const handleRemoveComponent = (section: PageSection) => {
    // Remove component from the order
    const newOrder = componentOrder.filter(k => k !== section);
    setComponentOrder(newOrder);
    
    // Hide it
    setSectionVisibility(prev => ({
      ...prev,
      [section]: false
    }));
    
    // If it was selected, deselect
    if (activeSection === section) {
      onSectionSelect(null as any);
    }
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-80 bg-editor-bg border-r border-editor-border transform transition-transform duration-300 ease-in-out
      md:translate-x-0 md:static md:h-full md:w-80 flex flex-col
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
       <div className="p-4 border-b border-editor-border bg-editor-panel-bg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-editor-text-primary flex items-center">
                  <Settings size={20} className="mr-2 text-editor-accent" /> Page Settings
              </h2>
              {availableComponentsToAdd.length > 0 && (
                <div className="relative" ref={addComponentRef}>
                  <button
                    onClick={() => setIsAddComponentOpen(!isAddComponentOpen)}
                    className="p-2 rounded-md bg-editor-accent text-editor-bg hover:bg-editor-accent-hover transition-colors"
                    title="Add Component"
                  >
                    {isAddComponentOpen ? <X size={16} /> : <PlusCircle size={16} />}
                  </button>
                  
                  {isAddComponentOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 px-2">
                          Add Component
                        </div>
                        {availableComponentsToAdd.map(section => {
                          const config = sectionConfig[section];
                          if (!config) return null;
                          const Icon = config.icon;
                          
                          return (
                            <button
                              key={section}
                              onClick={() => handleAddComponent(section)}
                              className="w-full flex items-center gap-3 px-2 py-2 hover:bg-editor-bg rounded-md text-left transition-colors group"
                            >
                              <Icon size={16} className="text-editor-text-secondary group-hover:text-editor-accent" />
                              <span className="text-sm text-editor-text-primary group-hover:text-editor-accent font-medium">
                                {config.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                        onDragStart: (e) => handleDragStart(e, sectionKey),
                        onDragOver: handleDragOver,
                        onDrop: (e) => handleDrop(e, sectionKey),
                        onDragEnd: handleDragEnd,
                        style: { opacity: draggedIndex === index ? 0.4 : 1 }
                    }}
                    canRemove={true}
                    onRemove={() => handleRemoveComponent(sectionKey)}
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
