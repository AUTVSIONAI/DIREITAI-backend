export interface Event {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  image_url?: string;
  event_type: 'presencial' | 'online' | 'hibrido';
  category: 'politica' | 'economia' | 'cultura' | 'educacao' | 'religiao' | 'familia' | 'outro';
  status: 'ativo' | 'cancelado' | 'concluido' | 'rascunho';
  start_date: string;
  end_date: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  max_participants?: number;
  current_participants: number;
  price: number;
  currency: string;
  is_free: boolean;
  requires_approval: boolean;
  is_featured: boolean;
  tags: string[];
  organizer_id: string;
  organizer: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  agenda?: EventAgendaItem[];
  speakers?: EventSpeaker[];
  sponsors?: EventSponsor[];
  requirements?: string[];
  benefits?: string[];
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    social_media?: Record<string, string>;
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EventAgendaItem {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  speaker_id?: string;
  speaker?: EventSpeaker;
  start_time: string;
  end_time: string;
  location?: string;
  type: 'apresentacao' | 'workshop' | 'painel' | 'networking' | 'intervalo' | 'outro';
  is_break: boolean;
  order_index: number;
}

export interface EventSpeaker {
  id: string;
  name: string;
  bio?: string;
  title?: string;
  company?: string;
  avatar_url?: string;
  social_media?: Record<string, string>;
  expertise_areas: string[];
  is_featured: boolean;
}

export interface EventSponsor {
  id: string;
  name: string;
  logo_url: string;
  website?: string;
  description?: string;
  tier: 'ouro' | 'prata' | 'bronze' | 'apoio';
  order_index: number;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  status: 'confirmado' | 'pendente' | 'cancelado' | 'presente';
  registration_date: string;
  check_in_date?: string;
  payment_status?: 'pendente' | 'pago' | 'cancelado' | 'reembolsado';
  payment_id?: string;
  notes?: string;
}

export interface EventCheckIn {
  id: string;
  event_id: string;
  user_id: string;
  check_in_time: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  method: 'qr_code' | 'manual' | 'geolocation';
  verified_by?: string;
  points_earned: number;
  metadata?: Record<string, any>;
}

export interface EventReview {
  id: string;
  event_id: string;
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
  would_recommend: boolean;
  aspects: {
    organization: number;
    content: number;
    speakers: number;
    venue: number;
    networking: number;
  };
  is_verified: boolean;
  helpful_votes: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  short_description?: string;
  image_url?: string;
  event_type: 'presencial' | 'online' | 'hibrido';
  category: 'politica' | 'economia' | 'cultura' | 'educacao' | 'religiao' | 'familia' | 'outro';
  start_date: string;
  end_date: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  max_participants?: number;
  price: number;
  is_free: boolean;
  requires_approval: boolean;
  tags: string[];
  agenda?: Omit<EventAgendaItem, 'id' | 'event_id'>[];
  speakers?: Omit<EventSpeaker, 'id'>[];
  sponsors?: Omit<EventSponsor, 'id'>[];
  requirements?: string[];
  benefits?: string[];
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    social_media?: Record<string, string>;
  };
}

export interface UpdateEventData extends Partial<CreateEventData> {
  status?: 'ativo' | 'cancelado' | 'concluido' | 'rascunho';
  is_featured?: boolean;
}

export interface EventFilters {
  category?: string;
  event_type?: string;
  status?: string;
  city?: string;
  state?: string;
  date_from?: string;
  date_to?: string;
  is_free?: boolean;
  is_featured?: boolean;
  has_spots?: boolean;
  organizer_id?: string;
  tags?: string[];
  search?: string;
}

export interface EventStats {
  total_events: number;
  active_events: number;
  completed_events: number;
  total_participants: number;
  total_checkins: number;
  average_rating: number;
  popular_categories: Array<{
    category: string;
    count: number;
  }>;
  upcoming_events: number;
  events_this_month: number;
}

export interface EventAnalytics {
  event_id: string;
  views: number;
  registrations: number;
  checkins: number;
  completion_rate: number;
  average_rating: number;
  total_reviews: number;
  revenue: number;
  refunds: number;
  no_shows: number;
  demographics: {
    age_groups: Record<string, number>;
    locations: Record<string, number>;
    user_levels: Record<string, number>;
  };
  daily_stats: Array<{
    date: string;
    views: number;
    registrations: number;
    checkins: number;
  }>;
}

export interface EventNotification {
  id: string;
  event_id: string;
  user_id: string;
  type: 'reminder' | 'update' | 'cancellation' | 'checkin_reminder' | 'review_request';
  title: string;
  message: string;
  scheduled_for: string;
  sent_at?: string;
  is_sent: boolean;
  metadata?: Record<string, any>;
}

export interface EventQRCode {
  event_id: string;
  qr_code_data: string;
  qr_code_url: string;
  expires_at?: string;
  usage_count: number;
  max_usage?: number;
}