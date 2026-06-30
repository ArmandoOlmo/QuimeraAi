import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { analyzeWebsiteUrl } from "../_shared/analyzeWebsite.ts";
import { EdgeAccessError, requireServiceAccess } from "../_shared/access.ts";
import { getCanonicalPlanLimits, normalizePlanId } from "../../../services/billing/planCatalog.ts";

type OnboardingAction =
  | "autoProvision"
  | "transferProject"
  | "respondClientApproval"
  | "analyzeWebsite"
  | "domains-add"
  | "domains-remove"
  | "domains-verifyDNS"
  | "domains-checkSSL"
  | "domains-searchSuggestions"
  | "domains-checkAvailability"
  | "domains-getPricing"
  | "domains-createDomainCheckoutSession"
  | "domains-purchase"
  | "domains-checkDomainOrderStatus"
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

    const { action, ...payload } = await req.json() as { action?: OnboardingAction; [key: string]: unknown };

    switch (action) {
      case "analyzeWebsite":
        return jsonResponse(await analyzeWebsiteUrl(String(payload.url || ""), user.id));
      case "autoProvision":
        return jsonResponse(await autoProvisionAgencyClient(req, user.id, payload));
      case "transferProject":
        return jsonResponse(await transferAgencyProject(req, user.id, payload));
      case "respondClientApproval":
        return jsonResponse(await respondClientApproval(req, user.id, payload));
      case "domains-add":
        return jsonResponse(await addDomain(req, user.id, payload));
      case "domains-remove":
        return jsonResponse(await removeDomain(req, user.id, payload));
      case "domains-searchSuggestions":
        return jsonResponse(await searchDomainSuggestions(payload));
      case "domains-checkAvailability":
        return jsonResponse(await checkDomainAvailability(payload));
      case "domains-getPricing":
        return jsonResponse(await getDomainRegistrarPricing());
      case "domains-createDomainCheckoutSession":
      case "domains-purchase":
        return jsonResponse(getDomainPurchaseUnavailableResponse());
      case "domains-checkDomainOrderStatus":
        return jsonResponse({
          status: "failed",
          domainName: String(payload.domainName || ""),
          error: getDomainPurchaseUnavailableMessage(),
        });
      case "domains-verifyDNS":
      case "domains-checkSSL":
      case "sync-domain-mapping":
      case "syncDomainMapping":
        return jsonResponse(await syncDomainMapping(req, user.id, payload));
      default:
        throw new Error(`Unknown onboarding action: ${action || "missing"}`);
    }
  } catch (error) {
    if (error instanceof EdgeAccessError) {
      return new Response(
        JSON.stringify({ error: error.message, decision: error.decision }),
        { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

type InitialClientUser = {
  email?: string;
  name?: string;
  role?: string;
};

const AGENCY_ENGINE_FOUNDATION_MODULES = [
  "ai-business-blueprint",
  "design-system",
  "website-builder",
  "analytics-engine",
] as const;

const AGENCY_ENGINE_CLIENT_360_MODULES = [
  { id: "businessBlueprint", canonicalSystem: "businessBlueprint", ownerModuleId: "ai-business-blueprint" },
  { id: "website-builder", canonicalSystem: "websiteBuilder", ownerModuleId: "website-builder" },
  { id: "storefront-builder", canonicalSystem: "storefrontBuilder", ownerModuleId: "storefront-builder" },
  { id: "ecommerce", canonicalSystem: "ecommerce", ownerModuleId: "ecommerce-engine" },
  { id: "crm-leads", canonicalSystem: "crm", ownerModuleId: "crm-leads" },
  { id: "email-marketing", canonicalSystem: "emailMarketing", ownerModuleId: "email-marketing" },
  { id: "appointments", canonicalSystem: "appointments", ownerModuleId: "appointments-engine" },
  { id: "restaurants", canonicalSystem: "restaurants", ownerModuleId: "restaurant-engine" },
  { id: "realty", canonicalSystem: "realEstate", ownerModuleId: "real-estate-engine" },
  { id: "bio-page", canonicalSystem: "bioPage", ownerModuleId: "bio-page-engine" },
  { id: "chatcore", canonicalSystem: "chatbot", ownerModuleId: "chatbot-engine" },
  { id: "media-ai", canonicalSystem: "media", ownerModuleId: "media-assets" },
  { id: "finance", canonicalSystem: "finance", ownerModuleId: "finance" },
  { id: "analytics", canonicalSystem: "analytics", ownerModuleId: "analytics-engine" },
] as const;

const CLIENT_ADMIN_PERMISSIONS = {
  canManageProjects: true,
  canManageLeads: true,
  canManageCMS: true,
  canManageEcommerce: true,
  canManageRealEstate: true,
  canManageFiles: true,
  canManageDomains: false,
  canInviteMembers: false,
  canRemoveMembers: false,
  canViewAnalytics: true,
  canManageBilling: false,
  canManageSettings: false,
  canExportData: false,
};

const AGENCY_OWNER_PERMISSIONS = {
  canManageProjects: true,
  canManageLeads: true,
  canManageCMS: true,
  canManageEcommerce: true,
  canManageRealEstate: true,
  canManageFiles: true,
  canManageDomains: true,
  canInviteMembers: true,
  canRemoveMembers: true,
  canViewAnalytics: true,
  canManageBilling: true,
  canManageSettings: true,
  canExportData: true,
};

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || `client-${Date.now()}`;
}

function randomToken(prefix = "invite_") {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeFiniteLimits(raw: unknown, fallbackPlanId = "individual") {
  const fallback = getCanonicalPlanLimits(normalizePlanId(fallbackPlanId));
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const next: Record<string, unknown> = { ...fallback };

  for (const key of Object.keys(fallback)) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      next[key] = value;
    }
  }

  next.maxProjects = Math.max(1, Number(next.maxProjects || 1));
  next.maxUsers = Math.max(1, Number(next.maxUsers || 1));
  next.hardLimit = true;
  return next;
}

function resolveAgencyClientEffectivePlanId(agencyTenant: Record<string, unknown>, payload: Record<string, unknown>): string {
  const selectedServicePlanId = String(payload.selectedPlanId || "").trim();
  const candidates = [
    payload.clientEffectivePlanId,
    payload.effectivePlanId,
    payload.subscriptionPlan,
    payload.subscription_plan,
    payload.planId,
    payload.plan,
    agencyTenant.subscription_plan,
    "individual",
  ];

  for (const candidate of candidates) {
    const rawPlanId = String(candidate || "").trim();
    if (!rawPlanId) continue;
    if (rawPlanId === "agency_client") {
      throw new Error("agency_client is a tenant type, not a subscription plan");
    }
    if (selectedServicePlanId && rawPlanId === selectedServicePlanId) continue;

    const normalized = normalizePlanId(rawPlanId);
    if (normalized === "free" && rawPlanId !== "free") continue;
    return normalized;
  }

  return "individual";
}

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "PGRST205";
}

function cloneJson<T>(value: T, fallback: T): T {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return fallback;
  }
}

function cleanForInsert<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

const AGENCY_TRANSFER_SNAPSHOT_LIMIT = 50;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getProjectDataVersionHistory(projectData: Record<string, unknown>) {
  const history = asRecord(projectData.versionHistory);
  const snapshots = Array.isArray(history.blueprintSnapshots)
    ? history.blueprintSnapshots.filter(Boolean)
    : [];
  return {
    ...history,
    blueprintSnapshots: snapshots,
  };
}

function stripVersionHistoryFromProjectData(projectData: Record<string, unknown>) {
  const copy = cloneJson<Record<string, unknown>>(projectData, {});
  delete copy.versionHistory;
  delete copy.blueprintSnapshots;
  return copy;
}

function createAgencyTransferSnapshot(input: {
  sourceProject: Record<string, unknown>;
  sourceData: Record<string, unknown>;
  sourceBlueprint: Record<string, unknown> | null;
  targetProjectId: string;
  targetTenantId: string;
  agencyTenantId: string;
  userId: string;
  now: string;
  transferMetadata: Record<string, unknown>;
  projectName: string;
}) {
  const title = "Agency transfer checkpoint";
  const description = "Captured the source project before Agency Project Transfer.";
  return cleanForInsert({
    id: `snapshot_${crypto.randomUUID()}`,
    projectId: input.targetProjectId,
    tenantId: input.targetTenantId,
    blueprintVersion: typeof input.sourceBlueprint?.blueprintVersion === "string"
      ? input.sourceBlueprint.blueprintVersion
      : undefined,
    createdAt: input.now,
    createdBy: input.userId,
    source: "agency_transfer",
    scope: "project",
    changeType: "transfer_checkpoint",
    title,
    description,
    label: title,
    summary: description,
    metadata: cleanForInsert({
      ...input.transferMetadata,
      projectName: input.projectName,
      sourceProjectName: input.sourceProject.name || null,
      agencyTenantId: input.agencyTenantId,
      tenantId: input.targetTenantId,
      createdBy: input.userId,
      userId: input.userId,
      module: "agency-project-transfer",
      actionType: "agency_project_transfer_copy",
      source: "agency-project-transfer",
      copiedAsDraft: true,
      noAutoPublish: true,
      noRuntimeActivated: true,
    }),
    snapshotData: stripVersionHistoryFromProjectData(input.sourceData),
    ...(input.sourceBlueprint ? { businessBlueprint: input.sourceBlueprint } : {}),
  });
}

function appendAgencyTransferSnapshot(
  projectData: Record<string, unknown>,
  snapshot: Record<string, unknown> & { id: string; createdAt: string },
) {
  const history = getProjectDataVersionHistory(projectData);
  const previousSnapshots = Array.isArray(history.blueprintSnapshots) ? history.blueprintSnapshots : [];
  return {
    ...projectData,
    versionHistory: {
      ...history,
      blueprintSnapshots: [
        snapshot,
        ...previousSnapshots.filter((item) => asRecord(item).id !== snapshot.id),
      ].slice(0, AGENCY_TRANSFER_SNAPSHOT_LIMIT),
      lastSnapshotAt: snapshot.createdAt,
    },
  };
}

function selectedModules(payload: Record<string, unknown>) {
  const enabledFeatures = Array.isArray(payload.enabledFeatures)
    ? payload.enabledFeatures.map((feature) => String(feature).trim()).filter(Boolean)
    : [];
  const modules = new Set<string>(AGENCY_ENGINE_FOUNDATION_MODULES);

  if (enabledFeatures.includes("cms") || payload.generateWebsite !== false) modules.add("cms-engine");
  if (enabledFeatures.includes("leads")) modules.add("crm-leads");
  if (enabledFeatures.includes("ecommerce") || payload.generateEcommerce) {
    modules.add("ecommerce-engine");
    modules.add("storefront-builder");
  }
  if (enabledFeatures.includes("chatbot") || payload.generateChatbot) modules.add("chatbot-engine");
  if (enabledFeatures.includes("email") || payload.generateEmailFlows) modules.add("email-marketing");
  if (enabledFeatures.includes("analytics")) modules.add("analytics-engine");
  if (payload.generateAppointments) modules.add("appointments-engine");
  if (payload.generateRestaurantModule) modules.add("restaurant-engine");
  if (payload.generateRealtyModule) modules.add("real-estate-engine");
  if (payload.generateBioPage) modules.add("bio-page-engine");
  if (payload.generateMediaAssets) modules.add("media-assets");
  if (
    enabledFeatures.includes("finance") ||
    Boolean(payload.generateFinance) ||
    Boolean(payload.setupBilling) ||
    Boolean(payload.generateEcommerce) ||
    Number(payload.monthlyPrice || 0) > 0
  ) {
    modules.add("finance");
  }

  return Array.from(modules);
}

