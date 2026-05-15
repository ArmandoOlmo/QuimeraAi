/**
 * Creates MotoForce template via Quimera MCP create_template tool.
 * Sends the Admin-compatible project snapshot in `data` (nested project object).
 *
 * Run: npx tsx scripts/createMotoForceTemplateViaMcp.ts
 */

import {
  motoForcePreset,
  motoForcePageData,
  motoForceTheme,
  motoForceBrandIdentity,
  motoForceComponentOrder,
  motoForceSectionVisibility,
} from '../data/presets/motoForcePreset.js';
import type { PageData, PageSection, SitePage } from '../types';

const MCP_URL = process.env.MCP_URL || 'https://www.quimera.ai/api/mcp';
const MCP_KEY = process.env.MCP_API_KEY || process.env.QUIMERA_MCP_KEY;
const TENANT_ID = process.env.MCP_TENANT_ID || '3914a0b6-1d60-4d10-9f1c-4dc960cc5d1f';

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
        title: stripHtml(localized((pageData.hero?.headline as LocalizedText) || 'MotoForce')).slice(0, 120),
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
    lastUpdated: now,
    createdAt: now,
    data: motoForcePageData,
    theme: motoForceTheme,
    brandIdentity: motoForceBrandIdentity,
    componentOrder: motoForceComponentOrder,
    sectionVisibility: motoForceSectionVisibility,
    pages,
    menus: [],
  };
}

async function mcpCall(name: string, arguments_: Record<string, unknown>, id: number) {
  if (!MCP_KEY) throw new Error('MCP_API_KEY is required.');

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MCP_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name, arguments: arguments_ },
    }),
  });

  const body = await res.json();
  if (body.error) {
    throw new Error(`${name}: ${body.error.message} (${JSON.stringify(body.error.data || {})})`);
  }
  const text = body.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : body.result;
}

async function main() {
  const fullProject = buildFullProjectSnapshot();

  console.log('🏍️ Creating MotoForce via MCP create_template\n');
  console.log('   pages:', fullProject.pages.length);
  console.log('   sectionData keys:', Object.keys(fullProject.pages[0]?.sectionData || {}).length);

  const result = await mcpCall(
    'create_template',
    {
      tenantId: TENANT_ID,
      name: fullProject.name,
      description: localized(motoForcePreset.description),
      category: localized(motoForcePreset.category, 'automotriz'),
      tags: motoForcePreset.tags,
      industries: motoForcePreset.industries,
      thumbnailUrl: motoForcePreset.thumbnailUrl || '',
      // Pass Admin-compatible snapshot — MCP normalizeTemplateArgs unwraps inner PageData
      data: fullProject,
      pages: fullProject.pages,
      theme: fullProject.theme,
      brandIdentity: fullProject.brandIdentity,
      componentOrder: fullProject.componentOrder,
      sectionVisibility: fullProject.sectionVisibility,
      menus: fullProject.menus,
      aiAssistantConfig: {
        enabled: true,
        name: 'Asistente MotoForce',
        language: 'es',
      },
      seoConfig: {
        title: localized(motoForcePreset.name),
        description: localized(motoForcePreset.description),
        keywords: motoForcePreset.tags,
      },
    },
    1,
  );

  console.log('\n✅ Result:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
