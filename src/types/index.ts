// Authentication and user types
export * from './auth';

// Event management types
export * from './events';

// AI and conversation types
export * from './ai';

// Store and e-commerce types
export * from './store';

// Gamification and points system types
export * from './gamification';

// Admin and management types
export * from './admin';

// Notifications and communication types
export * from './notifications';

// API and HTTP types
export * from './api';

// Utility and helper types
export * from './utils';

// Common shared types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TimestampedEntity {
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UserOwnedEntity {
  user_id: string;
  created_by?: string;
  updated_by?: string;
}

export interface SoftDeletableEntity {
  deleted_at?: string;
  is_deleted?: boolean;
}

export interface VersionedEntity {
  version: number;
  revision?: string;
}

export interface TaggableEntity {
  tags: string[];
}

export interface MetadataEntity {
  metadata?: Record<string, any>;
}

export interface PublishableEntity {
  is_published: boolean;
  published_at?: string;
  published_by?: string;
}

export interface ActivatableEntity {
  is_active: boolean;
  activated_at?: string;
  deactivated_at?: string;
}

export interface FeaturedEntity {
  is_featured: boolean;
  featured_at?: string;
  featured_until?: string;
}

export interface SortableEntity {
  sort_order: number;
}

export interface SlugEntity {
  slug: string;
}

export interface SEOEntity {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
}

export interface LocalizedEntity {
  locale: string;
  translations?: Record<string, {
    title?: string;
    description?: string;
    content?: string;
    [key: string]: any;
  }>;
}

export interface AuditableEntity {
  created_by: string;
  updated_by?: string;
  deleted_by?: string;
  audit_log?: Array<{
    action: 'create' | 'update' | 'delete' | 'restore';
    user_id: string;
    timestamp: string;
    changes?: Record<string, {
      old_value?: any;
      new_value?: any;
    }>;
    ip_address?: string;
    user_agent?: string;
  }>;
}

export interface RatableEntity {
  rating_average: number;
  rating_count: number;
  rating_distribution: Record<string, number>;
}

export interface ViewableEntity {
  view_count: number;
  unique_view_count: number;
  last_viewed_at?: string;
}

export interface ShareableEntity {
  share_count: number;
  share_url: string;
  social_shares: Record<string, number>;
}

export interface CommentableEntity {
  comment_count: number;
  comments_enabled: boolean;
  last_comment_at?: string;
}

export interface LikableEntity {
  like_count: number;
  dislike_count: number;
  user_reaction?: 'like' | 'dislike' | null;
}

export interface BookmarkableEntity {
  bookmark_count: number;
  is_bookmarked?: boolean;
}

export interface FollowableEntity {
  follower_count: number;
  following_count: number;
  is_following?: boolean;
}

export interface SubscribableEntity {
  subscriber_count: number;
  is_subscribed?: boolean;
  subscription_type?: 'free' | 'premium' | 'vip';
}

export interface GeolocationEntity {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
}

export interface MediaEntity {
  images?: Array<{
    id: string;
    url: string;
    alt?: string;
    caption?: string;
    width?: number;
    height?: number;
    size?: number;
    format?: string;
    is_primary?: boolean;
  }>;
  videos?: Array<{
    id: string;
    url: string;
    thumbnail?: string;
    duration?: number;
    width?: number;
    height?: number;
    size?: number;
    format?: string;
  }>;
  documents?: Array<{
    id: string;
    url: string;
    name: string;
    size: number;
    format: string;
    description?: string;
  }>;
}

export interface PricingEntity {
  price: number;
  currency: string;
  original_price?: number;
  discount_percentage?: number;
  is_on_sale: boolean;
  sale_starts_at?: string;
  sale_ends_at?: string;
  pricing_tiers?: Array<{
    min_quantity: number;
    max_quantity?: number;
    price: number;
  }>;
}

export interface InventoryEntity {
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_in_stock: boolean;
  is_backorderable: boolean;
  restock_date?: string;
}

