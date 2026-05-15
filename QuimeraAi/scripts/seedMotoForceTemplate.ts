/**
 * Seed Script: MotoForce Motorcycle Dealer Template
 *
 * Inserts the MotoForce preset into Supabase projects as status = "Template".
 * Run with:
 *   npx tsx scripts/seedMotoForceTemplate.ts
 */

import { createClient } from '@supabase/supabase-js';
import { motoForcePreset } from '../data/presets/motoForcePreset.js';

type LocalizedText = string | { es?: string; en?: string };

function localized(value: LocalizedText, fallback = ''): string {
  if (typeof value === 'string') return value;
  return value?.es || value?.en || fallback;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function seedMotoForceTemplate(): Promise<{ success: boolean; message: string; templateId?: string }> {
  const supabase = getSupabaseAdmin();
  const templateName = localized(motoForcePreset.name, 'MotoForce - Dealer de Motos');

  try {
    const { data: existing, error: existingError } = await supabase
      .from('projects')
      .select('id')
      .eq('status', 'Template')
      .eq('name', templateName)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return {
        success: false,
        message: `Template "${templateName}" already exists (ID: ${existing.id}).`,
        templateId: existing.id,
      };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: templateName,
        thumbnail_url: motoForcePreset.thumbnailUrl || '',
        status: 'Template',
        pages: [],
        data: motoForcePreset.data,
        theme: motoForcePreset.theme,
        brand_identity: motoForcePreset.brandIdentity,
        component_order: motoForcePreset.componentOrder,
        section_visibility: motoForcePreset.sectionVisibility,
        menus: [],
        ai_assistant_config: {
          enabled: true,
          name: 'MotoForce Assistant',
          language: 'es',
        },
        seo_config: {
          title: templateName,
          description: localized(motoForcePreset.description),
          keywords: motoForcePreset.tags,
        },
        crm_config: {
          template_i18n: {
            name: motoForcePreset.name,
            description: motoForcePreset.description,
            category: motoForcePreset.category,
          },
          industry: motoForcePreset.industries?.[0],
        },
        category: localized(motoForcePreset.category),
        description: localized(motoForcePreset.description),
        tags: motoForcePreset.tags,
        industries: motoForcePreset.industries,
        is_archived: false,
        created_at: now,
        last_updated: now,
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `Template "${templateName}" created successfully in Supabase.`,
      templateId: data.id,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMotoForceTemplate().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}

export default seedMotoForceTemplate;
