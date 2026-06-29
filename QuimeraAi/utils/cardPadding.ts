import type React from 'react';

export type CardPaddingKey = 'cardPadding' | 'cardPaddingTop' | 'cardPaddingRight' | 'cardPaddingBottom' | 'cardPaddingLeft';

export interface CardPaddingFields {
  cardPadding?: number;
  cardPaddingTop?: number;
  cardPaddingRight?: number;
  cardPaddingBottom?: number;
  cardPaddingLeft?: number;
}

export interface ResolvedCardPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_CARD_PADDING = 32;

const toFinitePadding = (value: unknown, fallback: number) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const resolveCardPadding = (
  source: CardPaddingFields | null | undefined,
  fallback = DEFAULT_CARD_PADDING
): ResolvedCardPadding => {
  const base = toFinitePadding(source?.cardPadding, fallback);
  return {
    top: toFinitePadding(source?.cardPaddingTop, base),
    right: toFinitePadding(source?.cardPaddingRight, base),
    bottom: toFinitePadding(source?.cardPaddingBottom, base),
    left: toFinitePadding(source?.cardPaddingLeft, base),
  };
};

export const getCardPaddingStyle = (
  source: CardPaddingFields | null | undefined,
  fallback = DEFAULT_CARD_PADDING
): React.CSSProperties => {
  const values = resolveCardPadding(source, fallback);
  return {
    paddingTop: values.top,
    paddingRight: values.right,
    paddingBottom: values.bottom,
    paddingLeft: values.left,
  };
};

export const hasExplicitCardPadding = (source: CardPaddingFields | null | undefined) => (
  source?.cardPadding !== undefined ||
  source?.cardPaddingTop !== undefined ||
  source?.cardPaddingRight !== undefined ||
  source?.cardPaddingBottom !== undefined ||
  source?.cardPaddingLeft !== undefined
);
