// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Array and object utilities
export type NonEmptyArray<T> = [T, ...T[]];
export type ArrayElement<T> = T extends (infer U)[] ? U : never;
export type ObjectValues<T> = T[keyof T];
export type ObjectKeys<T> = keyof T;
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Function utilities
export type AsyncFunction<T extends any[] = any[], R = any> = (...args: T) => Promise<R>;
export type SyncFunction<T extends any[] = any[], R = any> = (...args: T) => R;
export type AnyFunction = (...args: any[]) => any;
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;

// Event and callback types
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;
export type ChangeHandler<T = any> = (value: T) => void;
export type AsyncChangeHandler<T = any> = (value: T) => Promise<void>;
export type ErrorHandler = (error: Error) => void;
export type AsyncErrorHandler = (error: Error) => Promise<void>;

// State and store types
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: Error | string;
  lastUpdated?: Date;
}

export interface AsyncState<T> extends LoadingState {
  data?: T;
  isSuccess: boolean;
}

export interface PaginatedState<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: Error | string;
}

export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
  style?: React.CSSProperties;
}

export interface ChildrenProps {
  children?: React.ReactNode;
}

export interface WithLoadingProps {
  isLoading?: boolean;
  loadingText?: string;
  loadingComponent?: React.ComponentType;
}

export interface WithErrorProps {
  error?: Error | string;
  onRetry?: () => void;
  errorComponent?: React.ComponentType<{ error: Error | string; onRetry?: () => void }>;
}

// Form and input types
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  group?: string;
  icon?: string;
  description?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'datetime-local' | 'time';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => string | undefined;
  };
  options?: SelectOption[];
  multiple?: boolean;
  accept?: string; // for file inputs
  rows?: number; // for textarea
  cols?: number; // for textarea
  step?: number; // for number inputs
  autoComplete?: string;
  autoFocus?: boolean;
}

// Date and time utilities
export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface DateTimeRange {
  start: Date;
  end: Date;
}

// File and media types
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url?: string;
  preview?: string;
}

export interface ImageInfo extends FileInfo {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface VideoInfo extends FileInfo {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  thumbnail?: string;
}

export interface AudioInfo extends FileInfo {
  duration: number;
  artist?: string;
  album?: string;
  title?: string;
}

// Geolocation types
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formatted?: string;
}

export interface Location {
  coordinates: Coordinates;
  address?: Address;
  timestamp?: Date;
}

// Theme and styling types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeBreakpoints {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  breakpoints: ThemeBreakpoints;
  borderRadius: string;
  boxShadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
}

// Device and browser detection
export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';
  isTouchDevice: boolean;
  screenSize: {
    width: number;
    height: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  isOnline: boolean;
  connection?: {
    effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
}

// Performance and monitoring
export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  timestamp: Date;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
  environment: 'development' | 'staging' | 'production';
}

// Storage and caching
export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
  version?: string;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

// Search and filtering
export interface SearchResult<T = any> {
  item: T;
  score: number;
  matches: Array<{
    field: string;
    value: string;
    indices: [number, number][];
  }>;
}

export interface SearchOptions {
  threshold?: number;
  includeScore?: boolean;
  includeMatches?: boolean;
  minMatchCharLength?: number;
  shouldSort?: boolean;
  findAllMatches?: boolean;
  keys?: string[];
}

export interface FilterOption {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// Validation and schema
export interface ValidationRule {
  type: 'required' | 'email' | 'url' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface Schema {
  [field: string]: ValidationRule[];
}

// Internationalization
export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  currency: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
}

export interface TranslationKey {
  key: string;
  defaultValue?: string;
  interpolation?: Record<string, any>;
  count?: number;
  context?: string;
}

// Analytics and tracking
export interface AnalyticsEvent {
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  page: string;
  referrer?: string;
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: number;
  device: DeviceInfo;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

// Configuration and settings
export interface AppConfig {
  apiUrl: string;
  wsUrl?: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildDate: string;
  features: Record<string, boolean>;
  limits: {
    fileUpload: {
      maxSize: number;
      allowedTypes: string[];
    };
    api: {
      rateLimit: number;
      timeout: number;
    };
  };
  integrations: {
    analytics?: {
      enabled: boolean;
      trackingId?: string;
    };
    sentry?: {
      enabled: boolean;
      dsn?: string;
    };
    stripe?: {
      enabled: boolean;
      publishableKey?: string;
    };
  };
}

// Generic utility functions types
export type Predicate<T> = (item: T) => boolean;
export type Mapper<T, U> = (item: T) => U;
export type Reducer<T, U> = (accumulator: U, current: T) => U;
export type Comparator<T> = (a: T, b: T) => number;
export type KeyExtractor<T> = (item: T) => string | number;