function buildAgencyOperatingSystem(input: {
  modules: string[];
  payload: Record<string, unknown>;
  now: string;
}) {
  const moduleSet = new Set(input.modules);
  const client360Modules = AGENCY_ENGINE_CLIENT_360_MODULES.map((module) => {
    const enabled = moduleSet.has(module.ownerModuleId);

    return {
      id: module.id,
      canonicalSystem: module.canonicalSystem,
      ownerModuleId: module.ownerModuleId,
      enabled,
      status: enabled ? "draft" : "disabled",
      needsReview: enabled,
      noRuntimeActivated: true,
      noAutoPublish: true,
      source: "agency-engine",
    };
  });
  const enabledClient360ModuleIds = client360Modules
    .filter((module) => module.enabled)
    .map((module) => module.id);

  return {
    source: "agency-engine",
    status: "needs_review",
    generatedByAI: true,
    generatedAt: input.now,
    updatedAt: input.now,
    selectedPlanId: input.payload.selectedPlanId || null,
    selectedPlanName: input.payload.selectedPlanName || null,
    foundationModuleIds: Array.from(AGENCY_ENGINE_FOUNDATION_MODULES),
    generatedModuleIds: input.modules,
    client360ModuleIds: AGENCY_ENGINE_CLIENT_360_MODULES.map((module) => module.id),
    enabledClient360ModuleIds,
    client360Modules,
    draftOnly: true,
    needsReview: true,
    noRuntimeActivated: true,
    noAutoPublish: true,
    serviceAccessRequired: true,
    activationPolicy: {
      serviceAccessEngine: true,
      requiresAgencyReview: true,
      requiresClientReview: true,
      publishRequiresApproval: true,
      modulesStartAsDrafts: true,
    },
    commandCenter: {
      moduleId: "agency-command-center",
      status: "draft",
      surfacedMetrics: ["client_health", "module_readiness", "billing_status", "activity", "reports"],
      needsReview: true,
    },
    client360: {
      moduleId: "agency-client-360",
      status: "draft",
      enabledModuleIds: enabledClient360ModuleIds,
      needsReview: true,
    },
    clientPortal: {
      moduleId: "agency-client-portal",
      status: "draft",
      approvalQueueEnabled: true,
      reportInboxEnabled: true,
      needsReview: true,
    },
  };
}

function readiness(isReady: boolean, warnings: string[] = [], blockers: string[] = []) {
  return { isReady, blockers, warnings };
}

