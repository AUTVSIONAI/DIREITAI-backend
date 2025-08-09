export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement' | 'reminder' | 'social' | 'system';
  category: 'event' | 'store' | 'ai' | 'gamification' | 'social' | 'system' | 'security' | 'marketing';
  title: string;
  message: string;
  short_message?: string;
  icon?: string;
  image_url?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: NotificationChannel[];
  data?: Record<string, any>;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  is_clicked: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  scheduled_for?: string;
  sent_at?: string;
  read_at?: string;
  clicked_at?: string;
  dismissed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationChannel {
  type: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  category: 'event' | 'store' | 'ai' | 'gamification' | 'social' | 'system' | 'security' | 'marketing';
  subject?: string;
  title: string;
  content: string;
  html_content?: string;
  variables: NotificationVariable[];
  is_active: boolean;
  is_system: boolean;
  language: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  description: string;
  required: boolean;
  default_value?: any;
  example?: any;
}

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  marketing_emails: boolean;
  event_reminders: boolean;
  achievement_notifications: boolean;
  social_notifications: boolean;
  security_alerts: boolean;
  digest_frequency: 'never' | 'daily' | 'weekly' | 'monthly';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  categories: Record<string, {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  }>;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  is_active: boolean;
  last_used: string;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  subject: string;
  content: string;
  html_content?: string;
  template_id?: string;
  sender_name: string;
  sender_email: string;
  reply_to?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  type: 'newsletter' | 'promotional' | 'transactional' | 'announcement' | 'reminder';
  target_audience: {
    type: 'all' | 'segment' | 'custom';
    criteria?: Record<string, any>;
    user_ids?: string[];
    estimated_recipients: number;
  };
  schedule: {
    type: 'immediate' | 'scheduled' | 'recurring';
    send_at?: string;
    timezone?: string;
    recurring_pattern?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      days_of_week?: number[];
      day_of_month?: number;
      end_date?: string;
    };
  };
  tracking: {
    open_tracking: boolean;
    click_tracking: boolean;
    unsubscribe_tracking: boolean;
  };
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
}

export interface EmailCampaignStats {
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_opened: number;
  total_clicked: number;
  total_unsubscribed: number;
  total_complained: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
  complaint_rate: number;
  click_to_open_rate: number;
  unique_opens: number;
  unique_clicks: number;
  forwarded: number;
  revenue_generated?: number;
  cost: number;
  roi?: number;
  last_updated: string;
}

export interface NotificationQueue {
  id: string;
  notification_id: string;
  user_id: string;
  channel: 'email' | 'sms' | 'push' | 'webhook';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  processed_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year';
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_read: number;
  total_clicked: number;
  delivery_rate: number;
  read_rate: number;
  click_rate: number;
  by_channel: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    read: number;
    clicked: number;
  }>;
  by_category: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    read: number;
    clicked: number;
  }>;
  by_type: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    read: number;
    clicked: number;
  }>;
  trends: Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
  }>;
  top_performing: Array<{
    template_id: string;
    template_name: string;
    sent: number;
    read_rate: number;
    click_rate: number;
  }>;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  retry_policy: {
    max_attempts: number;
    backoff_strategy: 'linear' | 'exponential';
    initial_delay: number;
    max_delay: number;
  };
  headers?: Record<string, string>;
  timeout: number;
  last_success?: string;
  last_failure?: string;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  response_status?: number;
  response_body?: string;
  error_message?: string;
  attempts: number;
  next_retry?: string;
  delivered_at?: string;
  created_at: string;
}

export interface AnnouncementBanner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotion';
  style: 'banner' | 'modal' | 'toast' | 'sidebar';
  position: 'top' | 'bottom' | 'center';
  is_dismissible: boolean;
  is_persistent: boolean;
  target_audience: {
    type: 'all' | 'authenticated' | 'guests' | 'segment';
    criteria?: Record<string, any>;
  };
  display_rules: {
    pages?: string[];
    exclude_pages?: string[];
    start_date?: string;
    end_date?: string;
    max_views?: number;
    max_views_per_user?: number;
  };
  action?: {
    label: string;
    url: string;
    type: 'link' | 'button';
  };
  styling?: {
    background_color?: string;
    text_color?: string;
    border_color?: string;
    custom_css?: string;
  };
  is_active: boolean;
  view_count: number;
  click_count: number;
  dismiss_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  user_id?: string;
  user_ids?: string[];
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement' | 'reminder' | 'social' | 'system';
  category: 'event' | 'store' | 'ai' | 'gamification' | 'social' | 'system' | 'security' | 'marketing';
  title: string;
  message: string;
  short_message?: string;
  icon?: string;
  image_url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('in_app' | 'email' | 'sms' | 'push')[];
  data?: Record<string, any>;
  action_url?: string;
  action_label?: string;
  expires_at?: string;
  scheduled_for?: string;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  subject: string;
  content: string;
  html_content?: string;
  template_id?: string;
  sender_name?: string;
  sender_email?: string;
  reply_to?: string;
  type: 'newsletter' | 'promotional' | 'transactional' | 'announcement' | 'reminder';
  target_audience: {
    type: 'all' | 'segment' | 'custom';
    criteria?: Record<string, any>;
    user_ids?: string[];
  };
  schedule: {
    type: 'immediate' | 'scheduled' | 'recurring';
    send_at?: string;
    timezone?: string;
    recurring_pattern?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      days_of_week?: number[];
      day_of_month?: number;
      end_date?: string;
    };
  };
  tracking?: {
    open_tracking?: boolean;
    click_tracking?: boolean;
    unsubscribe_tracking?: boolean;
  };
  tags?: string[];
}

export interface UpdateNotificationPreferencesData {
  email_notifications?: boolean;
  sms_notifications?: boolean;
  push_notifications?: boolean;
  in_app_notifications?: boolean;
  marketing_emails?: boolean;
  event_reminders?: boolean;
  achievement_notifications?: boolean;
  social_notifications?: boolean;
  security_alerts?: boolean;
  digest_frequency?: 'never' | 'daily' | 'weekly' | 'monthly';
  quiet_hours?: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  categories?: Record<string, {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    in_app?: boolean;
  }>;
}

export interface NotificationFilters {
  type?: string;
  category?: string;
  priority?: string;
  is_read?: boolean;
  is_clicked?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}