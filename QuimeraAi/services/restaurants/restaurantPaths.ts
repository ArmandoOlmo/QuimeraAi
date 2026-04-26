export interface RestaurantScope {
  userId: string;
  tenantId?: string | null;
}

export const getRestaurantTenantId = ({ userId, tenantId }: RestaurantScope): string => {
  return tenantId || `tenant_${userId}`;
};

export const getRestaurantBasePath = ({ userId, tenantId }: RestaurantScope): string => {
  const effectiveTenantId = getRestaurantTenantId({ userId, tenantId });
  const isPersonalTenant = effectiveTenantId.startsWith(`tenant_${userId}`);
  return isPersonalTenant ? `users/${userId}` : `tenants/${effectiveTenantId}`;
};

export const getRestaurantsPath = (scope: RestaurantScope): string => {
  return `${getRestaurantBasePath(scope)}/restaurants`;
};

export const getRestaurantPath = (scope: RestaurantScope, restaurantId: string): string => {
  return `${getRestaurantsPath(scope)}/${restaurantId}`;
};

export const getMenuItemsPath = (scope: RestaurantScope, restaurantId: string): string => {
  return `${getRestaurantPath(scope, restaurantId)}/menuItems`;
};

export const getReservationsPath = (scope: RestaurantScope, restaurantId: string): string => {
  return `${getRestaurantPath(scope, restaurantId)}/reservations`;
};

export const getMarketingOutputsPath = (scope: RestaurantScope, restaurantId: string): string => {
  return `${getRestaurantPath(scope, restaurantId)}/marketingOutputs`;
};

export const getReviewTemplatesPath = (scope: RestaurantScope, restaurantId: string): string => {
  return `${getRestaurantPath(scope, restaurantId)}/reviewTemplates`;
};

export const getAnalyticsEventsPath = (scope: RestaurantScope, restaurantId: string): string => {
  return `${getRestaurantPath(scope, restaurantId)}/analyticsEvents`;
};