export interface ShippingEntity {
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  shipping_class?: string;
  requires_shipping: boolean;
  is_virtual: boolean;
  is_downloadable: boolean;
}

export interface TaxableEntity {
  tax_class: string;
  tax_status: 'taxable' | 'shipping' | 'none';
  tax_rate?: number;
}

export interface SchedulableEntity {
  starts_at?: string;
  ends_at?: string;
  timezone?: string;
  is_recurring: boolean;
  recurrence_pattern?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    days_of_week?: number[];
    day_of_month?: number;
    month_of_year?: number;
    end_date?: string;
    occurrences?: number;
  };
}

export interface NotifiableEntity {
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  };
  last_notification_sent?: string;
  notification_frequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'never';
}

export interface SearchableEntity {
  search_keywords: string[];
  search_content: string;
  search_boost: number;
  is_searchable: boolean;
}

export interface CacheableEntity {
  cache_key: string;
  cache_ttl: number;
  last_cached_at?: string;
  cache_tags: string[];
}

export interface AnalyticsEntity {
  analytics_id?: string;
  tracking_enabled: boolean;
  conversion_goals?: string[];
  custom_events?: Record<string, any>;
}

// Composite entity types
export interface FullEntity extends
  BaseEntity,
  TimestampedEntity,
  UserOwnedEntity,
  SoftDeletableEntity,
  VersionedEntity,
  TaggableEntity,
  MetadataEntity,
  PublishableEntity,
  ActivatableEntity,
  AuditableEntity {
}

export interface ContentEntity extends
  BaseEntity,
  TimestampedEntity,
  UserOwnedEntity,
  SlugEntity,
  SEOEntity,
  LocalizedEntity,
  PublishableEntity,
  TaggableEntity,
  MediaEntity,
  ViewableEntity,
  ShareableEntity,
  CommentableEntity,
  LikableEntity,
  SearchableEntity {
}

export interface ProductEntity extends
  BaseEntity,
  TimestampedEntity,
  UserOwnedEntity,
  SlugEntity,
  SEOEntity,
  MediaEntity,
  PricingEntity,
  InventoryEntity,
  ShippingEntity,
  TaxableEntity,
  TaggableEntity,
  RatableEntity,
  ViewableEntity,
  SearchableEntity {
}

export interface EventEntity extends
  BaseEntity,
  TimestampedEntity,
  UserOwnedEntity,
  SlugEntity,
  SEOEntity,
  MediaEntity,
  SchedulableEntity,
  GeolocationEntity,
  TaggableEntity,
  ViewableEntity,
  ShareableEntity,
  BookmarkableEntity,
  SearchableEntity {
}

export interface UserEntity extends
  BaseEntity,
  TimestampedEntity,
  ActivatableEntity,
  FollowableEntity,
  NotifiableEntity,
  GeolocationEntity,
  AnalyticsEntity {
}

// Global application state
export interface AppState {
  auth: {
    user: UserEntity | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    permissions: string[];
    roles: string[];
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    sidebar: {
      isOpen: boolean;
      isCollapsed: boolean;
    };
    notifications: {
      isOpen: boolean;
      unreadCount: number;
    };
    modals: Record<string, boolean>;
    loading: Record<string, boolean>;
  };
  settings: {
    general: Record<string, any>;
    privacy: Record<string, any>;
    notifications: Record<string, any>;
    appearance: Record<string, any>;
  };
  cache: {
    data: Record<string, any>;
    timestamps: Record<string, number>;
    ttl: Record<string, number>;
  };
  offline: {
    isOnline: boolean;
    lastSync: string;
    pendingActions: Array<{
      type: string;
      payload: any;
      timestamp: string;
    }>;
  };
}

// Environment and configuration
export interface Environment {
  NODE_ENV: 'development' | 'staging' | 'production';
  API_URL: string;
  WS_URL?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENROUTER_API_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  GOOGLE_ANALYTICS_ID?: string;
  SENTRY_DSN?: string;
  APP_VERSION: string;
  BUILD_DATE: string;
}