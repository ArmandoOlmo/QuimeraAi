import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  AnimationType,
  BorderRadiusSize,
  FontSize,
  ObjectFit,
  PaddingSize,
  ShowcaseData,
  ShowcaseItem,
  ShowcaseVariant,
} from '../types';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import { isPendingImage } from '../utils/imagePlaceholders';
import ImagePlaceholder from './ui/ImagePlaceholder';

interface ShowcaseProps extends ShowcaseData {
  borderRadius?: BorderRadiusSize;
  onNavigate?: (href: string) => void;
}

const paddingYClasses: Record<PaddingSize, string> = {
  none: 'py-0',
  sm: 'py-10 md:py-14',
  md: 'py-14 md:py-20',
  lg: 'py-16 md:py-28',
  xl: 'py-20 md:py-36',
};

const paddingXClasses: Record<PaddingSize, string> = {
  none: 'px-0',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-10',
};

const titleSizeClasses: Record<FontSize, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-6xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-lg',
  '2xl': 'rounded-lg',
  full: 'rounded-lg',
};

const objectFitClasses: Record<ObjectFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

const variantDefault: ShowcaseVariant = 'recent-work';

const resolveTextFactory = (language: string) => (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const preferred = language?.startsWith('es') ? 'es' : 'en';
    const candidate = record[preferred] ?? record.es ?? record.en ?? Object.values(record)[0];
    return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : '';
  }
  return String(value);
};

const getItemCategory = (item: ShowcaseItem): string => item.category || item.tags?.[0] || '';

const buildCategories = (items: ShowcaseItem[], explicitCategories?: string[]) => {
  const categories = explicitCategories?.filter(Boolean) || [];
  const fromItems = items.map(getItemCategory).filter(Boolean);
  return Array.from(new Set([...categories, ...fromItems]));
};

const ShowcaseImage = ({
  item,
  className,
  imageObjectFit = 'cover',
  priority = false,
}: {
  item: ShowcaseItem;
  className: string;
  imageObjectFit?: ObjectFit;
  priority?: boolean;
}) => {
  const imageUrl = item.imageUrl || '';
  if (!imageUrl || isPendingImage(imageUrl)) {
    return <ImagePlaceholder aspectRatio="4:3" showGenerateButton={false} className={className} />;
  }

  return (
    <img
      src={imageUrl}
      alt={item.altText || item.title || ''}
      loading={priority ? 'eager' : 'lazy'}
      className={`${className} ${objectFitClasses[imageObjectFit] || 'object-cover'}`}
    />
  );
};

const ItemLink = ({
  item,
  color,
  onNavigate,
}: {
  item: ShowcaseItem;
  color: string;
  onNavigate?: (href: string) => void;
}) => {
  if (!item.linkUrl) return null;
  const isExternal = item.linkUrl.startsWith('http://') || item.linkUrl.startsWith('https://');
  return (
    <a
      href={item.linkUrl}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      onClick={(event) => {
        if (!isExternal && onNavigate) {
          event.preventDefault();
          onNavigate(item.linkUrl || '#');
        }
      }}
      className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-75"
      style={{ color }}
    >
      <span className="min-w-0 truncate">{item.linkText || 'View'}</span>
      <ArrowRight className="h-4 w-4" />
    </a>
  );
};

