type ArrayPathSegment = string | '*';
type ArrayPath = ArrayPathSegment[];

const CONTROL_ARRAY_PATHS: ArrayPath[] = [
  ['header', 'links'],
  ['footer', 'linkColumns'],
  ['footer', 'linkColumns', '*', 'links'],
  ['features', 'items'],
  ['testimonials', 'items'],
  ['services', 'items'],
  ['team', 'items'],
  ['pricing', 'tiers'],
  ['faq', 'items'],
  ['portfolio', 'items'],
  ['howItWorks', 'items'],
  ['menu', 'items'],
  ['newsletter', 'items'],
  ['cta', 'items'],
  ['slideshow', 'items'],
  ['heroGallery', 'slides'],
  ['heroWave', 'slides'],
  ['heroWave', 'gradientColors'],
  ['heroNova', 'slides'],
  ['topBar', 'messages'],
  ['logoBanner', 'logos'],
  ['signupFloat', 'socialLinks'],
  ['categoryGrid', 'categories'],
  ['featuredProducts', 'productIds'],
  ['trustBadges', 'badges'],
  ['announcementBar', 'messages'],
  ['productReviews', 'reviews'],
  ['productBundle', 'productIds'],
  ['featuresLumina', 'features'],
  ['portfolioLumina', 'projects'],
  ['pricingLumina', 'tiers'],
  ['testimonialsLumina', 'testimonials'],
  ['faqLumina', 'faqs'],
  ['featuresNeon', 'features'],
  ['portfolioNeon', 'images'],
  ['pricingNeon', 'tiers'],
  ['testimonialsNeon', 'testimonials'],
  ['faqNeon', 'faqs'],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJson = <T>(value: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

export const normalizeControlArrayValue = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  if (!isRecord(value)) return [value];

  const values = Object.values(value).filter(item => item !== undefined && item !== null);
  const isKeyedCollection = values.length > 0 && values.every(item => isRecord(item) || Array.isArray(item));

  return isKeyedCollection ? values : [value];
};

const pathNeedsNormalization = (target: unknown, path: ArrayPath): boolean => {
  if (!target || path.length === 0) return false;

  const [segment, ...rest] = path;

  if (segment === '*') {
    if (!Array.isArray(target)) return false;
    return target.some(item => pathNeedsNormalization(item, rest));
  }

  if (!isRecord(target)) return false;

  const value = target[segment];
  if (rest.length === 0) {
    return value !== undefined && value !== null && !Array.isArray(value);
  }

  return pathNeedsNormalization(value, rest);
};

const normalizeArrayPath = (target: unknown, path: ArrayPath): void => {
  if (!target || path.length === 0) return;

  const [segment, ...rest] = path;

  if (segment === '*') {
    if (!Array.isArray(target)) return;
    target.forEach(item => normalizeArrayPath(item, rest));
    return;
  }

  if (!isRecord(target)) return;

  const value = target[segment];
  if (rest.length === 0) {
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      target[segment] = normalizeControlArrayValue(value);
    }
    return;
  }

  normalizeArrayPath(value, rest);
};

export const normalizeEditorControlData = <T>(data: T): T => {
  if (!isRecord(data)) return data;

  const needsNormalization = CONTROL_ARRAY_PATHS.some(path => pathNeedsNormalization(data, path));
  if (!needsNormalization) return data;

  const next = cloneJson(data);
  CONTROL_ARRAY_PATHS.forEach(path => normalizeArrayPath(next, path));
  return next;
};
