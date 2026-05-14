import type { Project } from '../types';

/**
 * Extract the thumbnail from any visible Hero section.
 * If no Hero has an image, return null so the Quimera fallback renders.
 */
export const getDynamicThumbnailUrl = (project: Project | null | undefined): string | null => {
  if (!project) return null;

  const homePage = project.pages?.find(page => page.isHomePage) || project.pages?.[0];
  const pageSources = homePage
    ? [homePage, ...(project.pages || []).filter(page => page !== homePage)]
    : [];

  for (const page of pageSources) {
    const pageThumbnail = extractActiveHeroImage(page?.sectionData, page?.sections, project.sectionVisibility);
    if (pageThumbnail) return pageThumbnail;
  }

  return extractActiveHeroImage(project.data, project.componentOrder, project.sectionVisibility);
};

export const extractActiveHeroImage = (
  data: Record<string, any> | null | undefined,
  componentOrder: readonly string[] | null | undefined,
  sectionVisibility?: Record<string, boolean>
): string | null => {
  if (!data) return null;

  const orderedHeroSections = componentOrder?.length
    ? componentOrder.filter(section => isHeroSection(section) && sectionVisibility?.[section] !== false)
    : Object.keys(data).filter(isHeroSection);

  for (const heroSection of orderedHeroSections) {
    const heroImage = getHeroImage(data[heroSection]);
    if (heroImage) return heroImage;
  }

  return null;
};

const isHeroSection = (section: string): boolean => {
  return section === 'hero' || /^hero[A-Z]/.test(section);
};

const getHeroImage = (hero: any): string | null => {
  if (!hero || typeof hero !== 'object') return null;

  const directImage = firstValidUrl(
    hero.backgroundImageUrl,
    hero.backgroundImage,
    hero.imageUrl
  );
  if (directImage) return directImage;

  for (const slideList of [hero.slides, hero.items]) {
    if (!Array.isArray(slideList)) continue;

    for (const slide of slideList) {
      const slideImage = firstValidUrl(
        slide?.backgroundImageUrl,
        slide?.backgroundImage,
        slide?.imageUrl,
        slide?.image?.url
      );
      if (slideImage) return slideImage;

      const legacySlideImage = getLegacyGalleryImage(slide?.images);
      if (legacySlideImage) return legacySlideImage;
    }
  }

  return getLegacyGalleryImage(hero.images);
};

const getLegacyGalleryImage = (images: any): string | null => {
  if (!Array.isArray(images)) return null;

  for (const image of images) {
    if (typeof image === 'string' && isUsableImageUrl(image)) return image.trim();
    if (typeof image?.url === 'string' && isUsableImageUrl(image.url)) return image.url.trim();
  }

  return null;
};

const firstValidUrl = (...urls: unknown[]): string | null => {
  for (const url of urls) {
    if (typeof url === 'string' && isUsableImageUrl(url)) return url.trim();
  }

  return null;
};

const isUsableImageUrl = (url: string): boolean => {
  const value = url.trim();
  return Boolean(value) && !value.startsWith('data:') && value !== '#';
};
