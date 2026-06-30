const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const displayName = (restaurant) => (hasText(restaurant.name) ? restaurant.name.trim() : 'Restaurant');
export function createRestaurantWebsiteBindingPatch(restaurant, options = {}) {
    const restaurantId = hasText(restaurant.id) ? restaurant.id.trim() : '';
    if (!restaurantId)
        return {};
    const { includeMenu = true, includeReservation = true, includeMap = true, } = options;
    const patch = {};
    if (includeMenu) {
        patch['menu.dataSource'] = 'restaurant';
        patch['menu.restaurantId'] = restaurantId;
    }
    if (includeReservation) {
        patch['restaurantReservation.restaurantId'] = restaurantId;
        patch['restaurantReservation.maxPartySize'] = Math.max(1, Number(restaurant.maxPartySize || 12));
        patch['restaurantReservation.minPartySize'] = 1;
    }
    if (includeMap) {
        patch['map.dataSource'] = 'restaurant';
        patch['map.restaurantId'] = restaurantId;
        patch['map.title'] = displayName(restaurant);
        if (hasText(restaurant.address))
            patch['map.address'] = restaurant.address.trim();
        if (hasText(restaurant.phone))
            patch['map.phone'] = restaurant.phone.trim();
        if (hasText(restaurant.hours))
            patch['map.businessHours'] = restaurant.hours.trim();
    }
    return patch;
}
export function applyRestaurantWebsiteBinding(restaurant, setNestedData, options = {}) {
    const patch = createRestaurantWebsiteBindingPatch(restaurant, options);
    Object.entries(patch).forEach(([path, value]) => setNestedData(path, value));
    return patch;
}
//# sourceMappingURL=restaurantWebsiteBinding.js.map