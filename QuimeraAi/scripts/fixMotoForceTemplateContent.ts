/**
 * Fixes MotoForce template so Admin/editor loads content correctly.
 * Saves the same shape as TemplateManagement / AI Template Studio:
 *   projects.data = full project snapshot (with nested .data, .theme, .pages, etc.)
 *   projects.pages = pages with sectionData populated
 *
 * Run: npx tsx scripts/fixMotoForceTemplateContent.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  motoForcePreset,
  motoForcePageData,
  motoForceTheme,
  motoForceBrandIdentity,
  motoForceComponentOrder,
  motoForceSectionVisibility,
} from '../data/presets/motoForcePreset.js';
import type { PageData, PageSection, SitePage } from '../types';

const TEMPLATE_ID = process.env.MOTO_TEMPLATE_ID || 'c7fc779b-e94f-409d-ac3d-56c5f1de1098';

type LocalizedText = string | { es?: string; en?: string };

function localized(value: LocalizedText, fallback = ''): string {
  if (typeof value === 'string') return value;
  return value?.es || value?.en || fallback;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim();
}

function buildPagesWithSectionData(
  pageData: PageData,
  componentOrder: PageSection[],
  sectionVisibility: Record<PageSection, boolean>,
): SitePage[] {
  const skip = new Set(['colors', 'typography']);
  const visibleContent = componentOrder.filter(
    (s) => !skip.has(s) && sectionVisibility[s] !== false,
  );

  const homeBody = visibleContent.filter((s) => s !== 'header' && s !== 'footer');
  const homeSections = ['header', ...homeBody, 'footer'].filter(
    (s, i, arr) => arr.indexOf(s) === i,
  ) as PageSection[];

  const sectionData: Partial<PageData> = {};
  for (const section of homeSections) {
    const chunk = (pageData as Record<string, unknown>)[section];
    if (chunk && typeof chunk === 'object') {
      sectionData[section as keyof PageData] = JSON.parse(JSON.stringify(chunk)) as never;
    }
  }

  const heroHeadline = localized((pageData.hero?.headline as LocalizedText) || 'MotoForce');

  const now = new Date().toISOString();
  return [
    {
      id: 'home',
      title: 'Inicio',
      slug: '/',
      type: 'static',
      sections: homeSections,
      sectionData,
      seo: {
        title: stripHtml(heroHeadline).slice(0, 120) || 'MotoForce',
        description: localized((pageData.hero?.subheadline as LocalizedText) || '').slice(0, 200),
      },
      isHomePage: true,
      showInNavigation: true,
      navigationOrder: 0,
      updatedAt: now,
    },
  ];
}

function buildFullProjectSnapshot() {
  const name = localized(motoForcePreset.name, 'MotoForce - Dealer de Motos');
  const pages = buildPagesWithSectionData(
    motoForcePageData,
    motoForceComponentOrder,
    motoForceSectionVisibility,
  );
  const now = new Date().toISOString();

  return {
    name,
    status: 'Template' as const,
    thumbnailUrl: motoForcePreset.thumbnailUrl || '',
    faviconUrl: undefined as string | undefined,
    lastUpdated: now,
    createdAt: now,
    data: motoForcePageData,
    theme: motoForceTheme,
    brandIdentity: motoForceBrandIdentity,
    componentOrder: motoForceComponentOrder,
    sectionVisibility: motoForceSectionVisibility,
    pages,
    menus: [],
    industries: motoForcePreset.industries,
    tags: motoForcePreset.tags,
    description: localized(motoForcePreset.description),
    category: localized(motoForcePreset.category, 'automotriz'),
  };
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function main() {
  const supabase = getSupabaseAdmin();
  const fullProject = buildFullProjectSnapshot();
  const sectionDataKeys = Object.keys(fullProject.pages[0]?.sectionData || {});

  console.log('🔧 Fixing MotoForce template', TEMPLATE_ID);
  console.log('   sectionData sections:', sectionDataKeys.length, '→', sectionDataKeys.join(', '));

  // Same as TemplateManagement.updateTemplate: full project in `data` JSONB column
  const { id: _id, ...dataPayload } = fullProject as typeof fullProject & { id?: string };

  const { error } = await supabase
    .from('projects')
    .update({
      name: fullProject.name,
      description: fullProject.description,
      category: fullProject.category,
      tags: fullProject.tags,
      industries: fullProject.industries,
      thumbnail_url: fullProject.thumbnailUrl || '',
      status: 'Template',
      is_archived: false,
      pages: fullProject.pages,
      data: dataPayload,
      theme: fullProject.theme,
      brand_identity: fullProject.brandIdentity,
      component_order: fullProject.componentOrder,
      section_visibility: fullProject.sectionVisibility,
      menus: fullProject.menus,
      ai_assistant_config: {
        enabled: true,
        name: 'Asistente MotoForce',
        language: 'es',
      },
      seo_config: {
        title: fullProject.name,
        description: fullProject.description,
        keywords: fullProject.tags,
      },
      last_updated: fullProject.lastUpdated,
    })
    .eq('id', TEMPLATE_ID)
    .eq('status', 'Template');

  if (error) throw error;

  // Verify loadGlobalTemplates spread simulation
  const { data: row } = await supabase.from('projects').select('*').eq('id', TEMPLATE_ID).single();
  const spread = { ...(row?.data || {}), id: row?.id, name: row?.name };
  const pageDataKeys = Object.keys(spread.data || {}).filter((k) => !['isDeleted'].includes(k));
  const sectionDataCount = Object.keys(row?.pages?.[0]?.sectionData || {}).length;

  console.log('\n✅ Template fixed');
  console.log('   After spread — project.data keys:', pageDataKeys.length, '(need hero, services, etc.)');
  console.log('   pages[0].sectionData keys:', sectionDataCount);
  console.log('   hero headline:', localized((spread.data as PageData)?.hero?.headline as LocalizedText)?.slice(0, 50));
  console.log('   services items:', (spread.data as PageData)?.services?.items?.length ?? 0);

  if (pageDataKeys.length < 5) {
    console.error('❌ project.data still empty after fix — check data column shape');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
