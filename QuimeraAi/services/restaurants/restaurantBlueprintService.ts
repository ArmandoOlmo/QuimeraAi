import type {
  RestaurantBlueprint,
  RestaurantMenuItemDraftBlueprint,
} from '../../types/businessBlueprint';
import type {
  RestaurantMenuItem,
  RestaurantSettings,
} from '../../types/restaurants';
import {
  createMenuItem,
  getMenuItems,
  syncPublicMenuItems,
  updateMenuItem,
} from './restaurantMenuService';
import {
  createRestaurant,
  getRestaurants,
  syncPublicRestaurant,
  updateRestaurant,
} from './restaurantService';
import {
  getRestaurantTenantId,
  type RestaurantScope,
} from './restaurantPaths';

export interface RestaurantBlueprintSyncOptions {
  dryRun?: boolean;
  overwriteExisting?: boolean;
  updateExistingGenerated?: boolean;
  now?: string;
}

export interface RestaurantBlueprintRepository {
  listRestaurants(scope: RestaurantScope): Promise<RestaurantSettings[]>;
  createRestaurant(scope: RestaurantScope, data: Partial<RestaurantSettings>): Promise<string>;
  updateRestaurant(scope: RestaurantScope, restaurantId: string, data: Partial<RestaurantSettings>): Promise<void>;
  listMenuItems(scope: RestaurantScope, restaurantId: string): Promise<RestaurantMenuItem[]>;
  createMenuItem(scope: RestaurantScope, restaurantId: string, data: Partial<RestaurantMenuItem>): Promise<string>;
  updateMenuItem(scope: RestaurantScope, restaurantId: string, itemId: string, data: Partial<RestaurantMenuItem>): Promise<void>;
  syncPublicRestaurant(scope: RestaurantScope, restaurantId: string): Promise<void>;
  syncPublicMenuItems(scope: RestaurantScope, restaurantId: string): Promise<void>;
}

export type RestaurantBlueprintSyncActionType =
  | 'create_restaurant'
  | 'update_restaurant_settings'
  | 'create_menu_item'
  | 'update_menu_item'
  | 'skip_menu_item'
  | 'sync_public_menu'
  | 'preview_ecommerce_offer'
  | 'preview_integration';

export interface RestaurantBlueprintSyncAction {
  type: RestaurantBlueprintSyncActionType;
  status: 'planned' | 'created' | 'updated' | 'skipped' | 'previewed';
  name: string;
  restaurantId?: string;
  itemId?: string;
  syncKey?: string;
  reason?: string;
}

export interface RestaurantBlueprintSyncPreview {
  restaurantName: string;
  restaurantId?: string;
  wouldCreateRestaurant: boolean;
  wouldUpdateRestaurant: boolean;
  categoriesCount: number;
  menuItemsCount: number;
  menuItemsToCreate: number;
  menuItemsToUpdate: number;
  menuItemsToSkip: number;
  reservationsEnabled: boolean;
  publicMenuEnabled: boolean;
  ecommerceOffers: string[];
  integrations: {
    chatbotKnowledgeSources: number;
    crmLeadSources: number;
    emailFlows: number;
    analyticsEvents: number;
    financeRevenueSources: number;
    automationFlows: number;
  };
}

export interface RestaurantBlueprintSyncSummary {
  dryRun: boolean;
  restaurantCreated: number;
  restaurantUpdated: number;
  menuItemsCreated: number;
  menuItemsUpdated: number;
  menuItemsSkipped: number;
  publicMenuSynced: boolean;
  ecommerceOffersPreviewed: number;
  integrationDraftsPreviewed: number;
  needsMerchantReview: true;
  noPublishedContent: true;
}

export interface RestaurantBlueprintSyncResult {
  restaurantId?: string;
  preview: RestaurantBlueprintSyncPreview;
  actions: RestaurantBlueprintSyncAction[];
  warnings: string[];
  errors: string[];
  summary: RestaurantBlueprintSyncSummary;
}

export interface RestaurantBlueprintPlanInput {
  scope: RestaurantScope;
  blueprint: RestaurantBlueprint;
  existingRestaurants?: RestaurantSettings[];
  existingMenuItems?: RestaurantMenuItem[];
  restaurantId?: string;
  options?: RestaurantBlueprintSyncOptions;
}

