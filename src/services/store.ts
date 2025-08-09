import { apiClient } from '../lib/api';
import type {
  Product,
  ProductVariant,
  ProductReview,
  CartItem,
  Cart,
  Order,
  OrderItem,
  Address,
  Coupon,
  PaymentMethod,
  Wishlist,
  WishlistItem,
  ProductCategory,
  StoreSettings,
  ShippingZone,
  ShippingMethod,
  StoreAnalytics,
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  AddToCartData,
  CreateOrderData
} from '../types';

/**
 * Serviço de loja para gerenciar produtos e vendas
 */
export class StoreService {
  /**
   * Obter todos os produtos
   */
  static async getProducts(
    filters?: ProductFilters,
    page = 1,
    limit = 20
  ): Promise<{
    products: Product[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters) {
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (filters.featured !== undefined) params.append('featured', filters.featured.toString());
      if (filters.onSale !== undefined) params.append('onSale', filters.onSale.toString());
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.tags) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const response = await apiClient.get(`/products?${params.toString()}`);
    return response.data;
  }

  /**
   * Obter produto específico
   */
  static async getProduct(productId: string): Promise<Product> {
    const response = await apiClient.get(`/products/${productId}`);
    return response.data;
  }

  /**
   * Criar novo produto
   */
  static async createProduct(data: CreateProductData): Promise<Product> {
    const response = await apiClient.post('/products', data);
    return response.data;
  }

  /**
   * Atualizar produto
   */
  static async updateProduct(
    productId: string,
    updates: UpdateProductData
  ): Promise<Product> {
    const response = await apiClient.patch(`/products/${productId}`, updates);
    return response.data;
  }

