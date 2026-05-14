import type { Project } from '../types';

/**
 * Extract the thumbnail from the active Hero section only.
 * If the active Hero has no image, return null so the Quimera fallback renders.
 */
export const getDynamicThumbnailUrl = (project: Project | null | undefined): string | null => {
  if (!project) return null;
  const homePage = project.pages?.find(page => page.isHomePage) || project.pages?.[0];
  const order = homePage?.sections || project.componentOrder;
  const heroSection = order?.find(section =>
    isHeroSection(section) && project.sectionVisibility?.[section] !== false
  );
  const data = heroSection && homePage?.sectionData?.[heroSection]
    ? homePage.sectionData
    : project.data;

  return extractActiveHeroImage(data, order, project.sectionVisibility);
};

export const extractActiveHeroImage = (
  data: Record<string, any> | null | undefined,
  componentOrder: readonly string[] | null | undefined,
  sectionVisibility?: Record<string, boolean>
): string | null => {
  if (!data || !componentOrder?.length) return null;

  const heroSection = componentOrder.find(section =>
    isHeroSection(section) && sectionVisibility?.[section] !== false
  );

  if (!heroSection) return null;

  return getHeroImage(data[heroSection]);
};

const isHeroSection = (section: string): boolean => {
  return section === 'hero' || /^hero[A-Z]/.test(section);
};

const getHeroImage = (hero: any): string | null => {
  if (!hero || typeof hero !== 'object') return null;

  const directImage = firstValidUrl(
    hero.imageUrl,
    hero.backgroundImage,
    hero.backgroundImageUrl
  );
  if (directImage) return directImage;

  if (Array.isArray(hero.slides)) {
    for (const slide of hero.slides) {
      const slideImage = firstValidUrl(
        slide?.backgroundImage,
        slide?.imageUrl,
        slide?.backgroundImageUrl
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
    if (typeof image === 'string' && image.trim()) return image;
    if (typeof image?.url === 'string' && image.url.trim()) return image.url;
  }

  return null;
};

const firstValidUrl = (...urls: unknown[]): string | null => {
  for (const url of urls) {
    if (typeof url === 'string' && url.trim()) return url;
  }

  return null;
};