function uniqueStrings(values: unknown[], fallback: string[] = []) {
  const normalized = values
    .map((value) => typeof value === "string" ? value.trim() : String(value || "").trim())
    .filter(Boolean);

  const source = normalized.length > 0 ? normalized : fallback;
  return Array.from(new Set(source));
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildDraftState(
  now: string,
  enabled: boolean,
  sourceMap: Record<string, string | string[]> = {},
  status = "draft",
) {
  return {
    enabled,
    status: enabled ? status : "disabled",
    needsReview: enabled,
    readiness: readiness(
      false,
      enabled ? ["Draft generated by Agency Engine; review is required before activation."] : [],
      enabled ? ["Review required before runtime activation or public publishing."] : [],
    ),
    metadata: {
      generatedBy: "ai",
      generatedByAI: true,
      userModified: false,
      lockedFromRegeneration: false,
      generatedAt: now,
      generationSource: "agency-engine",
    },
    sourceMap,
  };
}

function syncModuleState(enabled: boolean) {
  return {
    status: enabled ? "previewed" : "skipped",
    refs: [],
    drafts: [],
  };
}

function toPublicSlug(value: string) {
  return generateSlug(value).slice(0, 48) || "client";
}

function normalizeServiceDrafts(payload: Record<string, unknown>, businessName: string) {
  const rawServices = Array.isArray(payload.services) ? payload.services : [];
  const services = rawServices
    .map((item, index) => {
      if (typeof item === "string" && item.trim()) {
        return { name: item.trim(), description: "" };
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const name = cleanText(record.name || record.title, `Service ${index + 1}`);
        const description = cleanText(record.description || record.summary, "");
        return { name, description };
      }

      return null;
    })
    .filter(Boolean) as Array<{ name: string; description: string }>;

  return services.length > 0
    ? services
    : [{ name: `${businessName} core service`, description: "Initial service draft generated for agency/client review." }];
}

function buildInitialBusinessBlueprint(input: {
  projectId: string;
  tenantId: string;
  businessName: string;
  industry: string;
  contactEmail: string;
  contactPhone?: string;
  modules: string[];
  payload: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const hasModule = (moduleId: string) => input.modules.includes(moduleId);
  const enabledFeatures = Array.isArray(input.payload.enabledFeatures)
    ? input.payload.enabledFeatures.map((feature) => String(feature).trim()).filter(Boolean)
    : [];
  const serviceDrafts = normalizeServiceDrafts(input.payload, input.businessName);
  const publicSlug = toPublicSlug(input.businessName);
  const primaryColor = cleanText(input.payload.primaryColor, "#3B82F6");
  const secondaryColor = cleanText(input.payload.secondaryColor, "#10B981");
  const websiteEnabled = hasModule("website-builder");
  const storefrontEnabled = hasModule("storefront-builder");
  const ecommerceEnabled = hasModule("ecommerce-engine");
  const leadsEnabled = hasModule("crm-leads");
  const emailEnabled = hasModule("email-marketing");
  const chatbotEnabled = hasModule("chatbot-engine");
  const appointmentsEnabled = hasModule("appointments-engine");
  const restaurantEnabled = hasModule("restaurant-engine");
  const realtyEnabled = hasModule("real-estate-engine");
  const bioPageEnabled = hasModule("bio-page-engine");
  const mediaEnabled = hasModule("media-assets");
  const financeEnabled = hasModule("finance");
  const analyticsEnabled = hasModule("analytics-engine");
  const baseSections = uniqueStrings([
    "header",
    "hero",
    "services",
    leadsEnabled ? "leads" : "",
    ecommerceEnabled ? "featuredProducts" : "",
    chatbotEnabled ? "chatbot" : "",
    "footer",
  ], ["header", "hero", "services", "leads", "footer"]);
  const moduleWarnings = [
    "Generated content is draft-only.",
    "No runtime, public publishing, billing provider, email sending, appointment slot, menu item, listing, or checkout session was activated.",
  ];
  const agencyOperatingSystem = buildAgencyOperatingSystem({
    modules: input.modules,
    payload: input.payload,
    now,
  });

  return {
    blueprintVersion: "1.0.0",
    schemaVersion: 1,
    projectId: input.projectId,
    tenantId: input.tenantId,
    workspaceId: input.tenantId,
    status: "needs_review",
    source: "ai-studio",
    generatedBy: "agency-engine",
    generatedAt: now,
    updatedAt: now,
    readiness: readiness(false, moduleWarnings, ["Agency/client review is required before publishing or activating modules."]),
    sourceMap: {
      businessName: "payload.businessName",
      industry: "payload.industry",
      contactEmail: "payload.contactEmail",
      selectedPlanId: "payload.selectedPlanId",
      selectedPlanName: "payload.selectedPlanName",
      enabledFeatures: "payload.enabledFeatures",
      modules: "agencyProvisioning.modules",
      agencyOperatingSystem: "agencyOperatingSystem",
    },
    metadata: {
      generatedBy: "ai",
      generatedByAI: true,
      userModified: false,
      lockedFromRegeneration: false,
      generatedAt: now,
      generationSource: "agency-engine",
    },
    businessProfile: {
      ...buildDraftState(now, true, { source: "payload.businessProfile" }, "needs_review"),
      businessName: input.businessName,
      industry: input.industry,
      description: cleanText(input.payload.businessDescription || input.payload.description, `${input.businessName} digital business workspace.`),
      tagline: cleanText(input.payload.tagline, ""),
      services: serviceDrafts,
      contactInfo: {
        email: input.contactEmail,
        phone: input.contactPhone || "",
      },
      goals: uniqueStrings(Array.isArray(input.payload.goals) ? input.payload.goals : [], [
        "Launch a reviewed digital presence",
        "Capture and qualify leads",
        "Measure performance across modules",
      ]),
      targetAudience: cleanText(input.payload.targetAudience, "Agency client customers"),
    },
    brandProfile: {
      ...buildDraftState(now, true, { colors: "payload.primaryColor,payload.secondaryColor" }, "needs_review"),
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: "#F59E0B",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        text: "#0F172A",
      },
      fonts: ["Inter"],
      visualStyle: cleanText(input.payload.visualStyle, "Quimera clean operating-system UI"),
      logoUrl: cleanText(input.payload.logoUrl, ""),
      isDarkTheme: false,
    },
    agencyProvisioning: {
      aiStudioMode: input.payload.aiStudioMode || "draft",
      selectedPlanId: input.payload.selectedPlanId || null,
      selectedPlanName: input.payload.selectedPlanName || null,
      enabledFeatures,
      modules: input.modules,
      agencyOperatingSystem,
      client360ModuleIds: agencyOperatingSystem.enabledClient360ModuleIds,
      foundationModuleIds: agencyOperatingSystem.foundationModuleIds,
      needsReview: true,
      generatedByAI: true,
      noRuntimeActivated: true,
      noAutoPublish: true,
    },
    agencyOperatingSystem,
    websiteBlueprint: {
      ...buildDraftState(now, websiteEnabled, { sections: "agencyProvisioning.modules" }),
      pages: [{ id: "home", title: "Home", slug: "/", sections: baseSections }],
      sections: baseSections,
      componentOrder: baseSections,
      sectionVisibility: Object.fromEntries(baseSections.map((section) => [section, true])),
      sectionBlueprints: baseSections.map((section, index) => ({
        ...buildDraftState(now, websiteEnabled, { type: `websiteBlueprint.sections.${index}` }),
        id: `section-${section}`,
        type: section,
        order: index,
        visible: true,
        pageIds: ["home"],
        settings: { generatedByAgencyEngine: true },
      })),
      ecommerceBlocks: ecommerceEnabled ? [{
        ...buildDraftState(now, true, { source: "ecommerceBlueprint.starterProducts" }),
        id: "website-featured-products-draft",
        type: "featured_products",
        source: "ecommerce",
        targetRoute: "/store",
        settings: { status: "draft", requiresProductReview: true },
      }] : [],
      leadForms: leadsEnabled ? ["agency-intake-lead-form"] : [],
      chatbotPlacement: chatbotEnabled ? "floating" : "none",
      needsReview: true,
    },
    storefrontBlueprint: {
      ...buildDraftState(now, storefrontEnabled, { source: "payload.generateStorefront,payload.generateEcommerce" }),
      routeStrategy: "project-store",
      catalogSize: ecommerceEnabled ? "small" : "none",
      templateCompatibility: {
        supportsProducts: ecommerceEnabled,
        supportsCollections: ecommerceEnabled,
        supportsCart: ecommerceEnabled,
        supportsCheckoutVisual: ecommerceEnabled,
      },
      themeFallbackChain: ["quimera-modern", "quimera-default"],
      templatePreset: "agency-client-draft",
      themePreset: "modern",
      sections: storefrontEnabled ? [
        {
          ...buildDraftState(now, true, { source: "storefrontBlueprint.sections" }),
          id: "storefront-hero-draft",
          type: "storefrontHero",
          order: 0,
          settings: { title: input.businessName, publishStatus: "not_published" },
          dataSource: "businessBlueprint",
        },
      ] : [],
      productCardVariant: "modern",
      collectionStrategy: "reviewed_collections",
      cartStyle: "drawer",
      checkoutStyle: "hosted",
      colorSystem: { primary: primaryColor, secondary: secondaryColor },
      templates: {
        home: "draft",
        collection: "draft",
        product: "draft",
        cart: "draft",
        checkoutVisual: "draft",
      },
      needsReview: true,
    },
    ecommerceBlueprint: {
      ...buildDraftState(now, ecommerceEnabled, { source: "payload.generateEcommerce" }),
      storeType: ecommerceEnabled ? "service_catalog" : "not_configured",
      catalogStrategy: "agency_reviewed_drafts",
      categories: ecommerceEnabled ? uniqueStrings([input.industry, "Services"], ["Services"]) : [],
      productCategories: ecommerceEnabled ? uniqueStrings([input.industry, "Services"], ["Services"]) : [],
      collections: ecommerceEnabled ? ["Featured services"] : [],
      starterProducts: ecommerceEnabled ? serviceDrafts.slice(0, 3).map((service) => ({
        name: service.name,
        category: "Services",
        description: service.description || "Draft service product for review.",
        priceSource: "unset",
        stockSource: "unset",
        status: "draft",
        needsReview: true,
        isPublished: false,
        publishStatus: "not_published",
        discountStatus: "none",
      })) : [],
      inventoryMode: "not_configured",
      fulfillmentMode: "not_configured",
      paymentMode: "not_configured",
      taxMode: "not_configured",
      shippingMode: "not_configured",
      discounts: [],
      giftCards: { enabled: false, status: "draft" },
      giftCardsEnabled: false,
      digitalProductsEnabled: false,
      recommendations: ecommerceEnabled ? ["Review products, prices, taxes, fulfillment, and payment settings before launch."] : [],
      starterContentStatus: "previewed",
      createdContentRefs: { categoryIds: [], productIds: [], giftCardIds: [] },
      starterContentReadiness: {
        productsDrafted: ecommerceEnabled,
        needsMerchantReview: true,
        paymentsConfigured: false,
        inventoryConfigured: false,
        storefrontPublished: false,
      },
      starterContentSummary: {
        categoriesSuggested: ecommerceEnabled ? 1 : 0,
        productsSuggested: ecommerceEnabled ? Math.min(serviceDrafts.length, 3) : 0,
        giftCardsSuggested: 0,
        productsCreated: 0,
        categoriesCreated: 0,
        giftCardsCreated: 0,
        lastPreviewedAt: now,
      },
      needsReview: true,
    },
    leadBlueprint: {
      ...buildDraftState(now, leadsEnabled, { source: "payload.enabledFeatures,payload.generateWebsite" }),
      leadSources: leadsEnabled ? ["website", "bio_page", "chatbot", "appointments", "restaurant", "realty"] : [],
      leadTags: leadsEnabled ? uniqueStrings([input.industry, "agency-client", "needs-review"], ["agency-client"]) : [],
      activityTimelineEvents: leadsEnabled ? ["lead_submitted", "appointment_requested", "chat_started", "bio_link_clicked"] : [],
      needsReview: true,
    },
    emailMarketingBlueprint: {
      ...buildDraftState(now, emailEnabled, { source: "payload.generateEmailFlows,payload.enabledFeatures" }),
      sender: {
        provider: "unset",
        providerStatus: "not_configured",
        domainStatus: "not_configured",
        readiness: readiness(false, [], ["Sender domain and provider are not configured."]),
        needsReview: true,
      },
      consent: {
        requireMarketingConsent: true,
        consentSources: emailEnabled ? ["website", "bio_page", "checkout", "appointments"] : [],
        unsubscribeEnabled: true,
        suppressionEnabled: true,
        doubleOptInEnabled: false,
        complianceRegion: "unknown",
        needsReview: true,
      },
      audiences: emailEnabled ? [{
        id: "agency-client-prospects",
        name: "Prospects",
        description: "Draft audience from generated lead sources.",
        type: "cross_module",
        sourceModules: ["crm", "website", "bio_page", "chatbot"],
        filters: [],
        tags: ["agency-client"],
        status: "draft",
        needsReview: true,
        generatedByAI: true,
        userModified: false,
        sourceMap: { source: "leadBlueprint.leadTags" },
      }] : [],
      campaigns: [],
      automations: emailEnabled ? [{
        id: "lead-welcome-draft",
        name: "Lead welcome draft",
        type: "welcome",
        category: "lead_nurture",
        triggerEvent: "lead_submitted",
        sourceModule: "crm",
        steps: [],
        status: "draft",
        readiness: readiness(false, [], ["Flow content and sender require review."]),
        generatedByAI: true,
        needsReview: true,
        userModified: false,
        sourceMap: { source: "leadBlueprint" },
      }] : [],
      transactionalFlows: [],
      providerReadiness: {
        providerConfigured: false,
        senderConfigured: false,
        domainVerified: false,
        unsubscribeConfigured: true,
        suppressionConfigured: true,
        trackingConfigured: false,
        webhookConfigured: false,
        testEmailSent: false,
        readinessBlockers: emailEnabled ? ["Email provider is not configured."] : [],
        warnings: [],
      },
      analytics: {
        trackedEvents: emailEnabled ? ["email_opened", "email_clicked", "lead_submitted"] : [],
        webhookEvents: [],
        dashboardMetrics: emailEnabled ? ["subscribers", "opens", "clicks", "conversions"] : [],
        needsReview: true,
      },
      crossModule: {
        eventSources: emailEnabled ? ["crm", "appointments", "ecommerce", "bio_page", "chatbot"] : [],
        acceptedEvents: emailEnabled ? ["lead_submitted", "appointment_requested", "order_created"] : [],
        flowMappings: {},
        draftFlowMappings: {},
        runtimeEnabled: false,
        needsReview: true,
      },
      flows: emailEnabled ? [{ type: "welcome", status: "draft", triggerEvent: "lead_submitted" }] : [],
      logEvents: emailEnabled ? ["lead_submitted"] : [],
      needsReview: true,
    },
    chatbotBlueprint: {
      ...buildDraftState(now, chatbotEnabled, { source: "payload.generateChatbot,businessProfile" }),
      engineVersion: "v2",
      agentProfile: {
        agentName: `${input.businessName} AI Assistant`,
        brandName: input.businessName,
        tone: "helpful",
        defaultLanguage: "es",
        supportedLanguages: ["es", "en"],
        escalationMessage: "A team member will follow up.",
        sourceMap: { agentName: "businessProfile.businessName" },
      },
      knowledgeSources: chatbotEnabled ? [
        { id: "business-blueprint", type: "business_blueprint", title: "BusinessBlueprint", visibility: "public", status: "draft", freshness: "unknown", needsReview: true, sourceMap: { source: "businessBlueprint" } },
        ...(ecommerceEnabled ? [{ id: "ecommerce-products", type: "ecommerce_products", title: "Draft products", visibility: "public", status: "draft", freshness: "unknown", needsReview: true, sourceMap: { source: "ecommerceBlueprint.starterProducts" } }] : []),
        ...(appointmentsEnabled ? [{ id: "appointments-services", type: "appointments_services", title: "Appointment services", visibility: "public", status: "draft", freshness: "unknown", needsReview: true, sourceMap: { source: "appointmentsBlueprint.services" } }] : []),
        ...(restaurantEnabled ? [{ id: "restaurant-menu", type: "restaurant_menu", title: "Restaurant menu", visibility: "public", status: "draft", freshness: "unknown", needsReview: true, sourceMap: { source: "restaurantBlueprint.menuDraft" } }] : []),
        ...(realtyEnabled ? [{ id: "realty-listings", type: "realty_listings", title: "Real estate listings", visibility: "public", status: "draft", freshness: "unknown", needsReview: true, sourceMap: { source: "realEstateBlueprint.listingDrafts" } }] : []),
      ] : [],
      actions: chatbotEnabled ? [
        { id: "create-lead", type: "create_lead", status: "draft", enabled: false, needsReview: true },
        { id: "appointment-request", type: "create_appointment", status: "draft", enabled: false, needsReview: true },
        { id: "handoff", type: "handoff_to_human", status: "draft", enabled: false, needsReview: true },
      ] : [],
      leadCapture: { enabled: chatbotEnabled && leadsEnabled, fields: ["name", "email", "phone"], consentRequired: true, needsReview: true },
      handoff: { enabled: true, mode: "manual", target: "agency", needsReview: true },
      appointments: { enabled: chatbotEnabled && appointmentsEnabled, source: "appointmentsBlueprint", needsReview: true },
      ecommerce: { enabled: chatbotEnabled && ecommerceEnabled, source: "ecommerceBlueprint", checkoutEnabled: false, needsReview: true },
      restaurants: { enabled: chatbotEnabled && restaurantEnabled, source: "restaurantBlueprint", reservationEnabled: false, needsReview: true },
      realEstate: { enabled: chatbotEnabled && realtyEnabled, source: "realEstateBlueprint", showingRequestEnabled: false, needsReview: true },
      bioPage: { enabled: chatbotEnabled && bioPageEnabled, source: "bioPageBlueprint", needsReview: true },
      channels: { websiteWidget: false, clientPortal: false, bioPage: false, needsReview: true },
      testing: { testMode: true, lastTestedAt: null, scenarios: [], needsReview: true },
      analytics: { events: chatbotEnabled ? ["chat_started", "lead_submitted"] : [], dashboards: ["chatbot_performance"], needsReview: true },
      deployment: {
        runtimeEnabled: false,
        publicWidgetEnabled: false,
        status: "draft",
        voiceSettings: { enabled: false, provider: "none", agentId: null },
        needsReview: true,
      },
      businessKnowledge: chatbotEnabled ? [`${input.businessName} operates in ${input.industry}.`] : [],
      productKnowledge: [],
      policyKnowledge: [],
      eventIntents: chatbotEnabled ? ["lead_submitted", "appointment_requested"] : [],
      needsReview: true,
    },
    mediaBlueprint: {
      ...buildDraftState(now, mediaEnabled, { source: "payload.generateMediaAssets,brandProfile" }),
      imageNeeds: mediaEnabled ? ["hero image", "service thumbnails", "social proof assets", "bio page profile media"] : [],
      videoNeeds: mediaEnabled ? ["short intro clip", "service explainer"] : [],
      brandAssetNeeds: mediaEnabled ? ["logo variations", "social templates", "storefront banners"] : [],
      needsReview: true,
    },
    bioPageBlueprint: {
      ...buildDraftState(now, bioPageEnabled, { source: "payload.generateBioPage,businessProfile" }),
      routeStrategy: "bio_slug",
      defaultRoute: "/bio/:slug",
      publicSlug,
      title: input.businessName,
      description: cleanText(input.payload.bioDescription, `Digital profile for ${input.businessName}.`),
      profile: {
        displayName: input.businessName,
        handle: publicSlug,
        bio: cleanText(input.payload.bioDescription, `${input.businessName} digital profile.`),
        category: input.industry,
        verifiedBadgeEnabled: false,
        socialProofEnabled: false,
        followerCountSource: "none",
        needsReview: true,
        generatedByAI: true,
        userModified: false,
      },
      blocks: bioPageEnabled ? [
        { id: "bio-profile", type: "profile", title: input.businessName, order: 0, visible: true, status: "draft", data: {}, needsReview: true, generatedByAI: true, userModified: false, sourceMap: { source: "businessProfile" } },
        { id: "bio-contact", type: "contact", title: "Contact", order: 1, visible: true, status: "draft", data: { email: input.contactEmail, phone: input.contactPhone || "" }, needsReview: true, generatedByAI: true, userModified: false, sourceMap: { source: "businessProfile.contactInfo" } },
      ] : [],
      links: [],
      theme: {
        layoutVariant: "business",
        backgroundType: "solid",
        colors: { primary: primaryColor, secondary: secondaryColor, background: "#F8FAFC", text: "#0F172A" },
        typography: { heading: "Inter", body: "Inter" },
        buttonStyle: "solid",
        buttonRadius: 8,
        cardRadius: 8,
        spacing: "balanced",
        profileAlignment: "center",
        showQuimeraFooter: true,
        customCssDisabled: true,
        needsReview: true,
      },
      socialLinks: [],
      shop: { enabled: bioPageEnabled && ecommerceEnabled, source: "ecommerce", featuredProducts: [], collections: [], showPrices: false, showProductImages: true, productCardVariant: "compact", shopTabEnabled: false, needsReview: true },
      booking: { enabled: bioPageEnabled && appointmentsEnabled, source: "appointments", services: [], bookingCTA: "Book", bookingBlockEnabled: false, confirmationMode: "manual", needsReview: true },
      leadCapture: { enabled: bioPageEnabled && leadsEnabled, source: "crm", formTitle: "Contact", fields: [{ id: "email", label: "Email", type: "email", required: true }], consentRequired: true, consentText: "I agree to be contacted.", leadTags: ["bio-page"], leadSource: "bio_page", successMessage: "Thanks. We will follow up.", needsReview: true },
      emailSubscribe: { enabled: bioPageEnabled && emailEnabled, source: "emailMarketing", consentText: "I agree to receive updates.", placeholder: "Email", buttonText: "Subscribe", successMessage: "Subscribed.", doubleOptIn: false, needsReview: true },
      chatbot: { enabled: bioPageEnabled && chatbotEnabled, source: "chatbot", floatingChatEnabled: false, inlineCTAEnabled: false, welcomePrompt: "How can we help?", leadCaptureEnabled: leadsEnabled, needsReview: true },
      analytics: { trackViews: true, trackClicks: true, trackCTR: true, trackSubscribers: emailEnabled, trackLeads: leadsEnabled, trackBookings: appointmentsEnabled, trackProductClicks: ecommerceEnabled, trackSourceUTM: true, events: ["bio_page_viewed", "bio_link_clicked"], needsReview: true },
      seo: { title: input.businessName, description: `${input.businessName} digital profile.`, noIndex: true, schemaType: "Organization", needsReview: true },
      qrCode: { enabled: false, status: "not_generated", color: primaryColor, backgroundColor: "#FFFFFF", needsReview: true },
      integrations: { businessBlueprint: true, designSystem: true, ecommerce: ecommerceEnabled, appointments: appointmentsEnabled, crm: leadsEnabled, emailMarketing: emailEnabled, chatbot: chatbotEnabled, media: mediaEnabled, analytics: analyticsEnabled, websiteBuilder: websiteEnabled },
      needsReview: true,
    },
    appointmentsBlueprint: {
      ...buildDraftState(now, appointmentsEnabled, { source: "payload.generateAppointments" }),
      engineVersion: "v2",
      sourceOfTruth: "project_appointments",
      legacyReadOnlySources: [],
      serviceTypes: appointmentsEnabled ? serviceDrafts.map((service) => service.name) : [],
      paidBookingTypes: [],
      services: appointmentsEnabled ? serviceDrafts.slice(0, 3).map((service, index) => ({
        id: `appointment-service-${index + 1}`,
        name: service.name,
        description: service.description,
        durationMinutes: 60,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 15,
        paymentMode: "none",
        needsReview: true,
        sourceMap: { source: "businessProfile.services" },
      })) : [],
      availabilityStatus: "not_configured",
      availability: { timezone: "America/Puerto_Rico", weeklyHours: [], blockedTimeSource: "project_appointment_blocks", minimumNoticeMinutes: 1440, maxAdvanceDays: 30, intervalMinutes: 30, capacityPerSlot: 1 },
      bookingRules: { confirmationMode: "manual", cancellationPolicy: "Needs review", reschedulePolicy: "Needs review", reminders: [], leadRequiredFields: ["name", "email"], },
      publicBooking: { enabled: false, status: "draft", needsReview: true, routeStrategy: "disabled", componentIds: [] },
      chatcore: { enabled: chatbotEnabled, status: "draft", needsReview: true, intentNames: ["appointment_request"], source: "ChatCore" },
      crm: { enabled: leadsEnabled, status: "draft", needsReview: true, leadLinking: "create_or_link", taskStrategy: "follow_up_after_completed" },
      emailMarketing: { enabled: emailEnabled, status: "draft", needsReview: true, flowTypes: ["booking_request", "booking_reminder"] },
      analytics: { enabled: analyticsEnabled, status: "draft", needsReview: true, eventNames: ["appointment_requested", "appointment_confirmed"] },
      googleCalendar: { enabled: false, status: "not_configured", needsReview: true, syncDirection: "export_only" },
      ecommerce: { enabled: ecommerceEnabled, status: "draft", needsReview: true, paymentMode: "none", depositProductStrategy: "none" },
      aiPreparation: { enabled: chatbotEnabled, status: "draft", needsReview: true, enabledByDefault: false, usesLinkedLeads: leadsEnabled, promptContext: ["businessProfile", "leadBlueprint"] },
      websiteBuilderBlocks: appointmentsEnabled ? [{ componentId: "appointment-cta-draft", purpose: "appointment_cta", status: "draft" }] : [],
      needsReview: true,
    },
    restaurantBlueprint: {
      ...buildDraftState(now, restaurantEnabled, { source: "payload.generateRestaurantModule" }),
      profile: { name: input.businessName, cuisineType: input.industry, address: "", phone: input.contactPhone || "", email: input.contactEmail, hours: "", publicSlug, languagesEnabled: ["es", "en"], currency: "USD", sourceMap: { source: "businessProfile" }, readiness: readiness(false, [], ["Restaurant profile needs review."]) },
      menuDraft: { categories: [], items: [], dietaryTags: [], allergens: [], modifiers: [], upsells: [], priceSource: "unset", generatedByAI: true, userModified: false, needsReview: true, status: "draft", publishStatus: "not_published" },
      reservations: { enabled: restaurantEnabled && appointmentsEnabled, status: "draft", maxPartySize: 8, minPartySize: 1, reservationInterval: 30, averageTableDuration: 90, tablePreferences: [], capacityRules: [], depositRequired: false, cancellationPolicy: "Needs review", confirmationMode: "manual", source: "ai-studio", needsReview: true, readiness: readiness(false, [], ["Reservation capacity and hours are not configured."]) },
      publicMenu: { enabled: false, qrMenuEnabled: false, routeStrategy: "/menu/:restaurantId", qrCodeStatus: "not_generated", categoryNavigationEnabled: true, stickyCtaEnabled: true, showCallButton: true, showMapButton: true, showReserveButton: appointmentsEnabled, themePreset: "quimera", menuVariant: "clean", mobileBehavior: "sticky_actions" },
      ecommerceOffers: {
        giftCards: { enabled: false, status: "draft", needsReview: true },
        cateringPackages: { enabled: false, status: "draft", needsReview: true },
        eventTickets: { enabled: false, status: "draft", needsReview: true },
        reservationDeposits: { enabled: false, status: "draft", needsReview: true },
        mealKits: { enabled: false, status: "draft", needsReview: true },
        merch: { enabled: false, status: "draft", needsReview: true },
      },
      integrations: { chatbotKnowledgeSources: [], crmLeadSources: [], crmTags: [], emailFlows: [], analyticsEvents: [], financeRevenueSources: [], automationFlows: [] },
      menuSignals: restaurantEnabled ? [input.industry] : [],
      reservationRules: [],
      legacyEcommerceOffers: [],
      needsReview: true,
    },
    realEstateBlueprint: {
      ...buildDraftState(now, realtyEnabled, { source: "payload.generateRealtyModule" }),
      profileType: "agent",
      agentProfile: { name: input.businessName, email: input.contactEmail, phone: input.contactPhone || "", bio: "", specialties: [], serviceAreas: [], languages: ["es", "en"], socialLinks: {}, complianceNotes: ["Review licensing and fair-housing/compliance copy before publishing."], sourceMap: { source: "businessProfile" }, readiness: readiness(false, [], ["Agent profile needs compliance review."]) },
      brokerageProfile: { name: input.businessName, address: "", phone: input.contactPhone || "", email: input.contactEmail, officeLocations: [], teamMembers: [], sourceMap: { source: "businessProfile" }, readiness: readiness(false, [], ["Brokerage profile needs review."]) },
      listingDrafts: [],
      websiteRoutes: { profile: "/realty", directory: "/listados", propertyDetail: "/listados/:slug", openHouses: "/open-houses" },
      listingTypes: realtyEnabled ? ["sale", "rent"] : [],
      leadTypes: realtyEnabled ? ["buyer", "seller", "renter", "investor"] : [],
      pageTypes: realtyEnabled ? ["profile", "directory", "propertyDetail", "openHouses"] : [],
      leadFunnels: { buyerLeadEnabled: realtyEnabled, sellerLeadEnabled: realtyEnabled, renterLeadEnabled: realtyEnabled, investorLeadEnabled: realtyEnabled, valuationCtaEnabled: false, buyerGuideEnabled: false, sellerGuideEnabled: false, contactFormEnabled: leadsEnabled, propertyInquiryEnabled: false, openHouseRegistrationEnabled: false, showingRequestEnabled: false, leadTags: ["realty"], leadSources: ["website"], crmPipelineStages: ["new", "qualified", "showing_requested"], needsReview: true, readiness: readiness(false, [], ["Realty funnels need review."]) },
      showingRequests: { enabled: false, status: "draft", availabilitySource: "unset", preferredDateEnabled: true, preferredTimeEnabled: true, buyerQualificationFields: [], financingStatusField: false, budgetField: false, assignedAgentStrategy: "manual", confirmationMode: "manual", remindersEnabled: false, appointmentIntegrationEnabled: appointmentsEnabled, needsReview: true, readiness: readiness(false, [], ["Showing workflow is not activated."]) },
      openHouses: { enabled: false, defaultDurationMinutes: 120, registrationEnabled: false, capacityEnabled: false, reminderFlowEnabled: false, followUpFlowEnabled: false, status: "draft", needsReview: true, readiness: readiness(false, [], ["Open houses are not configured."]) },
      campaigns: { campaigns: [] },
      publicDirectory: { enabled: false, route: "/listados", filtersEnabled: true, searchEnabled: true, mapViewEnabled: true, gridViewEnabled: true, listViewEnabled: true, savedSearchEnabled: false, compareListingsEnabled: false, featuredListingsEnabled: false, mortgageCalculatorEnabled: false, stickyCtaEnabled: true, seoEnabled: true, schemaEnabled: true, status: "draft", needsReview: true, readiness: readiness(false, [], ["Listings must be reviewed before enabling directory."]) },
      propertyPages: { enabled: false, routePattern: "/listados/:slug", galleryEnabled: true, virtualTourEnabled: false, mapEnabled: true, contactFormEnabled: leadsEnabled, showingRequestEnabled: false, openHouseRegistrationEnabled: false, relatedListingsEnabled: true, documentsGateEnabled: false, mortgageCalculatorEnabled: false, schemaEnabled: true, stickyMobileCtaEnabled: true, status: "draft", needsReview: true },
      neighborhoods: { enabled: false, neighborhoods: [] },
      chatbot: { knowledgeSources: [], supportedQuestions: [], intents: ["property_inquiry", "agent_handoff"] },
      emailMarketing: { flows: [] },
      analytics: { events: ["property_view", "lead_submitted"] },
      ecommerceOffers: {
        buyerGuides: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
        sellerGuides: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
        marketReports: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
        consultationPackages: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
        valuationPackages: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
        premiumListingPackages: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
        courses: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
        digitalDownloads: { enabled: false, status: "draft", priceSource: "unset", needsReview: true },
      },
      integrations: { crmTags: ["realty"], crmLeadSources: ["website"], crmPipelineStages: ["new", "qualified", "showing_requested"], emailFlows: [], chatbotKnowledgeSources: [], analyticsEvents: ["property_view", "lead_submitted"], financeRevenueSources: [], automationFlows: [] },
      campaignTypes: ["just_listed", "open_house", "seller_lead_magnet"],
      chatbotKnowledge: [],
      emailAutomations: [],
      crmPipelineStages: ["new", "qualified", "showing_requested"],
      analyticsEvents: ["property_view", "lead_submitted"],
      digitalProducts: [],
      monetizationOffers: [],
      financeRevenueSources: [],
      engineArtifacts: [],
      importArchitecture: { sources: ["manual", "csv", "imported-url"], duplicateMatchKeys: ["address", "slug"], defaultStatus: "draft", needsReview: true },
      needsReview: true,
    },
    financeBlueprint: {
      ...buildDraftState(now, financeEnabled, { source: "payload.setupBilling,payload.monthlyPrice,ecommerceBlueprint" }),
      trackedMetrics: financeEnabled ? ["mrr", "client_ltv", "paid_orders", "refunds", "gross_margin"] : [],
      revenueSources: financeEnabled ? ["agency_service_plan", "store_orders", "appointments", "ecommerce"] : [],
      refundSources: financeEnabled ? ["store_refunds", "manual_adjustments"] : [],
      needsReview: true,
    },
    analyticsBlueprint: {
      ...buildDraftState(now, analyticsEnabled, { source: "payload.enabledFeatures" }),
      events: analyticsEnabled ? ["page_view", "lead_submitted", "chat_started", "bio_page_viewed", "order_created", "appointment_requested"] : [],
      dashboards: analyticsEnabled ? ["agency_client_360", "website_performance", "revenue", "leads", "module_readiness"] : [],
      needsReview: true,
    },
    automationBlueprint: {
      ...buildDraftState(now, true, { source: "crossModuleSync" }),
      flows: [
        { id: "new-lead-follow-up-draft", name: "New lead follow-up draft", sourceModule: "crm", triggerEvent: "lead_submitted", status: "draft" },
        { id: "appointment-request-draft", name: "Appointment request draft", sourceModule: "appointments", triggerEvent: "appointment_requested", status: "draft" },
      ],
      needsReview: true,
    },
    crossModuleSync: {
      status: "previewed",
      previewedAt: now,
      chatbot: syncModuleState(chatbotEnabled),
      leads: syncModuleState(leadsEnabled),
      emailMarketing: syncModuleState(emailEnabled),
      analytics: syncModuleState(analyticsEnabled),
      appointments: syncModuleState(appointmentsEnabled),
      ecommerce: syncModuleState(ecommerceEnabled),
      finance: syncModuleState(financeEnabled),
      warnings: moduleWarnings,
      readiness: {
        chatbotReady: false,
        leadTagsReady: false,
        emailFlowsReady: false,
        analyticsReady: false,
        appointmentsReady: false,
        ecommerceOffersReady: false,
        financeReady: false,
        needsMerchantReview: true,
      },
      source: "agency-engine",
      noRuntimeActivated: true,
      noAutoPublish: true,
      noPublicRoutesEnabled: true,
      noCheckoutSessionCreated: true,
      noStripeObjectCreated: true,
      noEmailSent: true,
      noAppointmentSlotsCreated: true,
      noRestaurantMenuPublished: true,
      noRealtyListingsPublished: true,
      createdAt: now,
      updatedAt: now,
    },
  };
}

async function ensureUniqueSlug(baseName: string) {
  const baseSlug = generateSlug(baseName);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (error) throw error;
    if (!data?.length) return slug;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function fetchAgencyServicePlan(agencyTenantId: string, selectedPlanId?: string | null) {
  if (selectedPlanId) {
    const { data, error } = await supabase
      .from("agency_service_plans")
      .select("*")
      .eq("tenant_id", agencyTenantId)
      .eq("id", selectedPlanId)
      .eq("is_archived", false)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Agency service plan not found");
    return data;
  }

  const { data, error } = await supabase
    .from("agency_service_plans")
    .select("*")
    .eq("tenant_id", agencyTenantId)
    .eq("is_default", true)
    .eq("is_archived", false)
    .maybeSingle();

  if (error && error.code !== "42P01" && error.code !== "PGRST205") throw error;
  return data || null;
}

async function countAgencyManagedClients(agencyTenantId: string) {
  const canonicalClientIds = new Set<string>();

  const { data: relationships, error: relationshipError } = await supabase
    .from("agency_clients")
    .select("client_tenant_id")
    .eq("agency_tenant_id", agencyTenantId);

  if (relationshipError && !isMissingTableError(relationshipError)) throw relationshipError;

  if (!relationshipError) {
    for (const relationship of relationships || []) {
      if (relationship.client_tenant_id) canonicalClientIds.add(relationship.client_tenant_id);
    }
  }

  const { data: legacyRows, error: legacyError } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_tenant_id", agencyTenantId);

  if (legacyError) throw legacyError;

  for (const row of legacyRows || []) {
    if (row.id) canonicalClientIds.add(row.id);
  }

  return canonicalClientIds.size;
}

async function insertModuleActivations(input: {
  tenantId: string;
  projectId: string;
  modules: string[];
  createdBy: string;
}) {
  const now = new Date().toISOString();
  const tenantRows = input.modules.map((moduleId) => ({
    tenant_id: input.tenantId,
    module_id: moduleId,
    enabled: true,
    status: "enabled",
    metadata: { source: "agency-engine", createdBy: input.createdBy },
    created_at: now,
    updated_at: now,
  }));
  const projectRows = input.modules.map((moduleId) => ({
    project_id: input.projectId,
    tenant_id: input.tenantId,
    module_id: moduleId,
    enabled: true,
    status: "enabled",
    metadata: { source: "agency-engine", createdBy: input.createdBy },
    created_at: now,
    updated_at: now,
  }));

  for (const [table, rows] of [["tenant_modules", tenantRows], ["project_modules", projectRows]] as const) {
    const { error } = await supabase.from(table).upsert(rows, {
      onConflict: table === "tenant_modules" ? "tenant_id,module_id" : "project_id,module_id",
    });

    if (error && error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn(`[onboarding-api] could not write ${table}`, error);
    }
  }
}

async function copyProjectModuleActivations(input: {
  sourceProjectId: string;
  targetProjectId: string;
  targetTenantId: string;
  createdBy: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_modules")
    .select("module_id, enabled, status, metadata")
    .eq("project_id", input.sourceProjectId);

  if (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }

  const modules = (data || [])
    .map((item: Record<string, unknown>) => String(item.module_id || ""))
    .filter(Boolean);

  if (!modules.length) return 0;

  const tenantRows = modules.map((moduleId) => ({
    tenant_id: input.targetTenantId,
    module_id: moduleId,
    enabled: true,
    status: "enabled",
    metadata: { source: "agency-project-transfer", createdBy: input.createdBy },
    created_at: now,
    updated_at: now,
  }));
  const projectRows = (data || []).map((item: Record<string, unknown>) => ({
    project_id: input.targetProjectId,
    tenant_id: input.targetTenantId,
    module_id: String(item.module_id),
    enabled: item.enabled !== false,
    status: String(item.status || "enabled"),
    metadata: {
      ...(item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {}),
      source: "agency-project-transfer",
      sourceProjectId: input.sourceProjectId,
      createdBy: input.createdBy,
    },
    created_at: now,
    updated_at: now,
  }));

  for (const [table, rows] of [["tenant_modules", tenantRows], ["project_modules", projectRows]] as const) {
    const { error: upsertError } = await supabase.from(table).upsert(rows, {
      onConflict: table === "tenant_modules" ? "tenant_id,module_id" : "project_id,module_id",
    });

    if (upsertError && !isMissingTableError(upsertError)) {
      throw upsertError;
    }
  }

  return modules.length;
}

async function createProjectTransferApproval(input: {
  agencyTenantId: string;
  clientTenantId: string;
  projectId: string;
  sourceProjectId: string;
  projectName: string;
  clientName?: string | null;
  requestedBy: string;
  modulesCopied: number;
  metadata: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("agency_client_approvals")
    .insert({
      agency_tenant_id: input.agencyTenantId,
      client_tenant_id: input.clientTenantId,
      project_id: input.projectId,
      related_entity_type: "project",
      related_entity_id: input.projectId,
      approval_type: "project_review",
      status: "pending",
      title: `Revisión de proyecto: ${input.projectName}`,
      description: `Revisa el proyecto transferido a ${input.clientName || "tu portal"} antes de publicarlo o solicitar cambios.`,
      requested_by: input.requestedBy,
      requested_at: now,
      metadata: {
        ...input.metadata,
        source: "agency-project-transfer",
        sourceProjectId: input.sourceProjectId,
        modulesCopied: input.modulesCopied,
        noAutoPublish: true,
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }

  return data?.id || null;
}

function normalizeApprovalDecision(value: unknown): "approved" | "rejected" | "change_requested" {
  const decision = String(value || "").trim().toLowerCase();
  if (decision === "approved" || decision === "approve") return "approved";
  if (decision === "rejected" || decision === "reject") return "rejected";
  if (decision === "change_requested" || decision === "changes" || decision === "request_changes") {
    return "change_requested";
  }
  throw new Error("Invalid approval decision");
}

async function autoProvisionAgencyClient(req: Request, userId: string, payload: Record<string, unknown>) {
  const agencyTenantId = String(payload.agencyTenantId || "");
  const businessName = String(payload.businessName || "").trim();
  const industry = String(payload.industry || "other");
  const contactEmail = String(payload.contactEmail || "").trim().toLowerCase();
  const contactPhone = String(payload.contactPhone || "");
  const selectedPlanId = payload.selectedPlanId ? String(payload.selectedPlanId) : null;

  if (!agencyTenantId) throw new Error("agencyTenantId is required");
  if (!businessName) throw new Error("businessName is required");
  if (!contactEmail) throw new Error("contactEmail is required");

  const subClientCount = await countAgencyManagedClients(agencyTenantId);

  const access = await requireServiceAccess(req, {
    tenantId: agencyTenantId,
    moduleId: "agency-client-provisioning",
    serviceId: "agency",
    featureKey: "agencyModule",
    requiredPermission: "canManageSettings",
    requestedUsage: { resource: "subClients", amount: 1, used: subClientCount },
    action: "agency-client-auto-provision",
  });

  const agencyTenant = access.tenant || {};
  const agencyPlan = await fetchAgencyServicePlan(agencyTenantId, selectedPlanId);
  const effectivePlanId = resolveAgencyClientEffectivePlanId(agencyTenant, payload);
  const clientLimits = sanitizeFiniteLimits(agencyPlan?.limits, effectivePlanId);
  const monthlyPrice = Number(payload.monthlyPrice ?? agencyPlan?.price ?? 0);
  const billingMode = payload.setupBilling ? "agency_managed" : "included_in_parent";
  const modules = selectedModules(payload);
  const slug = await ensureUniqueSlug(businessName);
  const now = new Date().toISOString();
  const provisioningPayload = {
    ...payload,
    selectedPlanId: agencyPlan?.id || selectedPlanId,
    selectedPlanName: agencyPlan?.name || payload.selectedPlanName || null,
    effectivePlanId,
    billingMode,
  };

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: businessName,
      slug,
      email: contactEmail,
      company_name: businessName,
      type: "agency_client",
      owner_user_id: userId,
      owner_tenant_id: agencyTenantId,
      subscription_plan: effectivePlanId,
      status: "active",
      limits: clientLimits,
      usage: {
        projectCount: 0,
        userCount: 1,
        storageUsedGB: 0,
        aiCreditsUsed: 0,
        subClientCount: 0,
      },
      branding: {
        companyName: businessName,
        primaryColor: payload.primaryColor || "#3B82F6",
        secondaryColor: payload.secondaryColor || "#10B981",
      },
      settings: {
        allowMemberInvites: true,
        defaultMemberRole: "client",
        enabledFeatures: Array.isArray(payload.enabledFeatures) ? payload.enabledFeatures : ["cms", "leads"],
        requireTwoFactor: false,
        defaultLanguage: "es",
        timezone: "America/Puerto_Rico",
      },
      billing: {
        mode: billingMode,
        effectivePlanId,
        agencyPlanId: agencyPlan?.id || selectedPlanId,
        agencyPlanName: agencyPlan?.name || payload.selectedPlanName || null,
        monthlyPrice,
        status: billingMode === "agency_managed" ? "pending_setup" : "included",
      },
      parent_credits_pool_id: agencyTenantId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (tenantError) throw tenantError;

  await supabase.from("tenant_members").upsert({
    id: `${tenant.id}_${userId}`,
    tenant_id: tenant.id,
    user_id: userId,
    role: "agency_owner",
    permissions: AGENCY_OWNER_PERMISSIONS,
    invited_by: userId,
    joined_at: now,
  }, { onConflict: "id" });

  const projectId = crypto.randomUUID();
  const businessBlueprint = buildInitialBusinessBlueprint({
    projectId,
    tenantId: tenant.id,
    businessName,
    industry,
    contactEmail,
    contactPhone,
    modules,
    payload: provisioningPayload,
  });
  const agencyOperatingSystem = businessBlueprint.agencyOperatingSystem;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      id: projectId,
      tenant_id: tenant.id,
      user_id: userId,
      name: businessName,
      status: "Draft",
      pages: [],
      data: {
        businessBlueprint,
        agencyProvisioning: {
          agencyTenantId,
          clientTenantId: tenant.id,
          selectedPlanId: agencyPlan?.id || selectedPlanId,
          selectedPlanName: agencyPlan?.name || payload.selectedPlanName || null,
          effectivePlanId,
          billingMode,
          modules,
          agencyOperatingSystem,
          client360ModuleIds: agencyOperatingSystem.enabledClient360ModuleIds,
          foundationModuleIds: agencyOperatingSystem.foundationModuleIds,
          createdAt: now,
        },
      },
      theme: {},
      brand_identity: {
        primaryColor: payload.primaryColor || "#3B82F6",
        secondaryColor: payload.secondaryColor || "#10B981",
      },
      component_order: ["header", "hero", "services", "leads", "footer"],
      section_visibility: {},
      menus: [],
      ai_assistant_config: {
        enabled: modules.includes("chatbot-engine"),
        source: "agency-engine",
        needsReview: true,
      },
      seo_config: {},
      crm_config: {},
      is_archived: false,
      created_at: now,
      last_updated: now,
    })
    .select("*")
    .single();

  if (projectError) throw projectError;

  await supabase.from("agency_clients").upsert({
    agency_tenant_id: agencyTenantId,
    client_tenant_id: tenant.id,
    status: "active",
    lifecycle_stage: "onboarding",
    health_score: 70,
    agency_plan_id: agencyPlan?.id || selectedPlanId,
    billing_mode: billingMode,
    onboarding_status: "provisioned",
    project_count: 1,
    primary_project_id: project.id,
    client_owner_email: contactEmail,
    metadata: {
      source: "onboarding-api",
      modules,
      selectedPlanName: agencyPlan?.name || payload.selectedPlanName || null,
      effectivePlanId,
      agencyOperatingSystem,
    },
    updated_at: now,
  }, { onConflict: "agency_tenant_id,client_tenant_id" });

  await insertModuleActivations({ tenantId: tenant.id, projectId: project.id, modules, createdBy: userId });

  const initialUsers = Array.isArray(payload.initialUsers) ? payload.initialUsers as InitialClientUser[] : [];
  const invites = initialUsers
    .filter((item) => item.email)
    .map((item) => ({
      tenant_id: tenant.id,
      email: String(item.email).toLowerCase(),
      role: "client",
      custom_permissions: CLIENT_ADMIN_PERMISSIONS,
      invited_by: userId,
      token: randomToken(),
      message: `Bienvenido a ${businessName}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      tenant_name: businessName,
    }));

  if (invites.length > 0) {
    const { error: invitesError } = await supabase.from("tenant_invites").insert(invites);
    if (invitesError) throw invitesError;
  }

  await supabase.from("agency_activity").insert({
    agency_tenant_id: agencyTenantId,
    client_tenant_id: tenant.id,
    project_id: project.id,
    type: "client_created",
    title: `Cliente creado: ${businessName}`,
    description: `Agency Engine provisionó ${businessName} con ${modules.length} módulos en draft.`,
    metadata: {
      selectedPlanId: agencyPlan?.id || selectedPlanId,
      selectedPlanName: agencyPlan?.name || payload.selectedPlanName || null,
      effectivePlanId,
      billingMode,
      modules,
      agencyOperatingSystem,
      invitesSent: invites.length,
      source: "onboarding-api",
    },
    created_by: userId,
    created_at: now,
  });

  await supabase
    .from("tenants")
    .update({
      usage: {
        ...((agencyTenant as any).usage || {}),
        subClientCount: subClientCount + 1,
      },
      updated_at: now,
    })
    .eq("id", agencyTenantId);

  return {
    success: true,
    agencyTenantId,
    clientTenantId: tenant.id,
    projectId: project.id,
    selectedPlanId: agencyPlan?.id || selectedPlanId,
    selectedPlanName: agencyPlan?.name || payload.selectedPlanName || null,
    limits: clientLimits,
    modules,
    agencyOperatingSystem,
    invitesSent: invites.length,
    provisioningSummary: {
      tenantCreated: true,
      projectCreated: true,
      businessBlueprintCreated: true,
      moduleActivationsPrepared: true,
      billingMode,
      effectivePlanId,
      enabledClient360ModuleIds: agencyOperatingSystem.enabledClient360ModuleIds,
      activityLogged: true,
    },
  };
}

async function transferAgencyProject(req: Request, userId: string, payload: Record<string, unknown>) {
  const projectId = String(payload.projectId || "");
  const agencyTenantId = String(payload.sourceTenantId || payload.agencyTenantId || "");
  const targetClientTenantId = String(payload.targetClientTenantId || "");

  if (!projectId) throw new Error("projectId is required");
  if (!agencyTenantId) throw new Error("sourceTenantId is required");
  if (!targetClientTenantId) throw new Error("targetClientTenantId is required");

  const access = await requireServiceAccess(req, {
    tenantId: agencyTenantId,
    moduleId: "agency-project-transfer",
    serviceId: "agency",
    featureKey: "agencyModule",
    requiredPermission: "canManageProjects",
    action: "agency-project-transfer",
  });

  const [
    { data: sourceProject, error: projectError },
    { data: clientTenant, error: clientError },
    { data: agencyClient, error: agencyClientError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("tenant_id", agencyTenantId)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("id, name, slug, email, owner_tenant_id, owner_user_id, type, status, subscription_plan, limits, usage, billing, branding, settings")
      .eq("id", targetClientTenantId)
      .maybeSingle(),
    supabase
      .from("agency_clients")
      .select("agency_tenant_id, client_tenant_id, project_count, primary_project_id, agency_plan_id, billing_mode, metadata")
      .eq("agency_tenant_id", agencyTenantId)
      .eq("client_tenant_id", targetClientTenantId)
      .maybeSingle(),
  ]);

  if (projectError) throw projectError;
  if (!sourceProject) throw new Error("Source project not found for this agency workspace");
  if (clientError) throw clientError;
  if (!clientTenant) throw new Error("Target agency client not found");
  if (agencyClientError && !isMissingTableError(agencyClientError)) throw agencyClientError;

  const linkedByTenant = clientTenant.owner_tenant_id === agencyTenantId;
  const linkedByRegistry = agencyClient?.agency_tenant_id === agencyTenantId;
  if (!linkedByTenant && !linkedByRegistry) {
    throw new Error("Target tenant is not linked to this agency");
  }

  const { count: currentProjects, error: countError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", targetClientTenantId)
    .eq("is_archived", false);
  if (countError) throw countError;

  const status = String(sourceProject.status || "").toLowerCase();
  if (sourceProject.is_archived === true || status === "template") {
    throw new Error("This project cannot be transferred");
  }

  const effectiveClientPlanId = normalizePlanId(String(
    clientTenant.billing?.effectivePlanId ||
      clientTenant.subscription_plan ||
      "individual",
  ));
  const clientLimits = sanitizeFiniteLimits(clientTenant.limits, effectiveClientPlanId);
  const maxProjects = Number((clientLimits as Record<string, unknown>).maxProjects || 1);
  if ((currentProjects || 0) + 1 > maxProjects) {
    throw new Error(`El cliente alcanzó el límite de proyectos de su plan (${maxProjects}).`);
  }

  const now = new Date().toISOString();
  const newProjectId = crypto.randomUUID();
  const projectName = String(payload.projectName || payload.name || sourceProject.name || "Transferred Project").trim();
  const sourceData = cloneJson<Record<string, unknown>>(sourceProject.data || {}, {});
  const sourceBlueprint = sourceData.businessBlueprint && typeof sourceData.businessBlueprint === "object"
    ? sourceData.businessBlueprint as Record<string, unknown>
    : null;
  const agencyClientMetadata = asRecord(agencyClient?.metadata);
  const relationshipAgencyOperatingSystem = asRecord(agencyClientMetadata.agencyOperatingSystem);
  const sourceAgencyOperatingSystem = asRecord(sourceBlueprint?.agencyOperatingSystem || sourceData.agencyOperatingSystem);
  const baseAgencyOperatingSystem = Object.keys(relationshipAgencyOperatingSystem).length > 0
    ? relationshipAgencyOperatingSystem
    : sourceAgencyOperatingSystem;
  const hasAgencyOperatingSystem = Object.keys(baseAgencyOperatingSystem).length > 0;
  const transferAgencyOperatingSystem = hasAgencyOperatingSystem
    ? cleanForInsert({
      ...cloneJson<Record<string, unknown>>(baseAgencyOperatingSystem, {}),
      source: "agency-project-transfer",
      status: "needs_review",
      updatedAt: now,
      draftOnly: true,
      needsReview: true,
      noRuntimeActivated: true,
      noAutoPublish: true,
      serviceAccessRequired: true,
      agencyTransfer: {
        agencyTenantId,
        clientTenantId: targetClientTenantId,
        originalProjectId: sourceProject.id,
        transferredProjectId: newProjectId,
        transferredAt: now,
        transferredBy: userId,
        transferMode: "copy",
      },
    })
    : null;
  const transferEnabledClient360ModuleIds = transferAgencyOperatingSystem
    ? uniqueStrings(asArray(transferAgencyOperatingSystem.enabledClient360ModuleIds))
    : [];
  const transferGeneratedModuleIds = transferAgencyOperatingSystem
    ? uniqueStrings(asArray(transferAgencyOperatingSystem.generatedModuleIds))
    : [];
  const transferClient360ModuleIds = transferAgencyOperatingSystem
    ? uniqueStrings(
      asArray(transferAgencyOperatingSystem.client360ModuleIds),
      AGENCY_ENGINE_CLIENT_360_MODULES.map((module) => module.id),
    )
    : [];
  const transferFoundationModuleIds = transferAgencyOperatingSystem
    ? uniqueStrings(
      asArray(transferAgencyOperatingSystem.foundationModuleIds),
      Array.from(AGENCY_ENGINE_FOUNDATION_MODULES),
    )
    : [];
  const transferAgencyPlanId = String(agencyClient?.agency_plan_id || clientTenant.billing?.agencyPlanId || "");
  const transferBillingMode = String(agencyClient?.billing_mode || clientTenant.billing?.mode || "");
  const transferMetadataBase = {
    agencyTenantId,
    clientTenantId: targetClientTenantId,
    originalProjectId: sourceProject.id,
    transferredProjectId: newProjectId,
    transferredAt: now,
    transferredBy: userId,
    transferMode: "copy",
    source: "agency-engine",
    agencyPlanId: transferAgencyPlanId || null,
    billingMode: transferBillingMode || null,
    agencyOperatingSystem: transferAgencyOperatingSystem,
    enabledClient360ModuleIds: transferEnabledClient360ModuleIds,
    generatedModuleIds: transferGeneratedModuleIds,
    client360ModuleIds: transferClient360ModuleIds,
    foundationModuleIds: transferFoundationModuleIds,
    serviceAccessRequired: true,
    noAutoPublish: true,
  };
  const transferSnapshot = createAgencyTransferSnapshot({
    sourceProject,
    sourceData,
    sourceBlueprint,
    targetProjectId: newProjectId,
    targetTenantId: targetClientTenantId,
    agencyTenantId,
    userId,
    now,
    transferMetadata: transferMetadataBase,
    projectName,
  }) as Record<string, unknown> & { id: string; createdAt: string };
  const transferMetadata = {
    ...transferMetadataBase,
    versionSnapshotId: transferSnapshot.id,
    versionHistoryPreserved: true,
  };
  const versionedSourceData = appendAgencyTransferSnapshot(sourceData, transferSnapshot);
  const nextBusinessBlueprint = sourceBlueprint
    ? {
      ...sourceBlueprint,
      projectId: newProjectId,
      tenantId: targetClientTenantId,
      status: "needs_review",
      generatedBy: "agency-project-transfer",
      agencyTransfer: transferMetadata,
      ...(transferAgencyOperatingSystem ? {
        agencyOperatingSystem: transferAgencyOperatingSystem,
        agencyProvisioning: {
          ...asRecord(sourceBlueprint.agencyProvisioning),
          agencyOperatingSystem: transferAgencyOperatingSystem,
          client360ModuleIds: transferEnabledClient360ModuleIds,
          foundationModuleIds: transferFoundationModuleIds,
          transferredFromAgency: true,
          transferMode: "copy",
          noRuntimeActivated: true,
          noAutoPublish: true,
        },
      } : {}),
      crossModuleSync: {
        ...(sourceBlueprint.crossModuleSync && typeof sourceBlueprint.crossModuleSync === "object"
          ? sourceBlueprint.crossModuleSync as Record<string, unknown>
          : {}),
        source: "agency-project-transfer",
        noRuntimeActivated: true,
        noAutoPublish: true,
        transferredAt: now,
      },
    }
    : undefined;
  const nextData = cleanForInsert({
    ...versionedSourceData,
    ...(nextBusinessBlueprint ? { businessBlueprint: nextBusinessBlueprint } : {}),
    transferredFrom: {
      agencyTenantId,
      originalProjectId: sourceProject.id,
      transferredAt: now,
      transferredBy: userId,
    },
    agencyTransfer: transferMetadata,
    ...(transferAgencyOperatingSystem ? { agencyOperatingSystem: transferAgencyOperatingSystem } : {}),
  });

  const { data: createdProject, error: insertError } = await supabase
    .from("projects")
    .insert(cleanForInsert({
      id: newProjectId,
      tenant_id: targetClientTenantId,
      user_id: clientTenant.owner_user_id || sourceProject.user_id || userId,
      name: projectName,
      thumbnail_url: sourceProject.thumbnail_url || null,
      favicon_url: sourceProject.favicon_url || null,
      status: "Draft",
      pages: cloneJson(sourceProject.pages || [], []),
      data: nextData,
      theme: cloneJson(sourceProject.theme || {}, {}),
      brand_identity: cloneJson(sourceProject.brand_identity || {}, {}),
      component_order: cloneJson(sourceProject.component_order || [], []),
      section_visibility: cloneJson(sourceProject.section_visibility || {}, {}),
      source_template_id: sourceProject.source_template_id || null,
      menus: cloneJson(sourceProject.menus || [], []),
      ai_assistant_config: cloneJson(sourceProject.ai_assistant_config || {}, {}),
      seo_config: cloneJson(sourceProject.seo_config || {}, {}),
      crm_config: cloneJson(sourceProject.crm_config || {}, {}),
      categories: sourceProject.categories ? cloneJson(sourceProject.categories, []) : undefined,
      description: sourceProject.description ?? undefined,
      category: sourceProject.category ?? undefined,
      tags: sourceProject.tags ?? undefined,
      industries: sourceProject.industries ?? undefined,
      is_archived: false,
      published_data: null,
      published_at: null,
      created_at: now,
      last_updated: now,
    }))
    .select("id")
    .single();

  if (insertError) throw insertError;

  const modulesCopied = await copyProjectModuleActivations({
    sourceProjectId: sourceProject.id,
    targetProjectId: createdProject.id,
    targetTenantId: targetClientTenantId,
    createdBy: userId,
  });
  const approvalId = await createProjectTransferApproval({
    agencyTenantId,
    clientTenantId: targetClientTenantId,
    projectId: createdProject.id,
    sourceProjectId: sourceProject.id,
    projectName,
    clientName: clientTenant.name,
    requestedBy: userId,
    modulesCopied,
    metadata: transferMetadata,
  });

  const transferRow = {
    agency_tenant_id: agencyTenantId,
    client_tenant_id: targetClientTenantId,
    source_project_id: sourceProject.id,
    target_project_id: createdProject.id,
    transfer_mode: "copy",
    status: "completed",
    transferred_by: userId,
    metadata: {
      ...transferMetadata,
      sourceProjectName: sourceProject.name,
      targetProjectName: projectName,
      modulesCopied,
      copiedAsDraft: true,
      approvalId,
    },
    created_at: now,
    updated_at: now,
  };
  const { error: transferError } = await supabase
    .from("agency_project_transfers")
    .upsert(transferRow, { onConflict: "agency_tenant_id,source_project_id,target_project_id" });
  if (transferError && !isMissingTableError(transferError)) throw transferError;

  const nextProjectCount = (currentProjects || 0) + 1;
  const { error: clientUpdateError } = await supabase
    .from("agency_clients")
    .update({
      project_count: nextProjectCount,
      primary_project_id: agencyClient?.primary_project_id || createdProject.id,
      updated_at: now,
    })
    .eq("agency_tenant_id", agencyTenantId)
    .eq("client_tenant_id", targetClientTenantId);
  if (clientUpdateError && !isMissingTableError(clientUpdateError)) throw clientUpdateError;

  await supabase
    .from("tenants")
    .update({
      usage: {
        ...(clientTenant.usage || {}),
        projectCount: nextProjectCount,
      },
      updated_at: now,
    })
    .eq("id", targetClientTenantId);

  const { error: activityError } = await supabase.from("agency_activity").insert({
    agency_tenant_id: agencyTenantId,
    client_tenant_id: targetClientTenantId,
    project_id: createdProject.id,
    type: "project_transferred",
    title: `Proyecto transferido: ${projectName}`,
    description: `Agency Engine transfirió ${projectName} a ${clientTenant.name || "cliente"} como borrador.`,
    metadata: {
      ...transferMetadata,
      modulesCopied,
      approvalId,
      accessDecision: access.decision.reasonCode,
      sourceProjectName: sourceProject.name,
      targetProjectName: projectName,
    },
    created_by: userId,
    created_at: now,
  });
  if (activityError && !isMissingTableError(activityError)) throw activityError;

  return {
    success: true,
    agencyTenantId,
    sourceProjectId: sourceProject.id,
    targetClientTenantId,
    newProjectId: createdProject.id,
    modulesCopied,
    message: `Proyecto "${projectName}" transferido a ${clientTenant.name || "cliente"} como borrador.`,
    transferSummary: {
      copiedAsDraft: true,
      published: false,
      businessBlueprintUpdated: Boolean(nextBusinessBlueprint),
      agencyOperatingSystemAttached: Boolean(transferAgencyOperatingSystem),
      agencyPlanId: transferAgencyPlanId || null,
      billingMode: transferBillingMode || null,
      enabledClient360ModuleIds: transferEnabledClient360ModuleIds,
      generatedModuleIds: transferGeneratedModuleIds,
      client360ModuleIds: transferClient360ModuleIds,
      serviceAccessRequired: true,
      noAutoPublish: true,
      moduleActivationsCopied: modulesCopied > 0,
      approvalRequested: Boolean(approvalId),
      currentProjects: nextProjectCount,
      maxProjects,
    },
  };
}

async function respondClientApproval(req: Request, userId: string, payload: Record<string, unknown>) {
  const approvalId = String(payload.approvalId || "");
  const decision = normalizeApprovalDecision(payload.decision);
  const responseNote = String(payload.responseNote || payload.note || "").trim();

  if (!approvalId) throw new Error("approvalId is required");

  const { data: approval, error: approvalError } = await supabase
    .from("agency_client_approvals")
    .select("*")
    .eq("id", approvalId)
    .maybeSingle();

  if (approvalError) throw approvalError;
  if (!approval) throw new Error("Approval request not found");
  if (approval.status !== "pending") throw new Error("This approval request is no longer pending");

  await requireServiceAccess(req, {
    tenantId: approval.client_tenant_id,
    moduleId: "agency-client-portal",
    serviceId: "agency",
    action: "agency-client-approval-response",
  });

  const [{ data: membership, error: membershipError }, { data: clientTenant, error: tenantError }] = await Promise.all([
    supabase
      .from("tenant_members")
      .select("tenant_id, user_id, role")
      .eq("tenant_id", approval.client_tenant_id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("id, name, owner_user_id")
      .eq("id", approval.client_tenant_id)
      .maybeSingle(),
  ]);

  if (membershipError) throw membershipError;
  if (tenantError) throw tenantError;
  if (!membership && clientTenant?.owner_user_id !== userId) {
    throw new Error("You do not have access to this client portal");
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("agency_client_approvals")
    .update({
      status: decision,
      response_note: responseNote || null,
      responded_by: userId,
      responded_at: now,
      updated_at: now,
      metadata: {
        ...(approval.metadata && typeof approval.metadata === "object" ? approval.metadata as Record<string, unknown> : {}),
        responseSource: "client-portal",
        respondedAt: now,
      },
    })
    .eq("id", approvalId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (updateError) throw updateError;

  const decisionLabel = decision === "approved"
    ? "aprobó"
    : decision === "rejected"
      ? "rechazó"
      : "pidió cambios en";

  const { error: activityError } = await supabase.from("agency_activity").insert({
    agency_tenant_id: updated.agency_tenant_id,
    client_tenant_id: updated.client_tenant_id,
    project_id: updated.project_id,
    type: "approval_responded",
    title: `Respuesta de aprobación: ${updated.title}`,
    description: `${clientTenant?.name || "El cliente"} ${decisionLabel} ${updated.title}.`,
    metadata: {
      approvalId,
      decision,
      responseNote,
      source: "client-portal",
    },
    created_by: userId,
    created_at: now,
  });
  if (activityError && !isMissingTableError(activityError)) throw activityError;

  return {
    success: true,
    approvalId,
    status: updated.status,
    respondedAt: updated.responded_at,
  };
}

type RegistrarLookup = {
  name: string;
  available: boolean;
  price: number | null;
  renewalPrice: number | null;
  premium: boolean;
  originalPrice?: number;
};

const DOMAIN_SEARCH_PRIORITY_TLDS = [".com", ".net", ".org", ".io", ".co"];
const DOMAIN_SEARCH_SECONDARY_TLDS = [".app", ".dev", ".shop", ".store", ".online", ".site", ".tech", ".xyz"];
const DOMAIN_SEARCH_PREFIXES = [""];
const MAX_DOMAIN_LOOKUPS = 12;
const MAX_DOMAIN_PRICE_LOOKUPS = 8;

function getDomainPurchaseUnavailableMessage() {
  return "Domain purchase checkout is disabled while the registrar order flow is migrated. Connect an existing domain instead.";
}

function getDomainPurchaseUnavailableResponse() {
  return {
    sessionId: "",
    url: "",
    orderId: "",
    purchaseAvailable: false,
    message: getDomainPurchaseUnavailableMessage(),
  };
}

async function searchDomainSuggestions(payload: Record<string, unknown>) {
  const keyword = cleanDomainKeyword(String(payload.keyword || ""));
  if (!keyword) throw new Error("keyword is required");

  const domainsToCheck = buildDomainSuggestions(keyword);
  const lookups = await lookupRegistrarDomains(domainsToCheck);

  return {
    available: lookups.filter((domain) => domain.available),
    unavailable: lookups
      .filter((domain) => !domain.available)
      .map((domain) => ({
        name: domain.name,
        available: false,
        price: null,
        premium: false,
      })),
    keyword,
  };
}

async function checkDomainAvailability(payload: Record<string, unknown>) {
  const requestedDomains = Array.isArray(payload.domains) ? payload.domains : [];
  const domains = Array.from(new Set(
    requestedDomains
      .map((domain) => normalizeDomain(String(domain || "")))
      .filter((domain) => {
        try {
          assertValidDomain(domain);
          return true;
        } catch {
          return false;
        }
      }),
  )).slice(0, MAX_DOMAIN_LOOKUPS);

  if (domains.length === 0) {
    throw new Error("domains array is required");
  }

  const lookups = await lookupRegistrarDomains(domains);
  return {
    results: lookups.map((domain) => ({
      domainName: domain.name,
      purchasable: domain.available,
      purchasePrice: domain.price ?? undefined,
      renewalPrice: domain.renewalPrice ?? undefined,
      premium: domain.premium,
      originalPrice: domain.originalPrice,
    })),
  };
}

async function getDomainRegistrarPricing() {
  const sampleDomains = DOMAIN_SEARCH_PRIORITY_TLDS
    .concat([".app", ".dev"])
    .map((tld) => `quimera-domain-price-check${tld}`);

  const pricing = await Promise.all(sampleDomains.map(async (domain) => {
    const tld = "." + domain.split(".").slice(1).join(".");
    const priceData = await getVercelRegistrarPrice(domain);
    return {
      tld,
      registrationPrice: readRegistrarPrice(priceData, "purchasePrice"),
      renewalPrice: readRegistrarPrice(priceData, "renewalPrice"),
    };
  }));

  return { pricing };
}

function cleanDomainKeyword(keyword: string) {
  return keyword
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildDomainSuggestions(keyword: string) {
  const domains: string[] = [];
  const tlds = [...DOMAIN_SEARCH_PRIORITY_TLDS, ...DOMAIN_SEARCH_SECONDARY_TLDS];

  for (const prefix of DOMAIN_SEARCH_PREFIXES) {
    for (const tld of tlds) {
      const label = `${prefix}${keyword}`;
      const domain = `${label}${tld}`;
      if (label.length <= 63 && !domains.includes(domain)) {
        domains.push(domain);
      }
      if (domains.length >= MAX_DOMAIN_LOOKUPS) return domains;
    }
  }

  return domains;
}

async function lookupRegistrarDomains(domains: string[]): Promise<RegistrarLookup[]> {
  const uniqueDomains = Array.from(new Set(domains.map((domain) => normalizeDomain(domain)))).slice(0, MAX_DOMAIN_LOOKUPS);
  let availabilityByDomain = await getVercelRegistrarBulkAvailability(uniqueDomains);

  if (!availabilityByDomain) {
    const fallbackAvailability = await Promise.all(uniqueDomains.map(async (domain) => ({
      domain,
      available: await getVercelRegistrarAvailability(domain),
    })));
    availabilityByDomain = new Map(fallbackAvailability.map((item) => [item.domain, item.available]));
  }

  const domainsForPricing = uniqueDomains
    .filter((domain) => availabilityByDomain?.get(domain) === true)
    .slice(0, MAX_DOMAIN_PRICE_LOOKUPS);
  const prices = await Promise.all(domainsForPricing.map(async (domain) => ({
    domain,
    data: await getVercelRegistrarPrice(domain),
  })));
  const priceByDomain = new Map(prices.map((item) => [item.domain, item.data]));

  return uniqueDomains.map((domain) => {
    const available = availabilityByDomain?.get(domain) === true;
    const priceData = available ? priceByDomain.get(domain) || null : null;
    const price = readRegistrarPrice(priceData, "purchasePrice");
    const renewalPrice = readRegistrarPrice(priceData, "renewalPrice");

    return {
      name: domain,
      available,
      price,
      renewalPrice,
      premium: Boolean((priceData as any)?.premium),
      ...(price !== null ? { originalPrice: price } : {}),
    };
  });
}

async function lookupRegistrarDomain(domain: string): Promise<RegistrarLookup> {
  const availability = await getVercelRegistrarAvailability(domain);
  const available = availability === true;
  const priceData = available ? await getVercelRegistrarPrice(domain) : null;
  const price = readRegistrarPrice(priceData, "purchasePrice");
  const renewalPrice = readRegistrarPrice(priceData, "renewalPrice");

  return {
    name: domain,
    available,
    price,
    renewalPrice,
    premium: Boolean((priceData as any)?.premium),
    ...(price !== null ? { originalPrice: price } : {}),
  };
}

async function getVercelRegistrarBulkAvailability(domains: string[]): Promise<Map<string, boolean> | null> {
  const response = await vercelFetch("/v1/registrar/domains/availability", {
    method: "POST",
    body: JSON.stringify({ domains }),
  });
  const data = await readJson(response);

  if (!response.ok) {
    if (response.status === 400) return null;
    const message = data?.message || data?.error?.message || response.statusText;
    throw new Error(`Vercel could not check domain availability: ${message}`);
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  return new Map(results.map((item: Record<string, unknown>) => [
    normalizeDomain(String(item.domain || item.name || "")),
    item.available === true || item.available === "true",
  ]));
}

async function getVercelRegistrarAvailability(domain: string): Promise<boolean> {
  const response = await vercelFetch(`/v1/registrar/domains/${encodeURIComponent(domain)}/availability`, {
    method: "GET",
  });
  const data = await readJson(response);

  if (!response.ok) {
    const message = data?.message || data?.error?.message || response.statusText;
    if (response.status === 400 || response.status === 404) return false;
    throw new Error(`Vercel could not check ${domain}: ${message}`);
  }

  return data?.available === true || data?.available === "true";
}

async function getVercelRegistrarPrice(domain: string): Promise<Record<string, unknown> | null> {
  const response = await vercelFetch(`/v1/registrar/domains/${encodeURIComponent(domain)}/price?years=1`, {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  return await readJson(response);
}

function readRegistrarPrice(data: unknown, key: "purchasePrice" | "renewalPrice") {
  const value = (data as any)?.[key];
  const candidates = [
    value,
    value?.value,
    value?.amount,
    value?.price,
    value?.usd,
  ];

  for (const candidate of candidates) {
    const parsed = parsePriceNumber(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
}

function parsePriceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeRegistrarAmount(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? normalizeRegistrarAmount(parsed) : null;
  }
  return null;
}

function normalizeRegistrarAmount(value: number) {
  const amount = value > 100 ? value / 100 : value;
  return Math.round(amount * 100) / 100;
}

async function addDomain(req: Request, userId: string, payload: Record<string, unknown>) {
  const domain = normalizeDomain(String(payload.domain || ""));
  const projectId = String(payload.projectId || "");

  assertValidDomain(domain);

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const project = await getAuthorizedProject(userId, projectId);
  const { count: currentDomains } = await supabase
    .from("custom_domains")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  await requireServiceAccess(req, {
    tenantId: project.tenant_id || undefined,
    projectId,
    moduleId: "domains-management",
    serviceId: "domains",
    featureKey: "customDomains",
    requiredPermission: "canManageDomains",
    requestedUsage: { resource: "domains", amount: 1, used: currentDomains || 0 },
    action: "domains-add",
  });
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

async function removeDomain(req: Request, userId: string, payload: Record<string, unknown>) {
  const domain = normalizeDomain(String(payload.domain || ""));
  assertValidDomain(domain);

  const domainRow = await getAuthorizedDomain(userId, domain);
  const projectId = domainRow.project_id || domainRow.data?.projectId || domainRow.data?.project_id;
  const project = projectId ? await getAuthorizedProject(userId, projectId) : null;
  await requireServiceAccess(req, {
    tenantId: project?.tenant_id || domainRow.project_tenant_id || domainRow.data?.projectTenantId || undefined,
    projectId: projectId || undefined,
    moduleId: "domains-management",
    serviceId: "domains",
    featureKey: "customDomains",
    requiredPermission: "canManageDomains",
    action: "domains-remove",
  });
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

async function syncDomainMapping(req: Request, userId: string, payload: Record<string, unknown>) {
  const domain = normalizeDomain(String(payload.domain || ""));
  assertValidDomain(domain);

  const domainRow = await getAuthorizedDomain(userId, domain);
  const projectId = domainRow.project_id || domainRow.data?.projectId || domainRow.data?.project_id;
  
  if (!projectId) throw new Error("Project ID not found for this domain");

  const project = await getAuthorizedProject(userId, projectId);
  await requireServiceAccess(req, {
    tenantId: project.tenant_id || undefined,
    projectId,
    moduleId: "domains-management",
    serviceId: "domains",
    featureKey: "customDomains",
    requiredPermission: "canManageDomains",
    action: "sync-domain-mapping",
  });
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
  const statusError = status === "error" ? getDomainErrorMessage(config) : null;
  
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
    error: statusError,
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
    error: statusError,
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
    Deno.env.get("VERCEL_PROJECT_NAME");

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("Vercel request timed out"), 3500);

  if (teamId) {
    url.searchParams.set("teamId", teamId);
  } else if (slug) {
    url.searchParams.set("slug", slug);
  }

  try {
    return await fetch(url.toString(), {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
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

function getDomainErrorMessage(config: Record<string, unknown> | null): string {
  const errors = (config as any)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    const message = first?.message || first?.error || first?.reason;
    if (message) return String(message);
  }

  return "El DNS no apunta a Vercel. Configura el A record de @ hacia 76.76.21.21 y el CNAME de www hacia cname.vercel-dns.com.";
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
