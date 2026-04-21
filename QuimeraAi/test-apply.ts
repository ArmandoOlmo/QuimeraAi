import { GlobalColors } from './types';
export const generateComponentColorMappings = (colors: any): Record<string, any> => ({
    hero: {
        colors: {
            primary: colors.primary,
            background: colors.background,
        }
    }
});

const section = { type: 'hero', data: { backgroundColor: '#000', colors: { primary: '#fff' } } };
const colors = { primary: '#FF0000', background: '#00FF00' };

const colorMappings = generateComponentColorMappings(colors);
const sectionColors = colorMappings[section.type];

const mergedData = {
    ...section.data,
    ...sectionColors,
};

if (sectionColors.colors) {
    if (sectionColors.colors.background) mergedData.backgroundColor = sectionColors.colors.background;
}
console.log(mergedData);