const Showcase: React.FC<ShowcaseProps> = ({
  eyebrow,
  title: rawTitle,
  description: rawDescription,
  items: rawItems = [],
  categories: rawCategories = [],
  showcaseVariant = variantDefault,
  paddingY = 'lg',
  paddingX = 'md',
  titleFontSize = 'lg',
  descriptionFontSize = 'md',
  showSectionHeader = true,
  showFilters = true,
  showMeta = true,
  showFloatingCta = false,
  floatingCtaText,
  floatingCtaLink,
  gridColumns = 3,
  imageHeight = 420,
  imageObjectFit = 'cover',
  animationType = 'fade-in-up',
  enableCardAnimation = true,
  borderRadius = 'lg',
  colors = {
    background: '#0f172a',
    text: '#94a3b8',
    heading: '#f8fafc',
    description: '#cbd5e1',
    accent: '#4f46e5',
    borderColor: '#334155',
    cardBackground: '#111827',
    cardHeading: '#ffffff',
    cardText: '#cbd5e1',
    mutedText: '#94a3b8',
    pillBackground: '#ffffff',
    pillText: '#111827',
    overlayStart: 'rgba(0,0,0,0.82)',
    overlayEnd: 'rgba(0,0,0,0.08)',
  },
  onNavigate,
}) => {
  const { i18n } = useTranslation();
  const resolveText = resolveTextFactory(i18n.language);
  const title = resolveText(rawTitle);
  const description = resolveText(rawDescription);
  const resolvedEyebrow = resolveText(eyebrow);
  const allItems = useMemo(
    () => (Array.isArray(rawItems) ? rawItems : Object.values(rawItems || {}))
      .filter((item): item is ShowcaseItem => Boolean(item && typeof item === 'object'))
      .map(item => ({
        ...item,
        title: resolveText(item.title),
        description: resolveText(item.description),
        eyebrow: resolveText(item.eyebrow),
        meta: resolveText(item.meta),
        linkText: resolveText(item.linkText),
      })),
    [rawItems, resolveText],
  );
  const categories = useMemo(() => buildCategories(allItems, rawCategories), [allItems, rawCategories]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [carouselOffset, setCarouselOffset] = useState(0);
  const filteredItems = activeCategory === 'all'
    ? allItems
    : allItems.filter(item => getItemCategory(item) === activeCategory || item.tags?.includes(activeCategory));
  const items = filteredItems.length ? filteredItems : allItems;
  const radiusClass = borderRadiusClasses[borderRadius] || 'rounded-lg';
  const sectionStyle: React.CSSProperties = {
    backgroundColor: colors.background,
    color: colors.text,
  };
  const gridColumnClass = gridColumns <= 2 ? 'lg:grid-cols-2' : gridColumns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
  const itemImageHeight = `clamp(220px, 68vw, ${Math.max(220, imageHeight)}px)`;
  const tallImageHeight = `clamp(300px, 82vw, ${Math.max(300, imageHeight + 160)}px)`;
  const stripImageHeight = `clamp(320px, 88vw, ${Math.max(imageHeight + 180, 560)}px)`;

  const renderHeader = (align: 'left' | 'center' = 'center') => {
    if (!showSectionHeader || (!title && !description && !resolvedEyebrow)) return null;
    return (
      <div className={`mx-auto mb-10 max-w-4xl ${align === 'center' ? 'text-center' : 'text-left'}`}>
        {resolvedEyebrow && (
          <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: colors.accent }}>
            {resolvedEyebrow}
          </p>
        )}
        {title && (
          <h2
            className={`${titleSizeClasses[titleFontSize]} break-words font-header font-bold leading-tight`}
            style={{ color: colors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, 0)' }}
          >
            {title}
          </h2>
        )}
        {description && (
          <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-4 break-words font-body leading-relaxed`} style={{ color: colors.description || colors.text }}>
            {description}
          </p>
        )}
      </div>
    );
  };

  const renderFilters = (compact = false) => {
    if (!showFilters || categories.length === 0) return null;
    return (
      <div className={`mb-8 flex ${compact ? 'justify-start' : 'justify-center'} gap-2 overflow-x-auto pb-1`}>
        {['all', ...categories].map(category => {
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className="max-w-[78vw] shrink-0 truncate rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? colors.pillBackground || colors.heading : 'transparent',
                borderColor: active ? colors.pillBackground || colors.heading : colors.borderColor,
                color: active ? colors.pillText || colors.background : colors.text,
              }}
            >
              {category === 'all' ? (i18n.language?.startsWith('es') ? 'Todo' : 'All') : category}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMeta = (item: ShowcaseItem) => {
    if (!showMeta || (!item.meta && !item.category && !item.tags?.length)) return null;
    return (
      <p className="mt-2 text-xs font-semibold uppercase tracking-widest" style={{ color: colors.mutedText || colors.text }}>
        {item.meta || item.category || item.tags?.join('  ')}
      </p>
    );
  };

  const renderRecentWork = () => (
    <div className={`mx-auto max-w-7xl ${paddingXClasses[paddingX]}`}>
      {renderHeader('left')}
      {renderFilters(true)}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {items.map((item, index) => (
          <article
            key={`${item.title}-${index}`}
            className={`${getAnimationClass(animationType, enableCardAnimation)} group`}
            style={{ animationDelay: getAnimationDelay(index) }}
          >
            <div className={`relative overflow-hidden ${radiusClass}`} style={{ backgroundColor: colors.cardBackground, height: itemImageHeight }}>
              <ShowcaseImage item={item} imageObjectFit={imageObjectFit} className="h-full w-full transition-transform duration-700 group-hover:scale-105" priority={index === 0} />
            </div>
            <h3 className="mt-4 break-words text-xl font-bold font-header sm:text-2xl" style={{ color: colors.cardHeading || colors.heading }}>{item.title}</h3>
            {renderMeta(item)}
            {item.description && <p className="mt-3 max-w-xl break-words font-body text-base leading-snug" style={{ color: colors.cardText || colors.text }}>{item.description}</p>}
          </article>
        ))}
      </div>
    </div>
  );

  const renderCuratedRow = () => (
    <div className={`${paddingXClasses[paddingX]}`}>
      <div className="mx-auto max-w-7xl">
        {renderFilters(true)}
        {renderHeader('left')}
      </div>
      <div className="showcase-curated-track flex flex-col gap-8 lg:flex-row lg:overflow-x-auto lg:pb-4">
        {items.map((item, index) => (
          <article
            key={`${item.title}-${index}`}
            className={`${getAnimationClass(animationType, enableCardAnimation)} w-full lg:w-[min(380px,78vw)] lg:shrink-0`}
            style={{ animationDelay: getAnimationDelay(index) }}
          >
            <div className={`relative overflow-hidden ${radiusClass}`} style={{ height: itemImageHeight, backgroundColor: colors.cardBackground }}>
              <ShowcaseImage item={item} imageObjectFit={imageObjectFit} className="h-full w-full" priority={index === 0} />
            </div>
            <h3 className="mt-4 break-words text-xl font-semibold font-header" style={{ color: colors.cardHeading || colors.heading }}>{item.title}</h3>
            {item.description && <p className="mt-1 break-words text-sm" style={{ color: colors.cardText || colors.text }}>{item.description}</p>}
            {renderMeta(item)}
          </article>
        ))}
      </div>
    </div>
  );

  const renderEditorialStack = () => (
    <div className={`mx-auto max-w-6xl ${paddingXClasses[paddingX]}`}>
      {renderHeader('center')}
      <div className="space-y-5">
        {items.map((item, index) => {
          const tall = index % 3 === 1;
          return (
            <article
              key={`${item.title}-${index}`}
              className={`${getAnimationClass(animationType, enableCardAnimation)} grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr] ${index % 2 ? 'lg:grid-cols-[0.85fr_1.15fr]' : ''}`}
              style={{ animationDelay: getAnimationDelay(index) }}
            >
              <div
                className={`relative overflow-hidden ${radiusClass} ${index % 2 ? 'lg:order-2' : ''}`}
                style={{ minHeight: tall ? tallImageHeight : itemImageHeight, backgroundColor: colors.cardBackground }}
              >
                <ShowcaseImage item={item} imageObjectFit={imageObjectFit} className="absolute inset-0 h-full w-full" priority={index === 0} />
              </div>
              <div className={`flex min-h-[240px] flex-col justify-between border p-6 ${radiusClass}`} style={{ borderColor: colors.borderColor, backgroundColor: colors.cardBackground }}>
                <div>
                  {item.eyebrow && <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.accent }}>{item.eyebrow}</p>}
                  <h3 className="mt-4 break-words text-2xl font-bold leading-tight font-header sm:text-3xl sm:leading-none" style={{ color: colors.cardHeading || colors.heading }}>{item.title}</h3>
                  {item.description && <p className="mt-5 break-words text-base leading-relaxed" style={{ color: colors.cardText || colors.text }}>{item.description}</p>}
                </div>
                <ItemLink item={item} color={colors.accent} onNavigate={onNavigate} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderVerticalStrips = () => (
    <div className={`relative ${paddingXClasses[paddingX]}`}>
      <div className="mx-auto max-w-[1800px]">
        {renderHeader('left')}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {items.slice(0, 6).map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className={`${getAnimationClass(animationType, enableCardAnimation)} group relative overflow-hidden ${radiusClass}`}
              style={{ animationDelay: getAnimationDelay(index), minHeight: stripImageHeight, backgroundColor: colors.cardBackground }}
            >
              <ShowcaseImage item={item} imageObjectFit={imageObjectFit} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" priority={index === 0} />
              <div className="absolute inset-x-0 bottom-0 p-4" style={{ background: `linear-gradient(to top, ${colors.overlayStart || 'rgba(0,0,0,0.8)'}, transparent)` }}>
                <h3 className="break-words text-lg font-bold font-header" style={{ color: colors.cardHeading || '#ffffff' }}>{item.title}</h3>
                {renderMeta(item)}
              </div>
            </article>
          ))}
        </div>
        {showFloatingCta && floatingCtaText && (
          <a
            href={floatingCtaLink || '#'}
            onClick={(event) => {
              if (floatingCtaLink && !floatingCtaLink.startsWith('http') && onNavigate) {
                event.preventDefault();
                onNavigate(floatingCtaLink);
              }
            }}
            className={`mt-6 inline-flex max-w-full min-w-0 items-center gap-3 border p-3 shadow-xl sm:gap-4 ${radiusClass}`}
            style={{ backgroundColor: colors.pillBackground || colors.cardBackground, borderColor: colors.borderColor, color: colors.pillText || colors.heading }}
          >
            {items[0] && <ShowcaseImage item={items[0]} className="h-14 w-20 flex-shrink-0 rounded-md object-cover sm:h-16 sm:w-24" imageObjectFit="cover" />}
            <span className="min-w-0 truncate font-semibold">{floatingCtaText}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </a>
        )}
      </div>
    </div>
  );

  const renderDarkCarousel = () => {
    const visibleItems = items.slice(carouselOffset, carouselOffset + 5);
    const canMove = items.length > 5;
    return (
      <div className={paddingXClasses[paddingX]}>
        <div className="mx-auto max-w-7xl">
          {renderHeader('center')}
          {renderFilters(false)}
          <div className="mb-5 flex justify-end gap-3">
            {canMove && (
              <>
                <button type="button" aria-label="Previous" onClick={() => setCarouselOffset(Math.max(0, carouselOffset - 1))} className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: colors.cardBackground, color: colors.heading }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Next" onClick={() => setCarouselOffset(Math.min(items.length - 5, carouselOffset + 1))} className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: colors.cardBackground, color: colors.heading }}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {visibleItems.map((item, index) => (
              <article key={`${item.title}-${index}`} className={`group relative overflow-hidden ${radiusClass}`} style={{ minHeight: 'clamp(300px, 82vw, 420px)', backgroundColor: colors.cardBackground }}>
                <ShowcaseImage item={item} imageObjectFit={imageObjectFit} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" priority={index === 0} />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.overlayStart || 'rgba(0,0,0,0.86)'}, ${colors.overlayEnd || 'rgba(0,0,0,0.08)'})` }} />
                <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                  <h3 className="break-words text-xl font-bold leading-tight font-header sm:text-2xl" style={{ color: colors.cardHeading || '#ffffff' }}>{item.title}</h3>
                  {item.description && <p className="mt-3 break-words text-sm" style={{ color: colors.cardText || '#e5e7eb' }}>{item.description}</p>}
                  {renderMeta(item)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMinimalIndex = () => (
    <div className={`mx-auto max-w-7xl ${paddingXClasses[paddingX]}`}>
      {renderFilters(true)}
      <div className="grid min-h-0 grid-cols-1 items-end gap-10 md:min-h-[520px] md:grid-cols-5">
        {items.slice(0, 5).map((item, index) => (
          <article key={`${item.title}-${index}`} className={`${getAnimationClass(animationType, enableCardAnimation)} space-y-5`} style={{ animationDelay: getAnimationDelay(index) }}>
            <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1', backgroundColor: colors.cardBackground }}>
              <ShowcaseImage item={item} imageObjectFit={imageObjectFit} className="absolute inset-0 h-full w-full" priority={index === 0} />
            </div>
            <p className="font-mono text-sm" style={{ color: colors.mutedText || colors.text }}>{item.meta || `RC-${String(index + 100).padStart(3, '0')}`}</p>
          </article>
        ))}
      </div>
    </div>
  );

  const renderCaseGridDark = () => (
    <div className={`mx-auto max-w-7xl ${paddingXClasses[paddingX]}`}>
      {renderFilters(true)}
      <div className={`grid grid-cols-1 gap-x-5 gap-y-12 lg:grid-cols-2 ${gridColumnClass}`}>
        {items.map((item, index) => (
          <article key={`${item.title}-${index}`} className={getAnimationClass(animationType, enableCardAnimation)} style={{ animationDelay: getAnimationDelay(index) }}>
            <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1', backgroundColor: colors.cardBackground }}>
              <ShowcaseImage item={item} imageObjectFit={imageObjectFit} className="absolute inset-0 h-full w-full" priority={index === 0} />
            </div>
            <h3 className="mt-5 break-words text-xl font-bold font-header sm:text-2xl" style={{ color: colors.cardHeading || colors.heading }}>{item.title}</h3>
            {item.description && <p className="mt-3 break-words text-base font-semibold leading-snug sm:text-lg" style={{ color: colors.cardText || colors.text }}>{item.description}</p>}
          </article>
        ))}
      </div>
    </div>
  );

  const renderFeaturedDevice = () => {
    const featured = items[0];
    return (
      <div className="mx-auto max-w-7xl">
        <div className={paddingXClasses[paddingX]}>
          {renderHeader('center')}
        </div>
        {featured && (
          <div className="relative overflow-hidden px-5 py-8 md:px-16 md:py-14" style={{ backgroundColor: colors.cardBackground }}>
            <div className={`mx-auto max-w-6xl overflow-hidden border bg-white shadow-2xl ${radiusClass}`} style={{ borderColor: colors.borderColor }}>
              <ShowcaseImage item={featured} imageObjectFit={imageObjectFit} className="h-full w-full" priority />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVariant = () => {
    switch (showcaseVariant) {
      case 'featured-device':
        return renderFeaturedDevice();
      case 'curated-row':
        return renderCuratedRow();
      case 'editorial-stack':
        return renderEditorialStack();
      case 'vertical-strips':
        return renderVerticalStrips();
      case 'dark-carousel':
        return renderDarkCarousel();
      case 'minimal-index':
        return renderMinimalIndex();
      case 'case-grid-dark':
        return renderCaseGridDark();
      case 'recent-work':
      default:
        return renderRecentWork();
    }
  };

  return (
    <section id="showcase" className={`w-full overflow-hidden ${paddingYClasses[paddingY]}`} style={sectionStyle}>
      {renderVariant()}
    </section>
  );
};

export default Showcase;