  /**
   * Deletar produto
   */
  static async deleteProduct(productId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}`);
  }

  /**
   * Obter variantes do produto
   */
  static async getProductVariants(productId: string): Promise<ProductVariant[]> {
    const response = await apiClient.get(`/products/${productId}/variants`);
    return response.data;
  }

  /**
   * Criar variante do produto
   */
  static async createProductVariant(
    productId: string,
    variant: Omit<ProductVariant, 'id' | 'productId'>
  ): Promise<ProductVariant> {
    const response = await apiClient.post(`/products/${productId}/variants`, variant);
    return response.data;
  }

  /**
   * Atualizar variante do produto
   */
  static async updateProductVariant(
    productId: string,
    variantId: string,
    updates: Partial<ProductVariant>
  ): Promise<ProductVariant> {
    const response = await apiClient.patch(
      `/products/${productId}/variants/${variantId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar variante do produto
   */
  static async deleteProductVariant(
    productId: string,
    variantId: string
  ): Promise<void> {
    await apiClient.delete(`/products/${productId}/variants/${variantId}`);
  }

  /**
   * Obter avaliações do produto
   */
  static async getProductReviews(
    productId: string,
    page = 1,
    limit = 20
  ): Promise<{
    reviews: ProductReview[];
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const response = await apiClient.get(
      `/products/${productId}/reviews?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Adicionar avaliação do produto
   */
  static async addProductReview(
    productId: string,
    review: Omit<ProductReview, 'id' | 'productId' | 'createdAt' | 'updatedAt'>
  ): Promise<ProductReview> {
    const response = await apiClient.post(`/products/${productId}/reviews`, review);
    return response.data;
  }

  /**
   * Atualizar avaliação do produto
   */
  static async updateProductReview(
    productId: string,
    reviewId: string,
    updates: Partial<ProductReview>
  ): Promise<ProductReview> {
    const response = await apiClient.patch(
      `/products/${productId}/reviews/${reviewId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar avaliação do produto
   */
  static async deleteProductReview(
    productId: string,
    reviewId: string
  ): Promise<void> {
    await apiClient.delete(`/products/${productId}/reviews/${reviewId}`);
  }

  /**
   * Obter carrinho do usuário
   */
  static async getCart(userId: string): Promise<Cart> {
    const response = await apiClient.get(`/cart/${userId}`);
    return response.data;
  }

  /**
   * Adicionar item ao carrinho
   */
  static async addToCart(
    userId: string,
    data: AddToCartData
  ): Promise<CartItem> {
    const response = await apiClient.post(`/cart/${userId}/items`, data);
    return response.data;
  }

  /**
   * Atualizar item do carrinho
   */
  static async updateCartItem(
    userId: string,
    itemId: string,
    updates: { quantity?: number; variantId?: string }
  ): Promise<CartItem> {
    const response = await apiClient.patch(
      `/cart/${userId}/items/${itemId}`,
      updates
    );
    return response.data;
  }

  /**
   * Remover item do carrinho
   */
  static async removeFromCart(userId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/cart/${userId}/items/${itemId}`);
  }

  /**
   * Limpar carrinho
   */
  static async clearCart(userId: string): Promise<void> {
    await apiClient.delete(`/cart/${userId}`);
  }

  /**
   * Aplicar cupom
   */
  static async applyCoupon(
    userId: string,
    couponCode: string
  ): Promise<{ cart: Cart; coupon: Coupon }> {
    const response = await apiClient.post(`/cart/${userId}/coupon`, {
      couponCode
    });
    return response.data;
  }

  /**
   * Remover cupom
   */
  static async removeCoupon(userId: string): Promise<Cart> {
    const response = await apiClient.delete(`/cart/${userId}/coupon`);
    return response.data;
  }

  /**
   * Calcular frete
   */
  static async calculateShipping(
    userId: string,
    addressId: string
  ): Promise<{
    methods: ShippingMethod[];
    estimatedDelivery: Record<string, string>;
  }> {
    const response = await apiClient.post(`/cart/${userId}/shipping`, {
      addressId
    });
    return response.data;
  }

  /**
   * Criar pedido
   */
  static async createOrder(
    userId: string,
    data: CreateOrderData
  ): Promise<Order> {
    const response = await apiClient.post(`/orders`, {
      userId,
      ...data
    });
    return response.data;
  }

  /**
   * Obter pedidos do usuário
   */
  static async getUserOrders(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    orders: Order[];
    total: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(
      `/users/${userId}/orders?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Obter pedido específico
   */
  static async getOrder(orderId: string): Promise<Order> {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  }

  /**
   * Atualizar status do pedido
   */
  static async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<Order> {
    const response = await apiClient.patch(`/orders/${orderId}/status`, {
      status,
      notes
    });
    return response.data;
  }

  /**
   * Cancelar pedido
   */
  static async cancelOrder(
    orderId: string,
    reason: string
  ): Promise<Order> {
    const response = await apiClient.post(`/orders/${orderId}/cancel`, {
      reason
    });
    return response.data;
  }

  /**
   * Processar reembolso
   */
  static async processRefund(
    orderId: string,
    data: {
      amount?: number;
      reason: string;
      items?: string[];
    }
  ): Promise<{
    refundId: string;
    amount: number;
    status: string;
    estimatedDate: string;
  }> {
    const response = await apiClient.post(`/orders/${orderId}/refund`, data);
    return response.data;
  }

  /**
   * Rastrear pedido
   */
  static async trackOrder(orderId: string): Promise<{
    status: string;
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    history: {
      status: string;
      date: string;
      location?: string;
      description: string;
    }[];
  }> {
    const response = await apiClient.get(`/orders/${orderId}/tracking`);
    return response.data;
  }

  /**
   * Obter lista de desejos
   */
  static async getWishlist(userId: string): Promise<Wishlist> {
    const response = await apiClient.get(`/wishlist/${userId}`);
    return response.data;
  }

  /**
   * Adicionar à lista de desejos
   */
  static async addToWishlist(
    userId: string,
    productId: string,
    variantId?: string
  ): Promise<WishlistItem> {
    const response = await apiClient.post(`/wishlist/${userId}/items`, {
      productId,
      variantId
    });
    return response.data;
  }

  /**
   * Remover da lista de desejos
   */
  static async removeFromWishlist(
    userId: string,
    itemId: string
  ): Promise<void> {
    await apiClient.delete(`/wishlist/${userId}/items/${itemId}`);
  }

  /**
   * Mover da lista de desejos para o carrinho
   */
  static async moveToCart(
    userId: string,
    itemId: string,
    quantity = 1
  ): Promise<{ cartItem: CartItem; removed: boolean }> {
    const response = await apiClient.post(
      `/wishlist/${userId}/items/${itemId}/move-to-cart`,
      { quantity }
    );
    return response.data;
  }

  /**
   * Obter endereços do usuário
   */
  static async getUserAddresses(userId: string): Promise<Address[]> {
    const response = await apiClient.get(`/users/${userId}/addresses`);
    return response.data;
  }

  /**
   * Adicionar endereço
   */
  static async addAddress(
    userId: string,
    address: Omit<Address, 'id' | 'userId'>
  ): Promise<Address> {
    const response = await apiClient.post(`/users/${userId}/addresses`, address);
    return response.data;
  }

  /**
   * Atualizar endereço
   */
  static async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<Address>
  ): Promise<Address> {
    const response = await apiClient.patch(
      `/users/${userId}/addresses/${addressId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar endereço
   */
  static async deleteAddress(userId: string, addressId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}/addresses/${addressId}`);
  }

  /**
   * Definir endereço padrão
   */
  static async setDefaultAddress(
    userId: string,
    addressId: string
  ): Promise<Address> {
    const response = await apiClient.patch(
      `/users/${userId}/addresses/${addressId}/default`
    );
    return response.data;
  }

  /**
   * Obter métodos de pagamento do usuário
   */
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    const response = await apiClient.get(`/users/${userId}/payment-methods`);
    return response.data;
  }

  /**
   * Adicionar método de pagamento
   */
  static async addPaymentMethod(
    userId: string,
    paymentMethod: Omit<PaymentMethod, 'id' | 'userId'>
  ): Promise<PaymentMethod> {
    const response = await apiClient.post(
      `/users/${userId}/payment-methods`,
      paymentMethod
    );
    return response.data;
  }

  /**
   * Atualizar método de pagamento
   */
  static async updatePaymentMethod(
    userId: string,
    methodId: string,
    updates: Partial<PaymentMethod>
  ): Promise<PaymentMethod> {
    const response = await apiClient.patch(
      `/users/${userId}/payment-methods/${methodId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar método de pagamento
   */
  static async deletePaymentMethod(
    userId: string,
    methodId: string
  ): Promise<void> {
    await apiClient.delete(`/users/${userId}/payment-methods/${methodId}`);
  }

  /**
   * Obter categorias de produtos
   */
  static async getProductCategories(): Promise<ProductCategory[]> {
    const response = await apiClient.get('/products/categories');
    return response.data;
  }

  /**
   * Criar categoria de produto
   */
  static async createProductCategory(
    category: Omit<ProductCategory, 'id'>
  ): Promise<ProductCategory> {
    const response = await apiClient.post('/products/categories', category);
    return response.data;
  }

  /**
   * Atualizar categoria de produto
   */
  static async updateProductCategory(
    categoryId: string,
    updates: Partial<ProductCategory>
  ): Promise<ProductCategory> {
    const response = await apiClient.patch(
      `/products/categories/${categoryId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar categoria de produto
   */
  static async deleteProductCategory(categoryId: string): Promise<void> {
    await apiClient.delete(`/products/categories/${categoryId}`);
  }

  /**
   * Obter cupons
   */
  static async getCoupons(
    page = 1,
    limit = 20,
    filters?: {
      status?: 'active' | 'inactive' | 'expired';
      type?: 'percentage' | 'fixed' | 'free_shipping';
      search?: string;
    }
  ): Promise<{
    coupons: Coupon[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get(`/coupons?${params.toString()}`);
    return response.data;
  }

  /**
   * Criar cupom
   */
  static async createCoupon(
    coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Coupon> {
    const response = await apiClient.post('/coupons', coupon);
    return response.data;
  }

  /**
   * Atualizar cupom
   */
  static async updateCoupon(
    couponId: string,
    updates: Partial<Coupon>
  ): Promise<Coupon> {
    const response = await apiClient.patch(`/coupons/${couponId}`, updates);
    return response.data;
  }

  /**
   * Deletar cupom
   */
  static async deleteCoupon(couponId: string): Promise<void> {
    await apiClient.delete(`/coupons/${couponId}`);
  }

  /**
   * Validar cupom
   */
  static async validateCoupon(
    code: string,
    userId?: string,
    cartTotal?: number
  ): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discount?: number;
    message: string;
  }> {
    const response = await apiClient.post('/coupons/validate', {
      code,
      userId,
      cartTotal
    });
    return response.data;
  }

  /**
   * Buscar produtos
   */
  static async searchProducts(
    query: string,
    filters?: Partial<ProductFilters>
  ): Promise<Product[]> {
    const params = new URLSearchParams({ query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await apiClient.get(`/products/search?${params.toString()}`);
    return response.data;
  }

  /**
   * Obter produtos em destaque
   */
  static async getFeaturedProducts(limit = 10): Promise<Product[]> {
    const response = await apiClient.get(`/products/featured?limit=${limit}`);
    return response.data;
  }

  /**
   * Obter produtos relacionados
   */
  static async getRelatedProducts(
    productId: string,
    limit = 10
  ): Promise<Product[]> {
    const response = await apiClient.get(
      `/products/${productId}/related?limit=${limit}`
    );
    return response.data;
  }

  /**
   * Obter produtos recomendados
   */
  static async getRecommendedProducts(
    userId: string,
    limit = 10
  ): Promise<Product[]> {
    const response = await apiClient.get(
      `/products/recommended?userId=${userId}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Criar sessão de checkout do Stripe para produtos
   */
  static async createCheckoutSession(): Promise<{
    sessionId: string;
    url: string;
  }> {
    const response = await apiClient.post('/store/checkout');
    return response.data;
  }

  /**
   * Obter configurações da loja
   */
  static async getStoreSettings(): Promise<StoreSettings> {
    const response = await apiClient.get('/store/settings');
    return response.data;
  }

  /**
   * Atualizar configurações da loja
   */
  static async updateStoreSettings(
    updates: Partial<StoreSettings>
  ): Promise<StoreSettings> {
    const response = await apiClient.patch('/store/settings', updates);
    return response.data;
  }

  /**
   * Criar sessão de checkout do Stripe para produtos
   */
  static async createProductCheckout(): Promise<{
    sessionId: string;
    url: string;
  }> {
    const response = await apiClient.post('/store/checkout');
    return response.data.data;
  }

  /**
   * Obter análises da loja
   */
  static async getStoreAnalytics(
    period = '30d'
  ): Promise<StoreAnalytics> {
    const response = await apiClient.get(`/store/analytics?period=${period}`);
    return response.data;
  }

  /**
   * Obter zonas de entrega
   */
  static async getShippingZones(): Promise<ShippingZone[]> {
    const response = await apiClient.get('/shipping/zones');
    return response.data;
  }

  /**
   * Criar zona de entrega
   */
  static async createShippingZone(
    zone: Omit<ShippingZone, 'id'>
  ): Promise<ShippingZone> {
    const response = await apiClient.post('/shipping/zones', zone);
    return response.data;
  }

  /**
   * Atualizar zona de entrega
   */
  static async updateShippingZone(
    zoneId: string,
    updates: Partial<ShippingZone>
  ): Promise<ShippingZone> {
    const response = await apiClient.patch(`/shipping/zones/${zoneId}`, updates);
    return response.data;
  }

  /**
   * Deletar zona de entrega
   */
  static async deleteShippingZone(zoneId: string): Promise<void> {
    await apiClient.delete(`/shipping/zones/${zoneId}`);
  }

  /**
   * Obter métodos de entrega
   */
  static async getShippingMethods(zoneId?: string): Promise<ShippingMethod[]> {
    const url = zoneId ? `/shipping/methods?zoneId=${zoneId}` : '/shipping/methods';
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Criar método de entrega
   */
  static async createShippingMethod(
    method: Omit<ShippingMethod, 'id'>
  ): Promise<ShippingMethod> {
    const response = await apiClient.post('/shipping/methods', method);
    return response.data;
  }

  /**
   * Atualizar método de entrega
   */
  static async updateShippingMethod(
    methodId: string,
    updates: Partial<ShippingMethod>
  ): Promise<ShippingMethod> {
    const response = await apiClient.patch(
      `/shipping/methods/${methodId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar método de entrega
   */
  static async deleteShippingMethod(methodId: string): Promise<void> {
    await apiClient.delete(`/shipping/methods/${methodId}`);
  }

  /**
   * Verificar disponibilidade do produto
   */
  static async checkProductAvailability(
    productId: string,
    variantId?: string,
    quantity = 1
  ): Promise<{
    available: boolean;
    stock: number;
    maxQuantity: number;
    estimatedRestockDate?: string;
  }> {
    const params = new URLSearchParams({ quantity: quantity.toString() });
    if (variantId) params.append('variantId', variantId);

    const response = await apiClient.get(
      `/products/${productId}/availability?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Notificar quando produto estiver disponível
   */
  static async notifyWhenAvailable(
    productId: string,
    userId: string,
    variantId?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(
      `/products/${productId}/notify-availability`,
      { userId, variantId }
    );
    return response.data;
  }
}

export default StoreService;