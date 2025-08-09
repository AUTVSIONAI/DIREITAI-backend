export interface Product {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  category: 'livros' | 'cursos' | 'eventos' | 'assinaturas' | 'merchandising' | 'digital' | 'outro';
  type: 'physical' | 'digital' | 'service' | 'subscription';
  price: number;
  original_price?: number;
  currency: string;
  discount_percentage?: number;
  is_on_sale: boolean;
  stock_quantity?: number;
  is_unlimited_stock: boolean;
  sku?: string;
  images: string[];
  thumbnail_url?: string;
  tags: string[];
  features: string[];
  specifications?: Record<string, any>;
  digital_content?: {
    download_url?: string;
    access_duration?: number; // days
    file_size?: number;
    file_format?: string;
  };
  shipping?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    free_shipping: boolean;
    shipping_cost?: number;
  };
  seo?: {
    meta_title?: string;
    meta_description?: string;
    slug?: string;
  };
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string;
  price: number;
  stock_quantity?: number;
  attributes: Record<string, string>; // e.g., { "size": "M", "color": "blue" }
  images?: string[];
  is_active: boolean;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  rating: number; // 1-5
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
  would_recommend: boolean;
  verified_purchase: boolean;
  helpful_votes: number;
  images?: string[];
  is_approved: boolean;
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  price: number;
  product: Product;
  variant?: ProductVariant;
  added_at: string;
}

export interface Cart {
  items: CartItem[];
  total_items: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  payment_method: 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'paypal' | 'stripe' | 'points';
  payment_id?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
  coupon_code?: string;
  points_used?: number;
  points_earned?: number;
  billing_address: Address;
  shipping_address?: Address;
  shipping_method?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: Product;
  variant_snapshot?: ProductVariant;
}

export interface Address {
  id?: string;
  user_id?: string;
  type?: 'billing' | 'shipping' | 'both';
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_amount?: number;
  maximum_discount?: number;
  usage_limit?: number;
  usage_count: number;
  user_limit?: number;
  valid_from: string;
  valid_until: string;
  applicable_products?: string[];
  applicable_categories?: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'bank_account';
  provider: 'stripe' | 'paypal' | 'mercadopago' | 'pagseguro';
  last_four?: string;
  brand?: string;
  expires_at?: string;
  is_default: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  items: WishlistItem[];
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  variant_id?: string;
  product: Product;
  variant?: ProductVariant;
  added_at: string;
  notes?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  children?: ProductCategory[];
  product_count: number;
  is_active: boolean;
  sort_order: number;
  seo?: {
    meta_title?: string;
    meta_description?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  store_description?: string;
  store_logo?: string;
  currency: string;
  tax_rate: number;
  shipping_zones: ShippingZone[];
  payment_methods: string[];
  order_statuses: string[];
  return_policy?: string;
  terms_of_service?: string;
  privacy_policy?: string;
  contact_info: {
    email: string;
    phone?: string;
    address?: Address;
  };
  social_media?: Record<string, string>;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
  };
  analytics?: {
    google_analytics_id?: string;
    facebook_pixel_id?: string;
  };
  updated_at: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states?: string[];
  methods: ShippingMethod[];
  is_active: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  type: 'flat_rate' | 'free' | 'weight_based' | 'price_based';
  cost: number;
  minimum_amount?: number;
  maximum_weight?: number;
  estimated_days: number;
  is_active: boolean;
}

export interface StoreAnalytics {
  total_products: number;
  active_products: number;
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  conversion_rate: number;
  top_selling_products: Array<{
    product: Product;
    quantity_sold: number;
    revenue: number;
  }>;
  revenue_by_category: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  sales_trends: Array<{
    date: string;
    orders: number;
    revenue: number;
    customers: number;
  }>;
  customer_metrics: {
    new_customers: number;
    returning_customers: number;
    customer_lifetime_value: number;
  };
  inventory_alerts: Array<{
    product: Product;
    current_stock: number;
    reorder_level: number;
  }>;
}

export interface CreateProductData {
  name: string;
  description: string;
  short_description?: string;
  category: string;
  type: 'physical' | 'digital' | 'service' | 'subscription';
  price: number;
  original_price?: number;
  stock_quantity?: number;
  is_unlimited_stock?: boolean;
  sku?: string;
  images: string[];
  tags: string[];
  features: string[];
  specifications?: Record<string, any>;
  digital_content?: {
    download_url?: string;
    access_duration?: number;
    file_size?: number;
    file_format?: string;
  };
  shipping?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    free_shipping: boolean;
    shipping_cost?: number;
  };
  seo?: {
    meta_title?: string;
    meta_description?: string;
    slug?: string;
  };
  is_active?: boolean;
  is_featured?: boolean;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  is_on_sale?: boolean;
  discount_percentage?: number;
  sort_order?: number;
}

export interface ProductFilters {
  category?: string;
  type?: string;
  price_min?: number;
  price_max?: number;
  is_on_sale?: boolean;
  is_featured?: boolean;
  in_stock?: boolean;
  tags?: string[];
  search?: string;
  sort_by?: 'name' | 'price' | 'created_at' | 'popularity' | 'rating';
  sort_order?: 'asc' | 'desc';
}

export interface AddToCartData {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

export interface CreateOrderData {
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
  }>;
  billing_address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  shipping_address?: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  payment_method: string;
  shipping_method?: string;
  coupon_code?: string;
  points_to_use?: number;
  notes?: string;
}