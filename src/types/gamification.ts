export interface UserLevel {
  id: string;
  name: string;
  description: string;
  min_points: number;
  max_points: number;
  level_number: number;
  icon_url?: string;
  color: string;
  benefits: string[];
  multiplier: number; // Multiplicador de pontos para este nível
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPoints {
  user_id: string;
  total_points: number;
  available_points: number;
  spent_points: number;
  current_level_id: string;
  current_level: UserLevel;
  points_to_next_level: number;
  level_progress_percentage: number;
  streak_days: number;
  longest_streak: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  type: 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund';
  amount: number;
  reason: string;
  description?: string;
  source: 'event_checkin' | 'event_creation' | 'ai_usage' | 'store_purchase' | 'daily_login' | 'referral' | 'achievement' | 'admin' | 'other';
  reference_id?: string; // ID do evento, compra, etc.
  reference_type?: 'event' | 'order' | 'conversation' | 'achievement' | 'referral';
  multiplier?: number;
  expires_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  category: 'eventos' | 'ia' | 'loja' | 'social' | 'tempo' | 'especial';
  type: 'progress' | 'milestone' | 'streak' | 'collection' | 'challenge';
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  points_reward: number;
  requirements: AchievementRequirement[];
  is_secret: boolean;
  is_active: boolean;
  unlock_count: number;
  created_at: string;
  updated_at: string;
}

export interface AchievementRequirement {
  type: 'count' | 'streak' | 'total' | 'specific' | 'time_based';
  target: number;
  metric: string; // e.g., 'events_attended', 'ai_conversations', 'consecutive_days'
  operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  additional_criteria?: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achievement: Achievement;
  progress: number;
  is_completed: boolean;
  completed_at?: string;
  points_earned: number;
  is_claimed: boolean;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  category: 'participacao' | 'lideranca' | 'conhecimento' | 'criatividade' | 'comunidade' | 'especial';
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  requirements: BadgeRequirement[];
  is_active: boolean;
  holder_count: number;
  created_at: string;
  updated_at: string;
}

export interface BadgeRequirement {
  type: 'achievement' | 'level' | 'points' | 'activity' | 'time' | 'special';
  criteria: Record<string, any>;
  description: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge: Badge;
  earned_at: string;
  is_displayed: boolean;
  display_order?: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  image_url?: string;
  category: 'eventos' | 'ia' | 'loja' | 'social' | 'conhecimento' | 'criatividade';
  type: 'individual' | 'team' | 'community';
  difficulty: 'facil' | 'medio' | 'dificil' | 'extremo';
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  max_participants?: number;
  current_participants: number;
  requirements: ChallengeRequirement[];
  rewards: ChallengeReward[];
  leaderboard_type: 'points' | 'completion_time' | 'accuracy' | 'creativity';
  rules: string[];
  tags: string[];
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChallengeRequirement {
  type: 'level' | 'points' | 'achievement' | 'badge' | 'activity';
  criteria: Record<string, any>;
  description: string;
}

export interface ChallengeReward {
  type: 'points' | 'badge' | 'achievement' | 'item' | 'discount';
  value: any;
  description: string;
  rank_requirement?: number; // Para recompensas baseadas em ranking
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  status: 'registered' | 'active' | 'completed' | 'disqualified';
  progress: number;
  score: number;
  rank?: number;
  completion_time?: number;
  submission?: any;
  joined_at: string;
  completed_at?: string;
}

export interface Leaderboard {
  id: string;
  name: string;
  description?: string;
  type: 'global' | 'weekly' | 'monthly' | 'challenge' | 'category';
  metric: 'points' | 'level' | 'achievements' | 'events_attended' | 'ai_usage' | 'store_purchases';
  timeframe: 'all_time' | 'yearly' | 'monthly' | 'weekly' | 'daily';
  category?: string;
  max_entries: number;
  is_active: boolean;
  reset_frequency?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  last_reset?: string;
  next_reset?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: string;
  leaderboard_id: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    level: UserLevel;
  };
  rank: number;
  score: number;
  previous_rank?: number;
  rank_change: number;
  metadata?: Record<string, any>;
  updated_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  type: 'daily_login' | 'event_attendance' | 'ai_usage' | 'store_activity' | 'custom';
  current_count: number;
  longest_count: number;
  last_activity_date: string;
  multiplier: number;
  bonus_points: number;
  milestones: StreakMilestone[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StreakMilestone {
  days: number;
  points_bonus: number;
  badge_id?: string;
  achievement_id?: string;
  description: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'free_item' | 'premium_access' | 'exclusive_content' | 'physical_item';
  cost_points: number;
  value: any;
  category: 'loja' | 'eventos' | 'ia' | 'premium' | 'fisico';
  stock_quantity?: number;
  is_unlimited_stock: boolean;
  image_url?: string;
  requirements: RewardRequirement[];
  expiry_days?: number;
  is_active: boolean;
  redemption_count: number;
  created_at: string;
  updated_at: string;
}

export interface RewardRequirement {
  type: 'level' | 'points' | 'achievement' | 'badge' | 'membership';
  criteria: Record<string, any>;
  description: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  reward: Reward;
  points_spent: number;
  status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
  code?: string;
  expires_at?: string;
  used_at?: string;
  redeemed_at: string;
  metadata?: Record<string, any>;
}

export interface GamificationSettings {
  id: string;
  points_per_event_checkin: number;
  points_per_event_creation: number;
  points_per_ai_message: number;
  points_per_store_purchase_percentage: number;
  points_per_daily_login: number;
  points_per_referral: number;
  streak_bonus_multiplier: number;
  level_bonus_multiplier: number;
  point_expiry_days?: number;
  achievement_notification_enabled: boolean;
  leaderboard_update_frequency: number; // minutes
  challenge_creation_enabled: boolean;
  reward_redemption_enabled: boolean;
  updated_at: string;
}

export interface GamificationStats {
  total_points_distributed: number;
  total_points_spent: number;
  active_users_with_points: number;
  total_achievements_unlocked: number;
  total_badges_earned: number;
  active_challenges: number;
  completed_challenges: number;
  average_user_level: number;
  top_point_earners: Array<{
    user: {
      id: string;
      username: string;
      full_name: string;
      avatar_url?: string;
    };
    points: number;
    level: UserLevel;
  }>;
  popular_achievements: Array<{
    achievement: Achievement;
    unlock_count: number;
  }>;
  points_distribution: Array<{
    source: string;
    total_points: number;
    percentage: number;
  }>;
}

export interface CreateChallengeData {
  name: string;
  description: string;
  short_description?: string;
  image_url?: string;
  category: 'eventos' | 'ia' | 'loja' | 'social' | 'conhecimento' | 'criatividade';
  type: 'individual' | 'team' | 'community';
  difficulty: 'facil' | 'medio' | 'dificil' | 'extremo';
  start_date: string;
  end_date: string;
  max_participants?: number;
  requirements: ChallengeRequirement[];
  rewards: ChallengeReward[];
  leaderboard_type: 'points' | 'completion_time' | 'accuracy' | 'creativity';
  rules: string[];
  tags: string[];
}

export interface UpdateChallengeData extends Partial<CreateChallengeData> {
  status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
  is_featured?: boolean;
}