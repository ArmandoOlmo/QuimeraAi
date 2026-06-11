import 'react-i18next';

declare module 'react-i18next' {
  export interface UseTranslationResponse {
    t: (key: string, options?: Record<string, unknown>) => string;
  }
}

declare module 'i18next' {
  interface TFunction {
    (key: string | string[], options?: Record<string, unknown>): string;
  }
}
