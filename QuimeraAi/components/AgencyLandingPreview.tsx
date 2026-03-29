import { resolveFontFamily } from "../utils/fontLoader";
import React, { useState, useEffect } from 'react';
import { db, doc, getDoc } from '../firebase';
import { Project, PageData, ThemeData, PageSection, SitePage } from '../types';
import { Loader2, AlertTriangle } from 'lucide-react';
import { AgencyLandingConfig } from '../types/agencyLanding';
import { initialAgencyData } from './dashboard/agency/landing/initialAgencyData';

import { getAgencyLanding } from '../services/agencyLandingService';


import PageRenderer from './PageRenderer';

const AgencyLandingPreview: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse URL params from pathname: /preview/agency/:tenantId
  const getTenantIdFromURL = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/preview/agency/')) {
       return hash.replace('#/preview/agency/', '').split('/')[0];
    }
    const pathname = window.location.pathname;
    if (pathname.startsWith('/preview/agency/')) {
       return pathname.replace('/preview/agency/', '').split('/')[0];
    }
    return null;
  };

  useEffect(() => {
    const loadProject = async () => {
      const tenantId = getTenantIdFromURL();
      
      if (!tenantId) {
        setError('Missing tenantId in URL');
        setLoading(false);
        return;
      }

      try {
        const config = await getAgencyLanding(tenantId);
        
        // Map data to Project structure that PageRenderer understands
        let mappedData: Partial<PageData> = {};
        let mappedOrder: PageSection[] = [];
        let mappedVisibility: Record<string, boolean> = {};
        let theme: ThemeData = initialAgencyData.theme as ThemeData;
        
        if (config) {
            
            if (config.sections && config.sections.length > 0) {
              config.sections.forEach(sec => {
                  const defaultData = initialAgencyData.data[sec.type as keyof PageData] as any;
                  mappedData[sec.type as keyof PageData] = {
                      ...(defaultData || {}),
                      ...(sec.data || {})
                  } as any;
                  mappedOrder.push(sec.type as PageSection);
                  mappedVisibility[sec.type] = sec.enabled;
              });
            } else {
              mappedData = initialAgencyData.data as Partial<PageData>;
              mappedOrder = initialAgencyData.componentOrder as PageSection[];
              mappedVisibility = initialAgencyData.sectionVisibility;
            }
            
            if (config.theme) {
                theme = config.theme as ThemeData;
            }
        } else {
            console.log("No agency landing found, using default template");
            mappedData = initialAgencyData.data as Partial<PageData>;
            mappedOrder = initialAgencyData.componentOrder as PageSection[];
            mappedVisibility = initialAgencyData.sectionVisibility;
        }
        
        const mockProject: Project = {
            id: 'agency-landing-mode',
            userId: '',
            name: 'Agency Landing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: mappedData as PageData,
            theme: theme,
            componentOrder: mappedOrder,
            sectionVisibility: mappedVisibility as Record<PageSection, boolean>,
            pages: [],
            activePageId: 'home',
        };
        
        setProject(mockProject);
        
      } catch (err) {
        console.error('Error loading agency landing preview:', err);
        setError('Failed to load agency landing');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, []);

  // Set CSS Variables for Theme
  // (Using the same logic as the main editor/preview)
  useEffect(() => {
    if (!project?.theme) return;
    const { theme } = project;
    const body = document.body;

    const setProp = (k: string, v: string) => document.documentElement.style.setProperty(k, v);
    setProp('--radius-card', theme.cardBorderRadius === 'none' ? '0px' : theme.cardBorderRadius === 'sm' ? '0.25rem' : theme.cardBorderRadius === 'xl' ? '1rem' : '0.5rem');
    setProp('--radius-button', theme.buttonBorderRadius === 'none' ? '0px' : theme.buttonBorderRadius === 'sm' ? '0.25rem' : theme.buttonBorderRadius === 'full' ? '9999px' : '0.5rem');

    if (theme.globalColors) {
      Object.entries(theme.globalColors).forEach(([k, v]) => setProp(`--color-${k}`, v));
    }

    // Apply Fonts and Styles
    if (theme.fontFamilyBody) {
      const f = resolveFontFamily(theme.fontFamilyBody);
      setProp('--font-body', `"${f}", sans-serif`);
    }
    if (theme.fontFamilyHeader) {
      const f = resolveFontFamily(theme.fontFamilyHeader);
      setProp('--font-heading', `"${f}", sans-serif`);
    }

    if (theme.pageBackground) {
      body.style.backgroundColor = theme.pageBackground;
    }
  }, [project]);

  if (loading) {
    return (
      <div className="flex bg-slate-900 flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-200">Loading Preview...</h2>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex bg-slate-900 flex-col items-center justify-center min-h-screen text-slate-200">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Preview Not Available</h2>
        <p className="text-slate-400">{error || 'Project not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-body text-editor-text-primary overflow-x-hidden antialiased flex flex-col">
      <PageRenderer
        project={{
            id: project.id,
            name: project.name,
            data: project.data,
            theme: project.theme,
            componentOrder: project.componentOrder,
            sectionVisibility: project.sectionVisibility,
        }}
      />
    </div>
  );
};

export default AgencyLandingPreview;
