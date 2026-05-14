import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type DomainAction =
  | "domains-add"
  | "domains-remove"
  | "domains-verifyDNS"
  | "domains-checkSSL"
  | "sync-domain-mapping"
  | "syncDomainMapping";

type VercelProjectDomain = {
  name: string;
  apexName?: string;
  projectId?: string;
  verified?: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason?: string;
  }>;
};

type DomainRecord = {
  type: "A" | "CNAME" | "TXT";
  host: string;
  value: string;
  verified: boolean;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const DEFAULT_VERCEL_PROJECT_ID = "prj_4GK6GRGJfWkQpwBzfj5P2NMiI4Is";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const { action, ...payload } = await req.json() as { action?: DomainAction; [key: string]: unknown };

    switch (action) {
      case "domains-add":
        return jsonResponse(await addDomain(user.id, payload));
      case "domains-remove":
        return jsonResponse(await removeDomain(user.id, payload));
      case "domains-verifyDNS":
      case "domains-checkSSL":
      case "sync-domain-mapping":
      case "syncDomainMapping":
        return jsonResponse(await syncDomainMapping(user.id, payload));
      default:
        throw new Error(`Unknown onboarding action: ${action || "missing"}`);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function addDomain(userId: string, payload: Record<string, unknown>) {
  const domain = normalizeDomain(String(payload.domain || ""));
  const projectId = String(payload.projectId || "");

  assertValidDomain(domain);

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const project = await getAuthorizedProject(userId, projectId);
  const vercelProjectId = resolveVercelProjectId(project);
  const domainsToBind = getDomainsToBind(domain);
  const vercelResults: VercelProjectDomain[] = [];

  for (const domainToBind of domainsToBind) {
    vercelResults.push(await addProjectDomain(vercelProjectId, domainToBind));
  }

  const config = await getDomainConfig(domain);
  const dnsRecords = buildDnsRecords(domain, vercelResults, config);
  const verified = vercelResults.every((result) => result.verified === true);
  const httpsReady = verified ? await checkHttps(domain) : false;
  const sslStatus = httpsReady ? "active" : (verified ? "provisioning" : "pending");
  const status = getDomainStatus({ verified, sslStatus, config });
  const now = new Date().toISOString();

  const cnameTarget = dnsRecords.find((record) => record.type === "CNAME")?.value || null;
  const domainData = {
    domain,
    name: domain,
    projectId,
    project_id: projectId,
    projectUserId: project.user_id || userId,
    project_user_id: project.user_id || userId,
    projectTenantId: project.tenant_id || null,
    project_tenant_id: project.tenant_id || null,
    status,
    sslStatus,
    ssl_status: sslStatus,
    dnsVerified: verified,
    dns_verified: verified,
    provider: "Vercel",
    vercelProjectId,
    vercel_project_id: vercelProjectId,
    vercelDomains: vercelResults,
    vercelConfig: config,
    dnsRecords,
    updatedAt: now,
  };

  const { error } = await supabase
    .from("custom_domains")
    .upsert({
      domain,
      domain_name: domain,
      project_id: projectId,
      user_id: userId,
      status,
      ssl_status: sslStatus,
      dns_verified: verified,
      cloud_run_target: cnameTarget,
      data: domainData,
      updated_at: now,
    }, { onConflict: "domain_name" });

  if (error) {
    throw new Error(`Could not save domain mapping: ${error.message}`);
  }

  return {
    success: true,
    domain,
    projectId,
    projectUserId: project.user_id || userId,
    projectTenantId: project.tenant_id || null,
    status,
    sslStatus,
    dnsVerified: verified,
    dnsRecords,
    verification: vercelResults.flatMap((result) => result.verification || []),
    vercelProjectId,
    checkedAt: now,
  };
}

async function removeDomain(userId: string, payload: Record<string, unknown>) {
  const domain = normalizeDomain(String(payload.domain || ""));
  assertValidDomain(domain);

  const domainRow = await getAuthorizedDomain(userId, domain);
  const projectId = domainRow.project_id || domainRow.data?.projectId || domainRow.data?.project_id;
  const project = projectId ? await getAuthorizedProject(userId, projectId) : null;
  const vercelProjectId = resolveVercelProjectId(project, domainRow.data);

  for (const domainToRemove of getDomainsToBind(domain)) {
    await removeProjectDomain(vercelProjectId, domainToRemove);
  }

  const { error } = await supabase
    .from("custom_domains")
    .delete()
    .or(`domain_name.eq.${domain},domain.eq.${domain}`);

  if (error) {
    throw new Error(`Could not delete domain mapping: ${error.message}`);
  }

  return { success: true, domain };
}

async function verifyDomain(userId: string, payload: Record<string, unknown>) {
  const domain = normalizeDomain(String(payload.domain || ""));
  assertValidDomain(domain);

  const domainRow = await getAuthorizedDomain(userId, domain);
  const projectId = domainRow.project_id || domainRow.data?.projectId || domainRow.data?.project_id;
  const project = projectId ? await getAuthorizedProject(userId, projectId) : null;
  const vercelProjectId = resolveVercelProjectId(project, domainRow.data);
  const vercelResults: VercelProjectDomain[] = [];

  for (const domainToVerify of getDomainsToBind(domain)) {
    vercelResults.push(await verifyProjectDomain(vercelProjectId, domainToVerify));
  }

  const verified = vercelResults.every((result) => result.verified === true);
  const dnsRecords = buildDnsRecords(domain, vercelResults);
  const now = new Date().toISOString();
  const nextData = {
    ...(domainRow.data || {}),
    status: verified ? "active" : "pending",
    sslStatus: verified ? "active" : "provisioning",
    ssl_status: verified ? "active" : "provisioning",
    dnsVerified: verified,
    dns_verified: verified,
    dnsRecords,
    vercelDomains: vercelResults,
    updatedAt: now,
  };

  const { error } = await supabase
    .from("custom_domains")
    .update({
      status: nextData.status,
      ssl_status: nextData.sslStatus,
      dns_verified: verified,
      data: nextData,
      updated_at: now,
    })
    .or(`domain_name.eq.${domain},domain.eq.${domain}`);

  if (error) {
    throw new Error(`Could not update domain verification: ${error.message}`);
  }

  return {
    success: true,
    domain,
    verified,
    status: nextData.status,
    sslStatus: nextData.sslStatus,
    records: dnsRecords.map((record) => ({
      type: record.type,
      expected: record.value,
      found: [],
      verified: record.verified,
    })),
    dnsRecords,
    verification: vercelResults.flatMap((result) => result.verification || []),
    checkedAt: now,
  };
}

async function syncDomainMapping(userId: string, payload: Record<string, unknown>) {
  const domain = normalizeDomain(String(payload.domain || ""));
  assertValidDomain(domain);

  const domainRow = await getAuthorizedDomain(userId, domain);
  const projectId = domainRow.project_id || domainRow.data?.projectId || domainRow.data?.project_id;
  
  if (!projectId) throw new Error("Project ID not found for this domain");

  const project = await getAuthorizedProject(userId, projectId);
  const vercelProjectId = resolveVercelProjectId(project, domainRow.data);

  // 1. Get status from Vercel Project Domain
  const vercelResults: VercelProjectDomain[] = [];
  const domainsToCheck = getDomainsToBind(domain);
  
  for (const d of domainsToCheck) {
    try {
      vercelResults.push(await getProjectDomain(vercelProjectId, d));
    } catch (e) {
      console.warn(`Domain ${d} not found in Vercel project ${vercelProjectId}`);
      vercelResults.push(await addProjectDomain(vercelProjectId, d));
    }
  }

  // 2. Get Domain Config from Vercel (for misconfigurations)
  const config = await getDomainConfig(domain);

  // 3. DNS Verification status
  const verified = vercelResults.length > 0 && vercelResults.every(r => r.verified === true);
  
  // 4. SSL Health Check
  let sslStatus: "pending" | "provisioning" | "active" = "pending";
  if (verified) {
    const isHttpsUp = await checkHttps(domain);
    sslStatus = isHttpsUp ? "active" : "provisioning";
  }

  const status = getDomainStatus({ verified, sslStatus, config });
  const dnsRecords = buildDnsRecords(domain, vercelResults, config);
  
  const now = new Date().toISOString();
  const nextData = {
    ...domainRow.data,
    domain,
    domain_name: domain,
    projectId,
    project_id: projectId,
    vercelProjectId,
    vercel_project_id: vercelProjectId,
    status,
    sslStatus,
    ssl_status: sslStatus,
    dnsVerified: verified,
    dns_verified: verified,
    dnsRecords,
    vercelConfig: config,
    updatedAt: now,
  };

  const { error: updateError } = await supabase
    .from("custom_domains")
    .update({
      status,
      project_id: projectId,
      cloud_run_target: dnsRecords.find((record) => record.type === "CNAME")?.value || domainRow.cloud_run_target || null,
      ssl_status: sslStatus,
      dns_verified: verified,
      data: nextData,
      updated_at: now
    })
    .eq("domain_name", domainRow.domain_name || domain);

  if (updateError) {
    throw new Error(`Could not update domain mapping: ${updateError.message}`);
  }

  return {
    success: true,
    domain,
    verified,
    status,
    sslStatus,
    dnsVerified: verified,
    records: dnsRecords.map((record) => ({
      type: record.type,
      expected: record.value,
      found: [],
      verified: record.verified,
    })),
    dnsRecords,
    config,
    checkedAt: now,
  };
}

async function checkHttps(domain: string): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
    });
    
    clearTimeout(id);
    if (response.status === 405) {
      return await checkHttpsWithGet(domain);
    }
    return response.ok || response.status < 400;
  } catch (e) {
    clearTimeout(id);
    return await checkHttpsWithGet(domain);
  }
}