const defaultRepository: RestaurantBlueprintRepository = {
  listRestaurants: getRestaurants,
  createRestaurant,
  updateRestaurant,
  listMenuItems: getMenuItems,
  createMenuItem,
  updateMenuItem,
  syncPublicRestaurant,
  syncPublicMenuItems,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'restaurant';
}

function normalizeKey(value: string): string {
  return slugify(value).toLowerCase();
}

function restaurantSyncKey(blueprint: RestaurantBlueprint): string {
  return `ai-studio-restaurant:${slugify(blueprint.profile.publicSlug || blueprint.profile.name)}`;
}

function menuItemSyncKey(blueprint: RestaurantBlueprint, item: RestaurantMenuItemDraftBlueprint): string {
  return `${restaurantSyncKey(blueprint)}:menu:${item.id || slugify(`${item.category}-${item.name}`)}`;
}

function getMetadataFlag(value: unknown, key: 'userModified' | 'lockedFromRegeneration'): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record[key] === true || (record.metadata as Record<string, unknown> | undefined)?.[key] === true;
}

function isProtectedRestaurant(restaurant?: RestaurantSettings): boolean {
  return Boolean(
    restaurant?.userModified ||
    restaurant?.lockedFromRegeneration ||
    getMetadataFlag(restaurant, 'userModified') ||
    getMetadataFlag(restaurant, 'lockedFromRegeneration')
  );
}

function isProtectedMenuItem(item?: RestaurantMenuItem): boolean {
  return Boolean(
    item?.userModified ||
    item?.lockedFromRegeneration ||
    getMetadataFlag(item, 'userModified') ||
    getMetadataFlag(item, 'lockedFromRegeneration')
  );
}

function findRestaurantMatch(
  blueprint: RestaurantBlueprint,
  existingRestaurants: RestaurantSettings[],
  explicitRestaurantId?: string,
): RestaurantSettings | undefined {
  const syncKey = restaurantSyncKey(blueprint);
  const slug = normalizeKey(blueprint.profile.publicSlug || blueprint.profile.name);
  const name = normalizeKey(blueprint.profile.name);

  return existingRestaurants.find(restaurant => {
    if (explicitRestaurantId && restaurant.id === explicitRestaurantId) return true;
    if (restaurant.syncKey && restaurant.syncKey === syncKey) return true;
    if (restaurant.blueprintId && restaurant.blueprintId === syncKey) return true;
    if (restaurant.publicSlug && normalizeKey(restaurant.publicSlug) === slug) return true;
    return normalizeKey(restaurant.name || '') === name;
  });
}

function findMenuItemMatch(
  blueprint: RestaurantBlueprint,
  draft: RestaurantMenuItemDraftBlueprint,
  existingItems: RestaurantMenuItem[],
): RestaurantMenuItem | undefined {
  const syncKey = menuItemSyncKey(blueprint, draft);
  const name = normalizeKey(draft.name);
  const category = normalizeKey(draft.category);

  return existingItems.find(item => {
    if (item.syncKey && item.syncKey === syncKey) return true;
    if (item.blueprintItemId && item.blueprintItemId === draft.id) return true;
    return normalizeKey(item.name || '') === name && normalizeKey(item.category || '') === category;
  });
}

function enabledOfferNames(blueprint: RestaurantBlueprint): string[] {
  return Object.entries(blueprint.ecommerceOffers)
    .filter(([, offer]) => offer.enabled && offer.status !== 'disabled')
    .map(([key]) => key);
}

function restaurantPayload(
  scope: RestaurantScope,
  blueprint: RestaurantBlueprint,
): Partial<RestaurantSettings> {
  return {
    tenantId: getRestaurantTenantId(scope),
    ownerId: scope.userId,
    name: blueprint.profile.name,
    logoUrl: blueprint.profile.logoUrl || '',
    heroImageUrl: blueprint.profile.heroImageUrl || '',
    cuisineType: blueprint.profile.cuisineType,
    address: blueprint.profile.address,
    phone: blueprint.profile.phone,
    hours: blueprint.profile.hours,
    reservationEnabled: blueprint.reservations.enabled,
    maxPartySize: blueprint.reservations.maxPartySize,
    reservationInterval: blueprint.reservations.reservationInterval,
    averageTableDuration: blueprint.reservations.averageTableDuration,
    languagesEnabled: blueprint.profile.languagesEnabled,
    currency: blueprint.profile.currency,
    qrMenuEnabled: blueprint.publicMenu.qrMenuEnabled,
    publicSlug: blueprint.profile.publicSlug || slugify(blueprint.profile.name),
    source: 'ai-studio',
    syncKey: restaurantSyncKey(blueprint),
    blueprintId: restaurantSyncKey(blueprint),
    generatedByAI: true,
    needsReview: true,
    userModified: false,
    lockedFromRegeneration: false,
  };
}

