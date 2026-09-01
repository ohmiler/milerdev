export const WEB_VITAL_NAMES = ['LCP', 'INP', 'CLS'] as const;

export const WEB_VITAL_ROUTE_FAMILIES = [
  'home',
  'catalog',
  'product_detail',
  'purchase',
  'authentication',
  'account',
  'learning',
  'certificate',
  'content',
  'legal_support',
  'other',
] as const;

export const WEB_VITAL_DEVICE_CLASSES = ['mobile', 'desktop'] as const;
export const WEB_VITAL_RATINGS = ['good', 'needs-improvement', 'poor'] as const;

export type WebVitalName = typeof WEB_VITAL_NAMES[number];
export type WebVitalRouteFamily = typeof WEB_VITAL_ROUTE_FAMILIES[number];
export type WebVitalDeviceClass = typeof WEB_VITAL_DEVICE_CLASSES[number];
export type WebVitalRating = typeof WEB_VITAL_RATINGS[number];
