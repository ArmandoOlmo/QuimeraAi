import { Project } from '../types';

/**
 * Extract the best possible thumbnail image from a project's data.
 * Checks various hero variants and banners to find a suitable preview image.
 */
export const getDynamicThumbnailUrl = (project: Project | null | undefined): string | null => {
  if (!project) return null;
  if (!project.data) return project.thumbnailUrl || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop';
  
  const pd = project.data;

  // 1. Direct imageUrl or backgroundImageUrl from simple heroes
  const simpleHeroes = [
    pd.hero, 
    pd.heroNova, 
    pd.heroWave, 
    pd.heroSplit, 
    pd.heroLead, 
    pd.heroLumina, 
    pd.heroNeon
  ];
  
  for (const hero of simpleHeroes) {
    if (hero?.imageUrl && typeof hero.imageUrl === 'string' && hero.imageUrl.trim() !== '') return hero.imageUrl;
    if (hero?.backgroundImageUrl && typeof hero.backgroundImageUrl === 'string' && hero.backgroundImageUrl.trim() !== '') return hero.backgroundImageUrl;
  }

  // 2. Check slides for heroes that use them (heroGallery, heroWave, heroNova, heroNeon)
  const slideHeroes = [pd.heroGallery, pd.heroWave, pd.heroNova, pd.heroNeon];
  for (const hero of slideHeroes) {
    if (hero?.slides && Array.isArray(hero.slides) && hero.slides.length > 0) {
      const firstSlide = hero.slides[0];
      if (firstSlide?.backgroundImage && typeof firstSlide.backgroundImage === 'string' && firstSlide.backgroundImage.trim() !== '') return firstSlide.backgroundImage;
      if (firstSlide?.imageUrl && typeof firstSlide.imageUrl === 'string' && firstSlide.imageUrl.trim() !== '') return firstSlide.imageUrl;
    }
  }

  // 3. Legacy or specific heroGallery handling
  if (pd.heroGallery?.images && Array.isArray(pd.heroGallery.images) && pd.heroGallery.images.length > 0 && typeof pd.heroGallery.images[0] === 'string' && pd.heroGallery.images[0] !== '') {
    return pd.heroGallery.images[0];
  }
  
  // 4. Fallback to banners
  const bannerC = pd.banner || pd.logoBanner;
  if (bannerC?.imageUrl && typeof bannerC.imageUrl === 'string' && bannerC.imageUrl.trim() !== '') return bannerC.imageUrl;
  if (bannerC?.backgroundImageUrl && typeof bannerC.backgroundImageUrl === 'string' && bannerC.backgroundImageUrl.trim() !== '') return bannerC.backgroundImageUrl;

  return project.thumbnailUrl || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop';
};