async function checkHttpsWithGet(domain: string): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://${domain}`, {
      method: "GET",
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(id);
    return response.ok || response.status < 400;
  } catch (_e) {
    clearTimeout(id);
    return false;
  }
}

async function getAuthorizedProject(userId: string, projectId: string) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    throw new Error("Project not found");
  }

  if (project.user_id === userId) {
    return project;
  }

  if (project.tenant_id) {
    const { data: member, error: memberError } = await supabase
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", project.tenant_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!memberError && member) {
      return project;
    }
  }

  throw new Error("You do not have access to this project");
}

async function getAuthorizedDomain(userId: string, domain: string) {
  const { data: domainRow, error } = await supabase
    .from("custom_domains")
    .select("*")
    .or(`domain_name.eq.${domain},domain.eq.${domain}`)
    .maybeSingle();

  if (error || !domainRow) {
    throw new Error("Domain not found");
  }

  if (domainRow.user_id === userId) {
    return domainRow;
  }

  const projectId = domainRow.project_id || domainRow.data?.projectId || domainRow.data?.project_id;
  if (projectId) {
    await getAuthorizedProject(userId, projectId);
    return domainRow;
  }

  throw new Error("You do not have access to this domain");
}

function resolveVercelProjectId(project?: Record<string, unknown> | null, domainData?: Record<string, unknown>) {
  const projectData = project?.data as Record<string, unknown> | undefined;
  const deployment = projectData?.deployment as Record<string, unknown> | undefined;
  const vercelProjectId =
    (project?.vercel_project_id as string | undefined) ||
    (projectData?.vercelProjectId as string | undefined) ||
    (projectData?.vercel_project_id as string | undefined) ||
    (deployment?.vercelProjectId as string | undefined) ||
    (domainData?.vercelProjectId as string | undefined) ||
    Deno.env.get("VERCEL_PROJECT_ID") ||
    Deno.env.get("VERCEL_PROJECT_NAME") ||
    DEFAULT_VERCEL_PROJECT_ID;

  if (!vercelProjectId) {
    throw new Error("VERCEL_PROJECT_ID is not configured");
  }

  return vercelProjectId;
}

