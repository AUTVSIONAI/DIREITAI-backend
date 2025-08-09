export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    pagination?: PaginationMeta;
    total?: number;
    count?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    from?: number;
    to?: number;
  };
  timestamp: string;
  request_id?: string;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
  has_more: boolean;
  next_page_url?: string;
  prev_page_url?: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SearchParams {
  q?: string;
  search?: string;
  query?: string;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
  date_from?: string;
  date_to?: string;
}

export interface FilterParams {
  status?: string;
  category?: string;
  type?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
  timestamp: string;
  request_id?: string;
  trace_id?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  signal?: AbortSignal;
  onUploadProgress?: (progress: number) => void;
  onDownloadProgress?: (progress: number) => void;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  metadata?: Record<string, any>;
  uploaded_at: string;
}

export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T[];
  options?: {
    batch_size?: number;
    continue_on_error?: boolean;
    return_results?: boolean;
  };
}

export interface BulkOperationResult<T> {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: ApiError;
  }>;
  errors: ApiError[];
}

export interface WebSocketMessage {
  type: string;
  event: string;
  data: any;
  timestamp: string;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeat: boolean;
  heartbeatInterval: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retry_after?: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'ttl';
}

export interface ApiMetrics {
  request_count: number;
  error_count: number;
  average_response_time: number;
  success_rate: number;
  cache_hit_rate: number;
  rate_limit_hits: number;
  last_request: string;
  uptime: number;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    response_time?: number;
    message?: string;
  }>;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  responses?: Record<string, {
    description: string;
    schema?: any;
  }>;
  auth_required: boolean;
  rate_limit?: {
    requests: number;
    window: number;
  };
  deprecated?: boolean;
  version?: string;
}

export interface ApiDocumentation {
  title: string;
  version: string;
  description?: string;
  base_url: string;
  authentication: {
    type: 'bearer' | 'api_key' | 'oauth2';
    description: string;
  };
  endpoints: ApiEndpoint[];
  schemas: Record<string, any>;
  examples: Record<string, any>;
}

// Query types for React Query
export interface QueryConfig {
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number | ((failureCount: number, error: any) => boolean);
  retryDelay?: number | ((retryAttempt: number) => number);
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean | 'always';
  refetchOnReconnect?: boolean | 'always';
  refetchInterval?: number | false;
  enabled?: boolean;
  suspense?: boolean;
  keepPreviousData?: boolean;
  placeholderData?: any;
  initialData?: any;
  select?: (data: any) => any;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onSettled?: (data: any, error: any) => void;
}

export interface MutationConfig {
  retry?: boolean | number | ((failureCount: number, error: any) => boolean);
  retryDelay?: number | ((retryAttempt: number) => number);
  onMutate?: (variables: any) => Promise<any> | any;
  onSuccess?: (data: any, variables: any, context: any) => Promise<void> | void;
  onError?: (error: any, variables: any, context: any) => Promise<void> | void;
  onSettled?: (data: any, error: any, variables: any, context: any) => Promise<void> | void;
}

export interface InfiniteQueryConfig extends QueryConfig {
  getNextPageParam?: (lastPage: any, allPages: any[]) => any;
  getPreviousPageParam?: (firstPage: any, allPages: any[]) => any;
}

// Utility types
export type SortOrder = 'asc' | 'desc';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ContentType = 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
export type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'document';

// Generic CRUD operations
export interface CrudOperations<T, CreateData = Partial<T>, UpdateData = Partial<T>> {
  list: (params?: PaginationParams & SearchParams & FilterParams) => Promise<ApiResponse<T[]>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: CreateData) => Promise<ApiResponse<T>>;
  update: (id: string, data: UpdateData) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<void>>;
  bulkCreate?: (data: CreateData[]) => Promise<ApiResponse<BulkOperationResult<T>>>;
  bulkUpdate?: (data: Array<{ id: string } & UpdateData>) => Promise<ApiResponse<BulkOperationResult<T>>>;
  bulkDelete?: (ids: string[]) => Promise<ApiResponse<BulkOperationResult<void>>>;
}

// API client interface
export interface ApiClient {
  get<T = any>(url: string, config?: RequestOptions): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any, config?: RequestOptions): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any, config?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: RequestOptions): Promise<ApiResponse<T>>;
  upload<T = any>(url: string, file: File | FormData, config?: RequestOptions): Promise<ApiResponse<T>>;
  download(url: string, config?: RequestOptions): Promise<Blob>;
  setAuthToken(token: string): void;
  clearAuthToken(): void;
  getMetrics(): ApiMetrics;
  healthCheck(): Promise<HealthCheck>;
}