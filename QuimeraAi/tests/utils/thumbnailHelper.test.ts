import { describe, expect, it } from 'vitest';
import { extractActiveHeroImage, getDynamicThumbnailUrl } from '../../utils/thumbnailHelper';
import type { Project } from '../../types';

const baseProject = (overrides: Partial<Project>): Project => ({
  id: 'project-1',
  name: 'Project',
  thumbnailUrl: '',
  status: 'Draft',
  lastUpdated: '2026-05-14T00:00:00.000Z',
  data: {} as any,
  theme: {} as any,
  brandIdentity: {} as any,
  componentOrder: [],
  sectionVisibility: {} as any,
  ...overrides,
});

describe('thumbnailHelper', () => {
  it('uses a later visible hero when the first hero has no image', () => {
    const thumbnail = extractActiveHeroImage(
      {
        hero: { headline: 'No image' },
        heroSplit: { imageUrl: 'https://example.com/split.jpg' },
      },
      ['hero', 'heroSplit'],
      { hero: true, heroSplit: true },
    );

    expect(thumbnail).toBe('https://example.com/split.jpg');
  });

  it('prefers background image fields from hero data', () => {
    const thumbnail = extractActiveHeroImage(
      {
        hero: {
          imageUrl: 'https://example.com/content.jpg',
          backgroundImageUrl: 'https://example.com/background.jpg',
        },
      },
      ['hero'],
    );

    expect(thumbnail).toBe('https://example.com/background.jpg');
  });

  it('extracts image URLs from slider-based hero variants', () => {
    const thumbnail = extractActiveHeroImage(
      {
        heroNeon: {
          slides: [
            { headline: 'One' },
            { headline: 'Two', imageUrl: 'https://example.com/neon.jpg' },
          ],
        },
      },
      ['heroNeon'],
    );

    expect(thumbnail).toBe('https://example.com/neon.jpg');
  });

  it('uses hero images from the home page section data before legacy data', () => {
    const project = baseProject({
      data: {
        hero: { imageUrl: 'https://example.com/legacy.jpg' },
      } as any,
      componentOrder: ['hero'],
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: '/',
          type: 'static',
          sections: ['heroGallery'],
          sectionData: {
            heroGallery: {
              slides: [{ headline: 'Home', backgroundImage: 'https://example.com/home-gallery.jpg' }],
            },
          },
          seo: {},
          isHomePage: true,
        },
      ],
    });

    expect(getDynamicThumbnailUrl(project)).toBe('https://example.com/home-gallery.jpg');
  });

  it('returns null when visible hero sections have no image', () => {
    const thumbnail = extractActiveHeroImage(
      {
        hero: { headline: 'No image' },
        heroSplit: { imageUrl: 'https://example.com/hidden.jpg' },
      },
      ['hero', 'heroSplit'],
      { hero: true, heroSplit: false },
    );

    expect(thumbnail).toBeNull();
  });
});
