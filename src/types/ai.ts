export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  type: 'direitagpt' | 'creative';
  status: 'active' | 'archived' | 'deleted';
  message_count: number;
  total_tokens: number;
  cost: number;
  last_message_at: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_time?: number;
  cost?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AIGeneration {
  id: string;
  user_id: string;
  type: 'text' | 'image' | 'audio' | 'video';
  prompt: string;
  result: string;
  model: string;
  parameters: Record<string, any>;
  tokens?: number;
  cost: number;
  generation_time: number;
  quality_score?: number;
  is_favorite: boolean;
  is_public: boolean;
  tags: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openrouter' | 'openai' | 'anthropic' | 'google' | 'local';
  type: 'text' | 'image' | 'audio' | 'video' | 'multimodal';
  description: string;
  max_tokens: number;
  cost_per_token: number;
  capabilities: string[];
  is_available: boolean;
  is_premium: boolean;
  parameters: {
    temperature: { min: number; max: number; default: number };
    max_tokens: { min: number; max: number; default: number };
    top_p?: { min: number; max: number; default: number };
    frequency_penalty?: { min: number; max: number; default: number };
    presence_penalty?: { min: number; max: number; default: number };
  };
  metadata?: Record<string, any>;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'politica' | 'economia' | 'educacao' | 'criativo' | 'analise' | 'redacao' | 'outro';
  type: 'direitagpt' | 'creative';
  template: string;
  variables: Array<{
    name: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    label: string;
    description?: string;
    required: boolean;
    options?: string[];
    default?: any;
  }>;
  tags: string[];
  is_public: boolean;
  is_featured: boolean;
  usage_count: number;
  rating: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConversationData {
  title?: string;
  type: 'direitagpt' | 'creative';
  initial_message?: string;
  model?: string;
  parameters?: Record<string, any>;
}

export interface SendMessageData {
  content: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  context?: string[];
}

export interface CreateGenerationData {
  type: 'text' | 'image' | 'audio' | 'video';
  prompt: string;
  model: string;
  parameters: Record<string, any>;
  tags?: string[];
  is_public?: boolean;
}

export interface AIUsageStats {
  user_id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  total_conversations: number;
  total_messages: number;
  total_generations: number;
  total_tokens: number;
  total_cost: number;
  average_response_time: number;
  most_used_models: Array<{
    model: string;
    usage_count: number;
    total_tokens: number;
    total_cost: number;
  }>;
  categories: Record<string, number>;
  daily_usage: Array<{
    date: string;
    conversations: number;
    messages: number;
    tokens: number;
    cost: number;
  }>;
}

export interface AIQuota {
  user_id: string;
  plan: 'free' | 'premium' | 'vip';
  period: 'daily' | 'monthly';
  limit_conversations: number;
  limit_messages: number;
  limit_tokens: number;
  limit_generations: number;
  limit_cost: number;
  used_conversations: number;
  used_messages: number;
  used_tokens: number;
  used_generations: number;
  used_cost: number;
  reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface AIFeedback {
  id: string;
  conversation_id?: string;
  generation_id?: string;
  message_id?: string;
  user_id: string;
  type: 'like' | 'dislike' | 'report' | 'suggestion';
  rating?: number; // 1-5
  comment?: string;
  categories: string[];
  is_resolved: boolean;
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

export interface AISettings {
  user_id: string;
  default_model: string;
  default_temperature: number;
  default_max_tokens: number;
  auto_save_conversations: boolean;
  show_token_usage: boolean;
  show_cost: boolean;
  enable_suggestions: boolean;
  language_preference: string;
  content_filter_level: 'strict' | 'moderate' | 'permissive';
  data_retention_days: number;
  export_format: 'json' | 'txt' | 'pdf';
  notifications: {
    quota_warnings: boolean;
    new_models: boolean;
    tips_and_tricks: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface AIAnalytics {
  total_conversations: number;
  total_messages: number;
  total_generations: number;
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  total_tokens: number;
  total_cost: number;
  average_conversation_length: number;
  average_response_time: number;
  most_popular_models: Array<{
    model: string;
    usage_count: number;
    percentage: number;
  }>;
  user_satisfaction: {
    average_rating: number;
    total_feedback: number;
    positive_feedback: number;
    negative_feedback: number;
  };
  usage_trends: Array<{
    date: string;
    conversations: number;
    messages: number;
    users: number;
    tokens: number;
    cost: number;
  }>;
  top_categories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export interface AIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retry_after?: number;
  suggestion?: string;
}

export interface AIStreamResponse {
  id: string;
  content: string;
  is_complete: boolean;
  tokens?: number;
  cost?: number;
  error?: AIError;
}

export interface AIContextWindow {
  max_tokens: number;
  used_tokens: number;
  available_tokens: number;
  messages_included: number;
  truncated_messages: number;
}