function menuItemPayload(
  scope: RestaurantScope,
  restaurantId: string,
  blueprint: RestaurantBlueprint,
  draft: RestaurantMenuItemDraftBlueprint,
  index: number,
): Partial<RestaurantMenuItem> {
  return {
    tenantId: getRestaurantTenantId(scope),
    restaurantId,
    name: draft.name,
    description: draft.description,
    category: draft.category,
    price: Number(draft.suggestedPrice || 0),
    currency: draft.currency || blueprint.profile.currency || 'USD',
    imageUrl: draft.imageUrl || '',
    dietaryTags: [],
    allergens: draft.allergens,
    ingredients: draft.ingredients,
    isAvailable: false,
    isFeatured: draft.isFeatured,
    upsellItems: blueprint.menuDraft.upsells || [],
    aiGenerated: true,
    generatedByAI: true,
    needsReview: true,
    userModified: false,
    lockedFromRegeneration: draft.lockedFromRegeneration || false,
    source: 'ai-studio',
    blueprintItemId: draft.id,
    syncKey: menuItemSyncKey(blueprint, draft),
    priceSource: draft.priceSource,
    publishStatus: 'not_published',
    availabilityStatus: 'draft',
    position: index,
  };
}

function createSummary(dryRun: boolean): RestaurantBlueprintSyncSummary {
  return {
    dryRun,
    restaurantCreated: 0,
    restaurantUpdated: 0,
    menuItemsCreated: 0,
    menuItemsUpdated: 0,
    menuItemsSkipped: 0,
    publicMenuSynced: false,
    ecommerceOffersPreviewed: 0,
    integrationDraftsPreviewed: 0,
    needsMerchantReview: true,
    noPublishedContent: true,
  };
}

