import { describe, expect, it } from 'vitest';
import {
  normalizeControlArrayValue,
  normalizeEditorControlData,
} from '../../components/controls/normalizeControlData';

describe('normalizeEditorControlData', () => {
  it('keeps valid array-backed control data by reference', () => {
    const data = {
      features: { items: [{ title: 'Fast' }] },
      categoryGrid: { categories: [{ id: 'cat-1', name: 'Shoes' }] },
    };

    expect(normalizeEditorControlData(data)).toBe(data);
  });

  it('normalizes keyed legacy objects before controls call map', () => {
    const normalized = normalizeEditorControlData({
      categoryGrid: {
        categories: {
          catA: { id: 'cat-a', name: 'A' },
          catB: { id: 'cat-b', name: 'B' },
        },
      },
      productReviews: {
        reviews: {
          reviewA: { id: 'review-a', authorName: 'Ada', rating: 5 },
        },
      },
    }) as any;

    expect(normalized.categoryGrid.categories).toEqual([
      { id: 'cat-a', name: 'A' },
      { id: 'cat-b', name: 'B' },
    ]);
    expect(normalized.productReviews.reviews).toEqual([
      { id: 'review-a', authorName: 'Ada', rating: 5 },
    ]);
  });

  it('normalizes nested footer link collections', () => {
    const normalized = normalizeEditorControlData({
      footer: {
        linkColumns: {
          primary: {
            title: 'Company',
            links: {
              home: { text: 'Home', href: '/' },
              contact: { text: 'Contact', href: '/contact' },
            },
          },
        },
      },
    }) as any;

    expect(normalized.footer.linkColumns).toHaveLength(1);
    expect(normalized.footer.linkColumns[0].links).toEqual([
      { text: 'Home', href: '/' },
      { text: 'Contact', href: '/contact' },
    ]);
  });

  it('wraps scalar control values so selector props still receive arrays', () => {
    expect(normalizeControlArrayValue('product-1')).toEqual(['product-1']);
  });
});
