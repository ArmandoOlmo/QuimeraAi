import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateContent, generateImage, type AiGatewayInput } from './aiGateway.js';
import type { McpAuthContext } from './mcpAuth.js';

function buildJobAuth(job: Record<string, any>): McpAuthContext {
  const metadata = job.metadata || {};
  return {
    apiKeyId: metadata.apiKeyId || 'mcp-job-runner',
    keyName: metadata.keyName || 'MCP Job Runner',
    tenantId: job.tenant_id,
    projectId: job.project_id || undefined,
    userId: metadata.userId || undefined,
    scopes: metadata.scopes || ['*'],
    agentId: job.agent_id || metadata.agentId || 'mcp-job-runner',
  };
}

function generationInput(
  args: Record<string, any>,
  auth: McpAuthContext,
  sourceTool: string,
  overrides: Record<string, any> = {},
): AiGatewayInput {
  return {
    tenantId: auth.tenantId,
    projectId: args.projectId || auth.projectId,
    agentId: args.agentId || auth.agentId,
    purpose: args.purpose || sourceTool,
    brief: args.brief || args.prompt || '',
    language: args.language || 'es',
    brandContext: args.brandContext,
    targetAudience: args.targetAudience,
    modelPreset: args.modelPreset,
    saveTo: args.saveTo,
    section: args.section,
    pageId: args.pageId,
    contentType: args.contentType,
    referenceImages: args.referenceImages,
    imageOptions: args.imageOptions,
    metadata: {
      ...(args.metadata || {}),
      sourceTool,
    },
    ...overrides,
  };
}

async function getProjectForTenant(supabase: SupabaseClient, projectId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Project not found.');
  if (data.tenant_id !== tenantId) throw new Error('Project does not belong to this tenant.');
  return data;
}

async function updateProjectData(supabase: SupabaseClient, projectId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('projects')
    .update({ ...updates, last_updated: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw error;
}

async function updateJob(
  supabase: SupabaseClient,
  jobId: string,
  updates: Record<string, any>,
): Promise<void> {
  await supabase
    .from('mcp_generation_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

async function processFullProjectJob(supabase: SupabaseClient, job: Record<string, any>) {
  const auth = buildJobAuth(job);
  const args = job.input || {};
  const projectId = job.project_id || args.projectId;
  if (!projectId) throw new Error('projectId is required.');

  await getProjectForTenant(supabase, projectId, job.tenant_id);
  await updateJob(supabase, job.id, {
    output: { progress: 10, steps: ['project_validated'] },
  });

  const pageJson = await generateContent(
    supabase,
    auth,
    generationInput(args, auth, 'ai_generate_full_project:page_json', {
      tenantId: job.tenant_id,
      projectId,
      modelPreset: args.modelPreset || 'structured-json',
    }),
    'page-json',
  );

  const pagesUpdated: string[] = [];
  if (args.apply !== false) {
    const generated = pageJson.content || {};
    const updates: Record<string, any> = {};

    if (generated.page) {
      const project = await getProjectForTenant(supabase, projectId, job.tenant_id);
      const pages = Array.isArray(project.pages) ? [...project.pages] : [];
      const pageId = generated.page.id || args.pageId || randomUUID();
      const page = {
        isHomePage: pages.length === 0 || generated.page.slug === '/',
        showInNavigation: true,
        ...generated.page,
        id: pageId,
        updatedAt: new Date().toISOString(),
      };
      const existingIndex = pages.findIndex((item: any) => item.id === pageId || item.slug === page.slug);
      if (existingIndex >= 0) pages[existingIndex] = { ...pages[existingIndex], ...page };
      else pages.push(page);
      updates.pages = pages;
      pagesUpdated.push(pageId);
    }

    if (generated.legacyData && typeof generated.legacyData === 'object') updates.data = generated.legacyData;
    if (Array.isArray(generated.componentOrder)) updates.component_order = generated.componentOrder;
    if (generated.sectionVisibility && typeof generated.sectionVisibility === 'object') {
      updates.section_visibility = generated.sectionVisibility;
    }

    if (Object.keys(updates).length > 0) await updateProjectData(supabase, projectId, updates);
  }

  await updateJob(supabase, job.id, {
    output: { progress: 60, pageJson, pagesUpdated, steps: ['project_validated', 'page_json_generated'] },
  });

  const assetResults = [];
  const failedItems = [];
  const assets = Array.isArray(args.assets) ? args.assets.slice(0, 8) : [];

  for (const asset of assets) {
    try {
      const result = await generateImage(
        supabase,
        auth,
        generationInput({ ...args, ...asset }, auth, 'ai_generate_full_project:asset', {
          tenantId: job.tenant_id,
          projectId,
          saveTo: asset.saveTo || 'project',
          purpose: asset.purpose || `${asset.section || 'project'} asset`,
          brief: asset.brief || asset.prompt || args.brief,
          imageOptions: { ...(args.imageOptions || {}), ...(asset.imageOptions || {}) },
        }),
      );
      assetResults.push({ request: asset, result });
    } catch (error: any) {
      failedItems.push({ request: asset, error: error.message });
    }
  }

  return {
    status: failedItems.length ? 'partial_failed' : 'completed',
    output: {
      progress: 100,
      pageJson,
      assetResults,
      failedItems,
      pagesUpdated,
      steps: ['project_validated', 'page_json_generated', 'assets_generated'],
    },
  };
}

export async function processMcpGenerationJobs(
  supabase: SupabaseClient,
  limit = 3,
): Promise<{ processed: number; completed: string[]; failed: Array<{ jobId: string; error: string }> }> {
  const { data: jobs, error } = await supabase
    .from('mcp_generation_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const completed: string[] = [];
  const failed: Array<{ jobId: string; error: string }> = [];

  for (const job of jobs || []) {
    await updateJob(supabase, job.id, {
      status: 'running',
      started_at: job.started_at || new Date().toISOString(),
      output: { progress: 1, steps: ['queued'] },
    });

    try {
      const result = await processFullProjectJob(supabase, job);
      await updateJob(supabase, job.id, {
        status: result.status,
        output: result.output,
        completed_at: new Date().toISOString(),
      });
      completed.push(job.id);
    } catch (error: any) {
      await updateJob(supabase, job.id, {
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      });
      failed.push({ jobId: job.id, error: error.message });
    }
  }

  return { processed: completed.length + failed.length, completed, failed };
}