export function planRestaurantBlueprintSync(input: RestaurantBlueprintPlanInput): RestaurantBlueprintSyncResult {
  const { scope, blueprint } = input;
  const dryRun = input.options?.dryRun !== false;
  const summary = createSummary(dryRun);
  const warnings: string[] = [];
  const errors: string[] = [];
  const actions: RestaurantBlueprintSyncAction[] = [];

  if (!blueprint.enabled) {
    warnings.push('Restaurant blueprint is disabled; no restaurant data will be created.');
  }

  const existingRestaurant = findRestaurantMatch(blueprint, input.existingRestaurants || [], input.restaurantId);
  const restaurantId = existingRestaurant?.id || input.restaurantId;
  const wouldCreateRestaurant = Boolean(blueprint.enabled && !existingRestaurant && !input.restaurantId);
  const wouldUpdateRestaurant = Boolean(blueprint.enabled && (existingRestaurant || input.restaurantId) && !isProtectedRestaurant(existingRestaurant));

  if (wouldCreateRestaurant) {
    actions.push({
      type: 'create_restaurant',
      status: 'planned',
      name: blueprint.profile.name,
      syncKey: restaurantSyncKey(blueprint),
    });
  } else if (wouldUpdateRestaurant) {
    actions.push({
      type: 'update_restaurant_settings',
      status: 'planned',
      name: blueprint.profile.name,
      restaurantId,
      syncKey: restaurantSyncKey(blueprint),
    });
  } else if (isProtectedRestaurant(existingRestaurant)) {
    warnings.push('Existing restaurant is user-modified or locked from regeneration; profile/settings updates will be skipped.');
  }

  const targetRestaurantId = restaurantId || 'pending_restaurant_id';
  const menuItems = blueprint.enabled ? blueprint.menuDraft.items : [];
  menuItems.forEach((draft, index) => {
    const existingItem = findMenuItemMatch(blueprint, draft, input.existingMenuItems || []);
    const syncKey = menuItemSyncKey(blueprint, draft);

    if (!existingItem) {
      actions.push({
        type: 'create_menu_item',
        status: 'planned',
        name: draft.name,
        restaurantId: targetRestaurantId,
        syncKey,
      });
      summary.menuItemsCreated += 1;
      return;
    }

    if (isProtectedMenuItem(existingItem) || draft.lockedFromRegeneration) {
      actions.push({
        type: 'skip_menu_item',
        status: 'skipped',
        name: draft.name,
        restaurantId: targetRestaurantId,
        itemId: existingItem.id,
        syncKey,
        reason: 'user_modified_or_locked',
      });
      summary.menuItemsSkipped += 1;
      return;
    }

    if (input.options?.overwriteExisting || input.options?.updateExistingGenerated) {
      actions.push({
        type: 'update_menu_item',
        status: 'planned',
        name: draft.name,
        restaurantId: targetRestaurantId,
        itemId: existingItem.id,
        syncKey,
      });
      summary.menuItemsUpdated += 1;
      return;
    }

    actions.push({
      type: 'skip_menu_item',
      status: 'skipped',
      name: draft.name,
      restaurantId: targetRestaurantId,
      itemId: existingItem.id,
      syncKey,
      reason: 'already_exists',
    });
    summary.menuItemsSkipped += 1;
  });

  if (blueprint.publicMenu.enabled) {
    actions.push({
      type: 'sync_public_menu',
      status: 'planned',
      name: 'Public QR menu mirror',
      restaurantId: targetRestaurantId,
      syncKey: restaurantSyncKey(blueprint),
    });
  }

  enabledOfferNames(blueprint).forEach(name => {
    actions.push({
      type: 'preview_ecommerce_offer',
      status: 'previewed',
      name,
      restaurantId: targetRestaurantId,
      reason: 'Ecommerce offer remains draft/needsReview.',
    });
    summary.ecommerceOffersPreviewed += 1;
  });

  const integrationDrafts = [
    ...blueprint.integrations.chatbotKnowledgeSources,
    ...blueprint.integrations.crmLeadSources,
    ...blueprint.integrations.emailFlows,
    ...blueprint.integrations.analyticsEvents,
    ...blueprint.integrations.financeRevenueSources,
    ...blueprint.integrations.automationFlows,
  ];
  summary.integrationDraftsPreviewed = integrationDrafts.length;
  if (integrationDrafts.length > 0) {
    actions.push({
      type: 'preview_integration',
      status: 'previewed',
      name: `${integrationDrafts.length} integration drafts`,
      restaurantId: targetRestaurantId,
      reason: 'Cross-module runtime writes are not activated by Restaurant Engine draft sync.',
    });
  }

  summary.restaurantCreated = wouldCreateRestaurant ? 1 : 0;
  summary.restaurantUpdated = wouldUpdateRestaurant ? 1 : 0;
  summary.publicMenuSynced = blueprint.publicMenu.enabled;

  const preview: RestaurantBlueprintSyncPreview = {
    restaurantName: blueprint.profile.name,
    restaurantId,
    wouldCreateRestaurant,
    wouldUpdateRestaurant,
    categoriesCount: blueprint.menuDraft.categories.length,
    menuItemsCount: menuItems.length,
    menuItemsToCreate: actions.filter(action => action.type === 'create_menu_item').length,
    menuItemsToUpdate: actions.filter(action => action.type === 'update_menu_item').length,
    menuItemsToSkip: actions.filter(action => action.type === 'skip_menu_item').length,
    reservationsEnabled: blueprint.reservations.enabled,
    publicMenuEnabled: blueprint.publicMenu.enabled,
    ecommerceOffers: enabledOfferNames(blueprint),
    integrations: {
      chatbotKnowledgeSources: blueprint.integrations.chatbotKnowledgeSources.length,
      crmLeadSources: blueprint.integrations.crmLeadSources.length,
      emailFlows: blueprint.integrations.emailFlows.length,
      analyticsEvents: blueprint.integrations.analyticsEvents.length,
      financeRevenueSources: blueprint.integrations.financeRevenueSources.length,
      automationFlows: blueprint.integrations.automationFlows.length,
    },
  };

  void scope;

  return {
    restaurantId,
    preview,
    actions,
    warnings,
    errors,
    summary,
  };
}

