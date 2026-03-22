/**
 * Shared Hero text layout positioning helpers.
 * Used by all Hero variants to consistently apply the textLayout setting.
 */

import { HeroTextLayout } from '../types';

const HEADER_PADDING = 'pt-28 md:pt-32';
const BOTTOM_PADDING = 'pb-20 md:pb-24';

/**
 * Returns 'left' | 'center' | 'right' based on textLayout
 */
export const getHorizontalAlign = (textLayout: HeroTextLayout = 'left-top'): 'left' | 'center' | 'right' => {
  if (textLayout.startsWith('left')) return 'left';
  if (textLayout.startsWith('right')) return 'right';
  return 'center';
};

/**
 * Returns Tailwind text-alignment class: text-left, text-center, text-right
 */
export const getTextAlignClass = (textLayout: HeroTextLayout = 'left-top'): string => {
  const h = getHorizontalAlign(textLayout);
  if (h === 'left') return 'text-left';
  if (h === 'right') return 'text-right';
  return 'text-center';
};

/**
 * Returns Tailwind flex items-alignment class for horizontal content alignment
 */
export const getItemsAlignClass = (textLayout: HeroTextLayout = 'left-top'): string => {
  const h = getHorizontalAlign(textLayout);
  if (h === 'left') return 'items-start';
  if (h === 'right') return 'items-end';
  return 'items-center';
};

/**
 * Returns Tailwind justify class for horizontal positioning within a flex-row container
 */
export const getJustifyClass = (textLayout: HeroTextLayout = 'left-top'): string => {
  const h = getHorizontalAlign(textLayout);
  if (h === 'left') return 'justify-start';
  if (h === 'right') return 'justify-end';
  return 'justify-center';
};

/**
 * Returns Tailwind class for vertical positioning (items-start/center/end + padding)
 */
export const getVerticalClass = (textLayout: HeroTextLayout = 'left-top'): string => {
  if (textLayout.endsWith('-top') || textLayout === 'center-top') return `items-start ${HEADER_PADDING}`;
  if (textLayout.endsWith('-bottom') || textLayout === 'center-bottom') return `items-end ${BOTTOM_PADDING}`;
  return 'items-center';
};

/**
 * Returns all classes needed for a hero content container that respects textLayout.
 * Designed for flex containers that position their text content block.
 */
export const getHeroLayoutClasses = (textLayout: HeroTextLayout = 'left-top'): {
  containerClass: string;
  textAlignClass: string;
  itemsAlignClass: string;
  horizontalAlign: 'left' | 'center' | 'right';
} => {
  const horizontalAlign = getHorizontalAlign(textLayout);
  return {
    containerClass: `flex flex-1 ${getVerticalClass(textLayout)} ${getJustifyClass(textLayout)}`,
    textAlignClass: getTextAlignClass(textLayout),
    itemsAlignClass: getItemsAlignClass(textLayout),
    horizontalAlign,
  };
};
