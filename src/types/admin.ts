export interface AdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: AdminPermission[];
  department?: string;
  is_active: boolean;
  last_login?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  resource: 'users' | 'events' | 'store' | 'ai' | 'content' | 'analytics' | 'settings' | 'system';
  action: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'moderate';
  scope: 'all' | 'own' | 'department' | 'limited';
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  is_system_role: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardStats {
  users: {
    total: number;
    active_today: number;
    active_week: number;
    active_month: number;
    new_today: number;
    new_week: number;
    new_month: number;
    by_plan: Record<string, number>;
    by_level: Record<string, number>;
  };
  events: {
    total: number;
    active: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    today: number;
    week: number;
    month: number;
    total_participants: number;
    average_rating: number;
  };
  store: {
    total_products: number;
    active_products: number;
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
    total_revenue: number;
    revenue_today: number;
    revenue_week: number;
    revenue_month: number;
    average_order_value: number;
  };
  ai: {
    total_conversations: number;
    conversations_today: number;
    conversations_week: number;
    conversations_month: number;
    total_messages: number;
    total_tokens: number;
    total_cost: number;
    average_response_time: number;
    active_models: number;
  };
  gamification: {
    total_points_distributed: number;
    points_today: number;
    points_week: number;
    points_month: number;
    active_challenges: number;
    completed_achievements: number;
    total_badges_earned: number;
  };
  system: {
    server_uptime: number;
    memory_usage: number;
    cpu_usage: number;
    disk_usage: number;
    active_connections: number;
    error_rate: number;
    response_time: number;
  };
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  admin: {
    id: string;
    username: string;
    full_name: string;
    role: string;
  };
  action: string;
  resource_type: 'user' | 'event' | 'product' | 'order' | 'content' | 'setting' | 'system';
  resource_id?: string;
  description: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AdminReport {
  id: string;
  name: string;
  description?: string;
  type: 'users' | 'events' | 'sales' | 'ai_usage' | 'gamification' | 'system' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  parameters: Record<string, any>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    day_of_week?: number;
    day_of_month?: number;
    time: string;
    timezone: string;
    recipients: string[];
  };
  last_generated?: string;
  next_generation?: string;
  file_url?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  version: string;
  environment: 'development' | 'staging' | 'production';
  database: {
    status: 'connected' | 'disconnected' | 'error';
    response_time: number;
    active_connections: number;
    max_connections: number;
  };
  redis: {
    status: 'connected' | 'disconnected' | 'error';
    response_time: number;
    memory_usage: number;
    connected_clients: number;
  };
  storage: {
    status: 'available' | 'limited' | 'full';
    used_space: number;
    total_space: number;
    usage_percentage: number;
  };
  external_services: Array<{
    name: string;
    status: 'online' | 'offline' | 'degraded';
    response_time: number;
    last_check: string;
  }>;
  performance: {
    cpu_usage: number;
    memory_usage: number;
    disk_io: number;
    network_io: number;
    active_requests: number;
    average_response_time: number;
  };
  errors: Array<{
    type: string;
    count: number;
    last_occurrence: string;
  }>;
  last_updated: string;
}

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  category: 'system' | 'security' | 'user' | 'content' | 'payment' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  is_dismissed: boolean;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
}

export interface ContentModeration {
  id: string;
  content_type: 'user_profile' | 'event' | 'product' | 'review' | 'comment' | 'ai_conversation' | 'other';
  content_id: string;
  reported_by?: string;
  reporter?: {
    id: string;
    username: string;
    full_name: string;
  };
  reason: 'spam' | 'inappropriate' | 'harassment' | 'fake' | 'copyright' | 'other';
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assignee?: {
    id: string;
    username: string;
    full_name: string;
  };
  content_snapshot: any;
  moderation_notes?: string;
  action_taken?: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
  reviewed_by?: string;
  reviewer?: {
    id: string;
    username: string;
    full_name: string;
  };
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  category: 'general' | 'security' | 'email' | 'payment' | 'ai' | 'gamification' | 'storage' | 'analytics';
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description?: string;
  is_public: boolean;
  is_encrypted: boolean;
  validation_rules?: Record<string, any>;
  updated_by: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin: {
    id: string;
    username: string;
    full_name: string;
    role: string;
  };
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  session_id: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed';
  size: number;
  file_path: string;
  download_url?: string;
  tables_included: string[];
  compression: 'none' | 'gzip' | 'bzip2';
  encryption: boolean;
  retention_days: number;
  created_by: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface AdminAnalytics {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start_date: string;
  end_date: string;
  metrics: {
    user_growth: Array<{
      date: string;
      new_users: number;
      active_users: number;
      churned_users: number;
    }>;
    revenue_trends: Array<{
      date: string;
      revenue: number;
      orders: number;
      average_order_value: number;
    }>;
    event_performance: Array<{
      date: string;
      events_created: number;
      events_completed: number;
      total_participants: number;
      average_rating: number;
    }>;
    ai_usage: Array<{
      date: string;
      conversations: number;
      messages: number;
      tokens: number;
      cost: number;
    }>;
    system_performance: Array<{
      date: string;
      response_time: number;
      error_rate: number;
      uptime: number;
    }>;
  };
  totals: {
    users: number;
    revenue: number;
    events: number;
    ai_conversations: number;
    orders: number;
  };
  comparisons: {
    previous_period: {
      users: { value: number; change: number };
      revenue: { value: number; change: number };
      events: { value: number; change: number };
      ai_usage: { value: number; change: number };
    };
  };
}

export interface CreateAdminUserData {
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions?: string[];
  department?: string;
}

export interface UpdateAdminUserData {
  role?: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions?: string[];
  department?: string;
  is_active?: boolean;
}

export interface CreateReportData {
  name: string;
  description?: string;
  type: 'users' | 'events' | 'sales' | 'ai_usage' | 'gamification' | 'system' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  parameters: Record<string, any>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    day_of_week?: number;
    day_of_month?: number;
    time: string;
    timezone: string;
    recipients: string[];
  };
}

export interface UpdateSystemSettingData {
  value: any;
  description?: string;
}

export interface AdminFilters {
  role?: string;
  department?: string;
  is_active?: boolean;
  last_login_from?: string;
  last_login_to?: string;
  search?: string;
}

export interface ModerationFilters {
  content_type?: string;
  status?: string;
  priority?: string;
  reason?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditLogFilters {
  admin_id?: string;
  action?: string;
  resource_type?: string;
  success?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}