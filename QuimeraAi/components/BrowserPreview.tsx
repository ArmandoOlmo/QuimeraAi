
import React, { ReactNode, forwardRef, useCallback } from 'react';
import { useUI } from '../contexts/core/UIContext';
import { useAuth } from '../contexts/core/AuthContext';
import { useProject } from '../contexts/project';
import { useTenant } from '../contexts/tenant/TenantContext';
import { PreviewDevice, PreviewOrientation } from '../types';
import { ExternalLink } from 'lucide-react';

interface BrowserPreviewProps {
  children: ReactNode;
}

const widthClasses: Record<PreviewDevice, Record<PreviewOrientation, string>> = {
  desktop: {
    portrait: 'w-full',
    landscape: 'w-full',
  },
  tablet: {
    portrait: 'w-full max-w-3xl',
    landscape: 'w-full max-w-4xl',
  },
  mobile: {
    portrait: 'w-full max-w-sm',
    landscape: 'w-full max-w-md',
  },
};

const BrowserPreview = forwardRef<HTMLDivElement, BrowserPreviewProps>(({ children }, ref) => {
  const { previewDevice, previewOrientation } = useUI();
  const { user } = useAuth();
  const { activeProject, activePage } = useProject();
  const { currentTenant } = useTenant();

  const projectSlug = activeProject?.name
    ? activeProject.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    : 'new-project';
  const activePath = activePage && !activePage.isHomePage
    ? `/${(activePage.slug || '').replace(/^\//, '').replace(/\/$/, '')}`
    : '';
  const displayPath = `${projectSlug}${activePath}`;

  const handleOpenPreview = useCallback(() => {
    if (!user?.uid || !activeProject?.id) return;
    
    let previewUrl = '';
    if (activeProject.id === 'agency-landing-mode') {
      if (!currentTenant?.id) return;
      previewUrl = `${window.location.origin}/preview/agency/${currentTenant.id}${activePath}`;
    } else {
      previewUrl = `${window.location.origin}/preview/${user.uid}/${activeProject.id}${activePath}`;
    }
    
    window.open(previewUrl, '_blank');
  }, [user?.uid, activeProject?.id, currentTenant?.id, activePath]);

  return (
    <div className={`h-full mx-auto transition-all duration-300 ease-in-out ${widthClasses[previewDevice][previewOrientation]}`}>
      <div className="w-full h-full rounded-xl shadow-2xl bg-q-surface border border-q-border flex flex-col overflow-hidden relative">
        {/* Browser Header */}
        <div className="flex-shrink-0 h-12 bg-q-bg/80 backdrop-blur-md border-b border-q-border flex items-center px-4 space-x-2 z-10">
          <div className="flex space-x-2">
            <span className="w-3 h-3 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"></span>
            <span className="w-3 h-3 bg-yellow-500/80 rounded-full hover:bg-yellow-500 transition-colors"></span>
            <span className="w-3 h-3 bg-green-500/80 rounded-full hover:bg-green-500 transition-colors"></span>
          </div>
          <div className="flex-grow flex items-center justify-center">
            <div
              onClick={handleOpenPreview}
              title="Click to open preview in new tab"
              className="bg-q-surface/50 text-q-text-muted text-xs rounded-full px-4 py-1.5 w-full max-w-md text-center truncate flex items-center justify-center cursor-pointer hover:bg-q-border/20 transition-all duration-200 border border-q-border/30 group backdrop-blur-sm"
            >
              <span className="opacity-40 mr-0.5">https://quimera.ai/</span>
              <span className="font-medium text-q-text/90">{displayPath}</span>
              <ExternalLink size={11} className="ml-2 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
            </div>
          </div>
          <div className="w-16"></div> {/* Spacer to balance the controls */}
        </div>

        {/* Browser Content - Container Query Context */}
        <div
          ref={ref}
          className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-q-border scrollbar-track-q-bg preview-${previewDevice} preview-container`}
          style={{
            // CRITICAL FIX: 
            // Adding transform: scale(1) creates a new containing block.
            // This ensures position: fixed elements (like the sticky/floating header) are 
            // positioned relative to THIS container, not the entire browser viewport.
            transform: 'scale(1)',
            transformOrigin: 'top left',
            // Container Query setup - allows @container queries to respond to this container's width
            containerType: 'inline-size',
            containerName: 'preview',
          }}
        >
          {children}
        </div>

        {/* Overlay Container for Fixed Elements (Chatbot, etc.) */}
        {/* This container sits on top of the content but does not scroll */}
        <div id="browser-preview-overlay" className="absolute inset-0 pointer-events-none z-50 overflow-hidden" style={{ top: '48px' /* 12 (3rem) header height */ }}>
          {/* Portals will be rendered here */}
        </div>
      </div>
    </div>
  );
});

export default BrowserPreview;
