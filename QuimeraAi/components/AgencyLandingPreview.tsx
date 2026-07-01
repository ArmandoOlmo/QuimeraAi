import { resolveFontFamily } from "../utils/fontLoader";
import React, { useState, useEffect } from 'react';
import { Project, PageData, ThemeData, PageSection } from '../types';
import { AlertTriangle } from 'lucide-react';
import { AgencyLandingConfig, AgencyLandingSection } from '../types/agencyLanding';
import { initialAgencyData } from './dashboard/agency/landing/initialAgencyData';
import QuimeraLoader from './ui/QuimeraLoader';
import { getInitialDataForLandingComponent } from '../utils/landingSectionDefaults';

import { getAgencyLanding } from '../services/agencyLandingService';


import PageRenderer from './PageRenderer';

const AGENCY_STRUCTURE_ORDER: PageSection[] = ['colors', 'typography', 'header'];
const AGENCY_FOOTER_SECTION: PageSection = 'footer';

const createDefaultAgencySection = (type: PageSection, order: number): AgencyLandingSection => ({
  id: type,
  type,
  order,
  enabled: initialAgencyData.sectionVisibility[type] !== false,
  data: (initialAgencyData.data as any)[type] || getInitialDataForLandingComponent(type),
});

const normalizeAgencySections = (sections?: AgencyLandingConfig['sections']): AgencyLandingSection[] => {
  const source = sections?.length
    ? [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : (initialAgencyData.componentOrder as PageSection[]).map((type, index) => createDefaultAgencySection(type, index));

  const byType = new Map<string, AgencyLandingSection>();
  source.forEach((section, index) => {
    if (!section?.type || byType.has(section.type)) return;
    byType.set(section.type, {
      ...section,
      id: AGENCY_STRUCTURE_ORDER.includes(section.type as PageSection) || section.type === AGENCY_FOOTER_SECTION
        ? section.type
        : section.id || `${section.type}-${index}`,
      order: section.order ?? index,
      enabled: section.enabled !== false,
      data: {
        ...((initialAgencyData.data as any)[section.type] || getInitialDataForLandingComponent(section.type)),
        ...(section.data || {}),
      },
    });
  });

  const normalized: AgencyLandingSection[] = [];
  AGENCY_STRUCTURE_ORDER.forEach((type, index) => {
    normalized.push(byType.get(type) || createDefaultAgencySection(type, index));
    byType.delete(type);
  });

  const footer = byType.get(AGENCY_FOOTER_SECTION);
  byType.delete(AGENCY_FOOTER_SECTION);

  normalized.push(...Array.from(byType.values()));
  normalized.push(footer || createDefaultAgencySection(AGENCY_FOOTER_SECTION, normalized.length));

  return normalized.map((section, index) => ({ ...section, order: index }));
};

const AgencyLandingPreview: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      if (root) {
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, []);

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
    if (pathname.startsWith('/agency-landing/')) {
       return pathname.replace('/agency-landing/', '').split('/')[0];
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
        
        const normalizedSections = normalizeAgencySections(config?.sections);
        normalizedSections.forEach(sec => {
          mappedData[sec.type as keyof PageData] = sec.data as any;
          mappedOrder.push(sec.type as PageSection);
          mappedVisibility[sec.type] = sec.enabled;
        });

        if (config?.theme) {
          theme = config.theme as ThemeData;
        } else if (!config) {
          console.log("No agency landing found, using default template");
        }
        
        const mockProject: Project = {
            id: tenantId,
            userId: '',
            name: config?.branding?.logoText || 'Agency Landing',
            status: 'Draft',
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: mappedData as PageData,
            theme: theme,
            componentOrder: mappedOrder,
            sectionVisibility: mappedVisibility as Record<PageSection, boolean>,
            pages: [],
            activePageId: 'home',
            aiAssistantConfig: (config as any)?.aiAssistantConfig,
            businessBlueprint: (config as any)?.businessBlueprint,
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
        <QuimeraLoader size="lg" />
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
    <div className="min-h-screen relative font-body text-q-text overflow-x-hidden antialiased flex flex-col">
      <PageRenderer
        page={{
          id: 'home',
          title: project.name,
          slug: '/',
          isHomePage: true,
          showInNavigation: true,
          navigationOrder: 0,
          sections: project.componentOrder,
          sectionData: project.data,
        }}
        project={project}
        isPreview={false}
      />
    </div>
  );
};

export default AgencyLandingPreview;