async function loadPlanInput(
  scope: RestaurantScope,
  blueprint: RestaurantBlueprint,
  repository: RestaurantBlueprintRepository,
  options: RestaurantBlueprintSyncOptions = {},
): Promise<RestaurantBlueprintPlanInput> {
  const existingRestaurants = await repository.listRestaurants(scope);
  const existingRestaurant = findRestaurantMatch(blueprint, existingRestaurants);
  const restaurantId = existingRestaurant?.id;
  const existingMenuItems = restaurantId
    ? await repository.listMenuItems(scope, restaurantId)
    : [];

  return {
    scope,
    blueprint,
    existingRestaurants,
    existingMenuItems,
    restaurantId,
    options,
  };
}

export async function previewRestaurantBlueprintSync(
  scope: RestaurantScope,
  blueprint: RestaurantBlueprint,
  options: RestaurantBlueprintSyncOptions = {},
  repository: RestaurantBlueprintRepository = defaultRepository,
): Promise<RestaurantBlueprintSyncResult> {
  const input = await loadPlanInput(scope, blueprint, repository, { ...options, dryRun: true });
  return planRestaurantBlueprintSync(input);
}

export async function createRestaurantFromBlueprint(
  scope: RestaurantScope,
  blueprint: RestaurantBlueprint,
  repository: RestaurantBlueprintRepository = defaultRepository,
): Promise<string> {
  const existingRestaurants = await repository.listRestaurants(scope);
  const existing = findRestaurantMatch(blueprint, existingRestaurants);
  if (existing) return existing.id;
  return repository.createRestaurant(scope, restaurantPayload(scope, blueprint));
}

export async function createMenuDraftsFromBlueprint(
  scope: RestaurantScope,
  restaurantId: string,
  blueprint: RestaurantBlueprint,
  options: RestaurantBlueprintSyncOptions = {},
  repository: RestaurantBlueprintRepository = defaultRepository,
): Promise<RestaurantBlueprintSyncAction[]> {
  const existingMenuItems = await repository.listMenuItems(scope, restaurantId);
  const plan = planRestaurantBlueprintSync({
    scope,
    blueprint,
    existingRestaurants: [],
    existingMenuItems,
    restaurantId,
    options: { ...options, dryRun: false },
  });
  const actions: RestaurantBlueprintSyncAction[] = [];

  for (const action of plan.actions) {
    if (action.type === 'create_menu_item') {
      const draft = blueprint.menuDraft.items.find(item => menuItemSyncKey(blueprint, item) === action.syncKey);
      if (!draft) continue;
      const createdId = await repository.createMenuItem(
        scope,
        restaurantId,
        menuItemPayload(scope, restaurantId, blueprint, draft, blueprint.menuDraft.items.indexOf(draft)),
      );
      actions.push({ ...action, status: 'created', itemId: createdId, restaurantId });
    } else if (action.type === 'update_menu_item' && action.itemId) {
      const draft = blueprint.menuDraft.items.find(item => menuItemSyncKey(blueprint, item) === action.syncKey);
      if (!draft) continue;
      await repository.updateMenuItem(
        scope,
        restaurantId,
        action.itemId,
        menuItemPayload(scope, restaurantId, blueprint, draft, blueprint.menuDraft.items.indexOf(draft)),
      );
      actions.push({ ...action, status: 'updated', restaurantId });
    } else if (action.type === 'skip_menu_item') {
      actions.push({ ...action, restaurantId });
    }
  }

  return actions;
}

export async function createReservationSettingsFromBlueprint(
  scope: RestaurantScope,
  restaurantId: string,
  blueprint: RestaurantBlueprint,
  repository: RestaurantBlueprintRepository = defaultRepository,
): Promise<void> {
  await repository.updateRestaurant(scope, restaurantId, restaurantPayload(scope, blueprint));
}

export async function createPublicMenuFromBlueprint(
  scope: RestaurantScope,
  restaurantId: string,
  _blueprint: RestaurantBlueprint,
  repository: RestaurantBlueprintRepository = defaultRepository,
): Promise<void> {
  await repository.syncPublicRestaurant(scope, restaurantId);
  await repository.syncPublicMenuItems(scope, restaurantId);
}