async function addProjectDomain(projectId: string, domain: string): Promise<VercelProjectDomain> {
  const response = await vercelFetch(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });

  if (response.ok) {
    return await response.json();
  }

  const errorData = await readJson(response);
  const code = errorData?.error?.code;
  const message = errorData?.error?.message || response.statusText;

  if (response.status === 400 && ["domain_already_assigned", "domain_already_exists"].includes(code)) {
    return await getProjectDomain(projectId, domain);
  }

  throw new Error(`Vercel could not add ${domain}: ${message}`);
}

async function getProjectDomain(projectId: string, domain: string): Promise<VercelProjectDomain> {
  const response = await vercelFetch(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`, {
    method: "GET",
  });

  if (response.ok) {
    return await response.json();
  }

  const errorData = await readJson(response);
  throw new Error(`Vercel could not read ${domain}: ${errorData?.error?.message || response.statusText}`);
}

async function verifyProjectDomain(projectId: string, domain: string): Promise<VercelProjectDomain> {
  const response = await vercelFetch(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify`, {
    method: "POST",
  });

  if (response.ok) {
    return await response.json();
  }

  const errorData = await readJson(response);
  const code = errorData?.error?.code;
  if (response.status === 400 && code === "domain_already_verified") {
    return await getProjectDomain(projectId, domain);
  }

  return {
    name: domain,
    verified: false,
    verification: errorData?.error?.verification || [],
  };
}

