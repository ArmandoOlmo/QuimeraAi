export const getBorderRadiusClass = (radius?: string): string => {
    switch (radius) {
        case 'none': return 'rounded-none';
        case 'sm': return 'rounded-sm';
        case 'md': return 'rounded-md';
        case 'lg': return 'rounded-lg';
        case 'xl': return 'rounded-xl';
        case '2xl': return 'rounded-2xl';
        case '3xl': return 'rounded-3xl';
        case 'full': return 'rounded-full';
        default: return 'rounded-3xl'; // Default for Neon
    }
};