export async function applyRestaurantBlueprintDraft(
  scope: RestaurantScope,
  blueprint: RestaurantBlueprint,
  options: RestaurantBlueprintSyncOptions = {},
  repository: RestaurantBlueprintRepository = defaultRepository,
): Promise<RestaurantBlueprintSyncResult> {
  const dryRun = options.dryRun === true;
  if (dryRun) return previewRestaurantBlueprintSync(scope, blueprint, options, repository);

  const initialInput = await loadPlanInput(scope, blueprint, repository, { ...options, dryRun: false });
  const initialPlan = planRestaurantBlueprintSync(initialInput);
  if (!blueprint.enabled) return initialPlan;

  let restaurantId = initialInput.restaurantId;
  const actions: RestaurantBlueprintSyncAction[] = [];
  const warnings = [...initialPlan.warnings];
  const errors = [...initialPlan.errors];

  try {
    if (!restaurantId) {
      restaurantId = await repository.createRestaurant(scope, restaurantPayload(scope, blueprint));
      actions.push({
        type: 'create_restaurant',
        status: 'created',
        name: blueprint.profile.name,
        restaurantId,
        syncKey: restaurantSyncKey(blueprint),
      });
    } else if (initialPlan.preview.wouldUpdateRestaurant) {
      await repository.updateRestaurant(scope, restaurantId, restaurantPayload(scope, blueprint));
      actions.push({
        type: 'update_restaurant_settings',
        status: 'updated',
        name: blueprint.profile.name,
        restaurantId,
        syncKey: restaurantSyncKey(blueprint),
      });
    }

    if (!restaurantId) throw new Error('Restaurant draft sync did not resolve a restaurant id.');

    const menuActions = await createMenuDraftsFromBlueprint(scope, restaurantId, blueprint, options, repository);
    actions.push(...menuActions);

    if (blueprint.publicMenu.enabled) {
      await createPublicMenuFromBlueprint(scope, restaurantId, blueprint, repository);
      actions.push({
        type: 'sync_public_menu',
        status: 'updated',
        name: 'Public QR menu mirror',
        restaurantId,
        syncKey: restaurantSyncKey(blueprint),
      });
    }

    enabledOfferNames(blueprint).forEach(name => actions.push({
      type: 'preview_ecommerce_offer',
      status: 'previewed',
      name,
      restaurantId,
      reason: 'Ecommerce offer remains draft/needsReview.',
    }));

    const integrationDrafts = [
      ...blueprint.integrations.chatbotKnowledgeSources,
      ...blueprint.integrations.crmLeadSources,
      ...blueprint.integrations.emailFlows,
      ...blueprint.integrations.analyticsEvents,
      ...blueprint.integrations.financeRevenueSources,
      ...blueprint.integrations.automationFlows,
    ];
    if (integrationDrafts.length > 0) {
      actions.push({
        type: 'preview_integration',
        status: 'previewed',
        name: `${integrationDrafts.length} integration drafts`,
        restaurantId,
        reason: 'Cross-module runtime writes are not activated by Restaurant Engine draft sync.',
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Restaurant blueprint draft sync failed.');
  }

  const summary = createSummary(false);
  summary.restaurantCreated = actions.filter(action => action.type === 'create_restaurant' && action.status === 'created').length;
  summary.restaurantUpdated = actions.filter(action => action.type === 'update_restaurant_settings' && action.status === 'updated').length;
  summary.menuItemsCreated = actions.filter(action => action.type === 'create_menu_item' && action.status === 'created').length;
  summary.menuItemsUpdated = actions.filter(action => action.type === 'update_menu_item' && action.status === 'updated').length;
  summary.menuItemsSkipped = actions.filter(action => action.type === 'skip_menu_item').length;
  summary.publicMenuSynced = actions.some(action => action.type === 'sync_public_menu' && action.status === 'updated');
  summary.ecommerceOffersPreviewed = actions.filter(action => action.type === 'preview_ecommerce_offer').length;
  summary.integrationDraftsPreviewed = actions.filter(action => action.type === 'preview_integration').length
    ? initialPlan.summary.integrationDraftsPreviewed
    : 0;

  return {
    restaurantId,
    preview: {
      ...initialPlan.preview,
      restaurantId,
      wouldCreateRestaurant: false,
      wouldUpdateRestaurant: false,
      menuItemsToCreate: summary.menuItemsCreated,
      menuItemsToUpdate: summary.menuItemsUpdated,
      menuItemsToSkip: summary.menuItemsSkipped,
    },
    actions,
    warnings,
    errors,
    summary,
  };
}
