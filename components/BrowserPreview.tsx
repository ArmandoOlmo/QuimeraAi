
import React, { ReactNode, forwardRef } from 'react';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { PreviewDevice, PreviewOrientation } from '../types';

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
  const { activeProject } = useProject();

  const projectSlug = activeProject?.name
    ? activeProject.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    : 'new-project';

  return (
    <div className={`h-full mx-auto transition-all duration-300 ease-in-out ${widthClasses[previewDevice][previewOrientation]}`}>
      <div className="w-full h-full rounded-xl shadow-2xl bg-editor-panel-bg border border-editor-border flex flex-col overflow-hidden relative">
        {/* Browser Header */}
        <div className="flex-shrink-0 h-12 bg-editor-bg border-b border-editor-border flex items-center px-4 space-x-2 z-10">
          <div className="flex space-x-2">
            <span className="w-3.5 h-3.5 bg-red-500 rounded-full"></span>
            <span className="w-3.5 h-3.5 bg-yellow-500 rounded-full"></span>
            <span className="w-3.5 h-3.5 bg-green-500 rounded-full"></span>
          </div>
          <div className="flex-grow flex items-center justify-center">
            <div className="bg-editor-panel-bg text-editor-text-secondary text-sm rounded-full px-4 py-1.5 w-full max-w-md text-center truncate flex items-center justify-center cursor-default select-none border border-editor-border/50">
              <span className="opacity-50 mr-0.5">https://quimera.ai/</span>
              <span className="font-medium text-editor-text-primary">{projectSlug}</span>
            </div>
          </div>
          <div className="w-16"></div> {/* Spacer to balance the controls */}
        </div>

        {/* Browser Content - Container Query Context */}
        <div
          ref={ref}
          className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-editor-border scrollbar-track-editor-bg preview-${previewDevice} preview-container`}
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