async function removeProjectDomain(projectId: string, domain: string) {
  const response = await vercelFetch(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`, {
    method: "DELETE",
  });

  if (response.ok || response.status === 404) {
    return;
  }

  const errorData = await readJson(response);
  throw new Error(`Vercel could not remove ${domain}: ${errorData?.error?.message || response.statusText}`);
}

async function vercelFetch(path: string, init: RequestInit) {
  const token = Deno.env.get("VERCEL_TOKEN");
  if (!token) {
    throw new Error("VERCEL_TOKEN is not configured");
  }

  const url = new URL(`https://api.vercel.com${path}`);
  const teamId = Deno.env.get("VERCEL_TEAM_ID");
  const slug = Deno.env.get("VERCEL_TEAM_SLUG");

  if (teamId) {
    url.searchParams.set("teamId", teamId);
  } else if (slug) {
    url.searchParams.set("slug", slug);
  }

  return fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function getDomainConfig(domain: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await vercelFetch(`/v6/domains/${encodeURIComponent(domain)}/config`, { method: "GET" });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.warn(`Could not fetch Vercel domain config for ${domain}:`, error);
    return null;
  }
}

function getDomainStatus(args: {
  verified: boolean;
  sslStatus: "pending" | "provisioning" | "active";
  config: Record<string, unknown> | null;
}): "active" | "pending" | "ssl_pending" | "error" {
  if (isDomainMisconfigured(args.config)) return "error";
  if (!args.verified) return "pending";
  return args.sslStatus === "active" ? "active" : "ssl_pending";
}

function isDomainMisconfigured(config: Record<string, unknown> | null): boolean {
  if (!config) return false;
  const value = config as any;
  return Boolean(
    value.misconfigured === true ||
    value.conflict === true ||
    (Array.isArray(value.conflicts) && value.conflicts.length > 0) ||
    (Array.isArray(value.errors) && value.errors.length > 0)
  );
}

function buildDnsRecords(
  domain: string,
  vercelResults: VercelProjectDomain[],
  config?: Record<string, unknown> | null,
): DomainRecord[] {
  const recordsFromConfig = extractDnsRecordsFromConfig(domain, config);
  const records: DomainRecord[] = recordsFromConfig.length > 0 ? recordsFromConfig : [
    {
      type: "A",
      host: "@",
      value: "76.76.21.21",
      verified: false,
      fallback: true,
    },
  ] as unknown as DomainRecord[];

  const wwwDomain = `www.${domain}`;
  if (!records.some((record) => record.host === "www") && vercelResults.some((result) => result.name === wwwDomain)) {
    records.push({
      type: "CNAME",
      host: "www",
      value: "cname.vercel-dns.com",
      verified: false,
      fallback: true,
    } as unknown as DomainRecord);
  }

  for (const record of records) {
    if (record.type === "A" && record.host === "@") {
      record.verified = vercelResults.some((result) => result.name === domain && result.verified === true);
    } else if (record.type === "CNAME" && record.host === "www") {
      record.verified = vercelResults.some((result) => result.name === wwwDomain && result.verified === true);
    }
  }

  for (const challenge of vercelResults.flatMap((result) => result.verification || [])) {
    if (challenge.type.toUpperCase() === "TXT") {
      records.push({
        type: "TXT",
        host: toRelativeHost(challenge.domain, domain),
        value: challenge.value,
        verified: false,
      });
    }
  }

  return records;
}

function extractDnsRecordsFromConfig(domain: string, config?: Record<string, unknown> | null): DomainRecord[] {
  if (!config) return [];

  const candidates = [
    (config as any).dnsRecords,
    (config as any).recommendedDnsRecords,
    (config as any).recommendedRecords,
    (config as any).records,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    const records = candidate
      .map((item: any) => toDomainRecord(item, domain))
      .filter((record: DomainRecord | null): record is DomainRecord => Boolean(record));

    if (records.length > 0) return records;
  }

  return [];
}

function toDomainRecord(item: any, domain: string): DomainRecord | null {
  const type = String(item?.type || item?.recordType || "").toUpperCase();
  const value = item?.value || item?.target || item?.pointsTo;
  if (!["A", "CNAME", "TXT"].includes(type) || !value) return null;

  const rawHost = item.host || item.name || item.domain || "@";
  return {
    type: type as "A" | "CNAME" | "TXT",
    host: toRelativeHost(String(rawHost), domain),
    value: String(value),
    verified: Boolean(item.verified),
  };
}

function getDomainsToBind(domain: string) {
  return isLikelyApexDomain(domain) ? [domain, `www.${domain}`] : [domain];
}

function isLikelyApexDomain(domain: string) {
  const labels = domain.split(".");
  if (labels.length === 2) return true;

  const secondLevelTlds = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);
  return labels.length === 3 && labels[2].length === 2 && secondLevelTlds.has(labels[1]);
}

function toRelativeHost(host: string, domain: string) {
  const normalized = normalizeDomain(host);
  if (normalized === domain) return "@";
  return normalized.endsWith(`.${domain}`) ? normalized.slice(0, -domain.length - 1) : normalized;
}

function normalizeDomain(domain: string) {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "")
    .replace(/\/.*$/, "");
}

function assertValidDomain(domain: string) {
  if (!/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain) || domain.length > 253) {
    throw new Error("Invalid domain format");
  }
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
