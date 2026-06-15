const DEFAULT_BOOT_BACKGROUND = '#000000';

type BootProject = {
  theme?: {
    pageBackground?: string;
    globalColors?: {
      background?: string;
    };
  };
  data?: {
    hero?: {
      colors?: {
        background?: string;
      };
    };
  };
};

export function getProjectBootBackground(project: BootProject | null | undefined): string | null {
  return (
    project?.theme?.pageBackground ||
    project?.theme?.globalColors?.background ||
    project?.data?.hero?.colors?.background ||
    null
  );
}

export function getBootBackgroundColor(fallback: string = DEFAULT_BOOT_BACKGROUND): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const cssInitialBackground = getComputedStyle(document.documentElement)
    .getPropertyValue('--initial-page-bg')
    .trim();

  return (
    (window as any).__DOMAIN_CONFIG__?.backgroundColor ||
    getProjectBootBackground((window as any).__INITIAL_DATA__?.project) ||
    cssInitialBackground ||
    fallback
  );
}
