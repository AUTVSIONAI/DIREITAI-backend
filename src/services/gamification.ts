import { apiClient } from '../lib/api';
import type {
  UserLevel,
  UserPoints,
  PointTransaction,
  Achievement,
  AchievementRequirement,
  UserAchievement,
  Badge,
  BadgeRequirement,
  Challenge,
  ChallengeRequirement,
  ChallengeReward,
  ChallengeParticipant,
  Leaderboard,
  LeaderboardEntry,
  Streak,
  StreakMilestone,
  Reward,
  RewardRequirement,
  UserReward,
  GamificationSettings,
  GamificationStats,
  CreateChallengeData,
  UpdateChallengeData
} from '../types';

/**
 * Serviço de gamificação para gerenciar pontos, conquistas e desafios
 */
export class GamificationService {
  /**
   * Obter pontos do usuário
   */
  static async getUserPoints(userId: string): Promise<UserPoints> {
    const response = await apiClient.get(`/gamification/users/${userId}/points`);
    return response.data;
  }

  /**
   * Obter histórico de transações de pontos
   */
  static async getPointTransactions(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    transactions: PointTransaction[];
    total: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/points/transactions?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Adicionar pontos ao usuário
   */
  static async addPoints(
    userId: string,
    data: {
      amount: number;
      reason: string;
      category: string;
      metadata?: Record<string, any>;
    }
  ): Promise<PointTransaction> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/points/add`,
      data
    );
    return response.data;
  }

  /**
   * Remover pontos do usuário
   */
  static async removePoints(
    userId: string,
    data: {
      amount: number;
      reason: string;
      category: string;
      metadata?: Record<string, any>;
    }
  ): Promise<PointTransaction> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/points/remove`,
      data
    );
    return response.data;
  }

  /**
   * Transferir pontos entre usuários
   */
  static async transferPoints(
    fromUserId: string,
    toUserId: string,
    amount: number,
    reason: string
  ): Promise<{
    fromTransaction: PointTransaction;
    toTransaction: PointTransaction;
  }> {
    const response = await apiClient.post(
      `/gamification/users/${fromUserId}/points/transfer`,
      { toUserId, amount, reason }
    );
    return response.data;
  }

  /**
   * Obter nível do usuário
   */
  static async getUserLevel(userId: string): Promise<UserLevel> {
    const response = await apiClient.get(`/gamification/users/${userId}/level`);
    return response.data;
  }

  /**
   * Calcular próximo nível
   */
  static async calculateNextLevel(userId: string): Promise<{
    currentLevel: UserLevel;
    nextLevel?: UserLevel;
    pointsNeeded: number;
    progress: number;
  }> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/level/next`
    );
    return response.data;
  }

  /**
   * Obter todas as conquistas
   */
  static async getAchievements(
    category?: string,
    difficulty?: string
  ): Promise<Achievement[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty);

    const response = await apiClient.get(
      `/gamification/achievements?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter conquista específica
   */
  static async getAchievement(achievementId: string): Promise<Achievement> {
    const response = await apiClient.get(
      `/gamification/achievements/${achievementId}`
    );
    return response.data;
  }

  /**
   * Obter conquistas do usuário
   */
  static async getUserAchievements(
    userId: string,
    status?: 'unlocked' | 'locked' | 'in_progress'
  ): Promise<UserAchievement[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(
      `/gamification/users/${userId}/achievements${params}`
    );
    return response.data;
  }

  /**
   * Verificar progresso de conquista
   */
  static async checkAchievementProgress(
    userId: string,
    achievementId: string
  ): Promise<{
    achievement: Achievement;
    progress: number;
    completed: boolean;
    requirements: {
      requirement: AchievementRequirement;
      progress: number;
      completed: boolean;
    }[];
  }> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/achievements/${achievementId}/progress`
    );
    return response.data;
  }

  /**
   * Desbloquear conquista
   */
  static async unlockAchievement(
    userId: string,
    achievementId: string
  ): Promise<UserAchievement> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/achievements/${achievementId}/unlock`
    );
    return response.data;
  }

  /**
   * Obter todas as badges
   */
  static async getBadges(category?: string): Promise<Badge[]> {
    const params = category ? `?category=${category}` : '';
    const response = await apiClient.get(`/gamification/badges${params}`);
    return response.data;
  }

  /**
   * Obter badge específica
   */
  static async getBadge(badgeId: string): Promise<Badge> {
    const response = await apiClient.get(`/gamification/badges/${badgeId}`);
    return response.data;
  }

  /**
   * Obter badges do usuário
   */
  static async getUserBadges(userId: string): Promise<Badge[]> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/badges`
    );
    return response.data;
  }

  /**
   * Conceder badge ao usuário
   */
  static async awardBadge(
    userId: string,
    badgeId: string,
    reason?: string
  ): Promise<{ success: boolean; badge: Badge }> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/badges/${badgeId}/award`,
      { reason }
    );
    return response.data;
  }

  /**
   * Obter todos os desafios
   */
  static async getChallenges(
    status?: 'active' | 'upcoming' | 'completed' | 'expired',
    category?: string
  ): Promise<Challenge[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (category) params.append('category', category);

    const response = await apiClient.get(
      `/gamification/challenges?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter desafio específico
   */
  static async getChallenge(challengeId: string): Promise<Challenge> {
    const response = await apiClient.get(
      `/gamification/challenges/${challengeId}`
    );
    return response.data;
  }

  /**
   * Criar novo desafio
   */
  static async createChallenge(
    data: CreateChallengeData
  ): Promise<Challenge> {
    const response = await apiClient.post('/gamification/challenges', data);
    return response.data;
  }

  /**
   * Atualizar desafio
   */
  static async updateChallenge(
    challengeId: string,
    updates: UpdateChallengeData
  ): Promise<Challenge> {
    const response = await apiClient.patch(
      `/gamification/challenges/${challengeId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar desafio
   */
  static async deleteChallenge(challengeId: string): Promise<void> {
    await apiClient.delete(`/gamification/challenges/${challengeId}`);
  }

  /**
   * Participar de desafio
   */
  static async joinChallenge(
    userId: string,
    challengeId: string
  ): Promise<ChallengeParticipant> {
    const response = await apiClient.post(
      `/gamification/challenges/${challengeId}/join`,
      { userId }
    );
    return response.data;
  }

  /**
   * Sair de desafio
   */
  static async leaveChallenge(
    userId: string,
    challengeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/gamification/challenges/${challengeId}/participants/${userId}`
    );
  }

  /**
   * Obter participantes do desafio
   */
  static async getChallengeParticipants(
    challengeId: string,
    page = 1,
    limit = 20
  ): Promise<{
    participants: ChallengeParticipant[];
    total: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(
      `/gamification/challenges/${challengeId}/participants?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Obter progresso do usuário no desafio
   */
  static async getChallengeProgress(
    userId: string,
    challengeId: string
  ): Promise<{
    participant: ChallengeParticipant;
    progress: number;
    completed: boolean;
    requirements: {
      requirement: ChallengeRequirement;
      progress: number;
      completed: boolean;
    }[];
  }> {
    const response = await apiClient.get(
      `/gamification/challenges/${challengeId}/participants/${userId}/progress`
    );
    return response.data;
  }

  /**
   * Completar desafio
   */
  static async completeChallenge(
    userId: string,
    challengeId: string
  ): Promise<{
    participant: ChallengeParticipant;
    rewards: ChallengeReward[];
  }> {
    const response = await apiClient.post(
      `/gamification/challenges/${challengeId}/participants/${userId}/complete`
    );
    return response.data;
  }

  /**
   * Obter desafios do usuário
   */
  static async getUserChallenges(
    userId: string,
    status?: 'active' | 'completed' | 'failed'
  ): Promise<ChallengeParticipant[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(
      `/gamification/users/${userId}/challenges${params}`
    );
    return response.data;
  }

  /**
   * Obter ranking geral
   */
  static async getLeaderboard(
    type: 'points' | 'level' | 'achievements' | 'challenges',
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time',
    limit = 50
  ): Promise<Leaderboard> {
    const params = new URLSearchParams({
      type,
      limit: limit.toString()
    });
    if (period) params.append('period', period);

    const response = await apiClient.get(
      `/gamification/leaderboard?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter posição do usuário no ranking
   */
  static async getUserRanking(
    userId: string,
    type: 'points' | 'level' | 'achievements' | 'challenges',
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time'
  ): Promise<{
    position: number;
    entry: LeaderboardEntry;
    totalParticipants: number;
  }> {
    const params = new URLSearchParams({ type });
    if (period) params.append('period', period);

    const response = await apiClient.get(
      `/gamification/users/${userId}/ranking?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter streak do usuário
   */
  static async getUserStreak(
    userId: string,
    type: string
  ): Promise<Streak> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/streaks/${type}`
    );
    return response.data;
  }

  /**
   * Obter todas as streaks do usuário
   */
  static async getUserStreaks(userId: string): Promise<Streak[]> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/streaks`
    );
    return response.data;
  }

  /**
   * Atualizar streak
   */
  static async updateStreak(
    userId: string,
    type: string,
    action: 'increment' | 'reset'
  ): Promise<Streak> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/streaks/${type}/${action}`
    );
    return response.data;
  }

  /**
   * Obter marcos de streak
   */
  static async getStreakMilestones(type: string): Promise<StreakMilestone[]> {
    const response = await apiClient.get(
      `/gamification/streaks/${type}/milestones`
    );
    return response.data;
  }

  /**
   * Obter todas as recompensas
   */
  static async getRewards(
    category?: string,
    available?: boolean
  ): Promise<Reward[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (available !== undefined) params.append('available', available.toString());

    const response = await apiClient.get(
      `/gamification/rewards?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter recompensa específica
   */
  static async getReward(rewardId: string): Promise<Reward> {
    const response = await apiClient.get(`/gamification/rewards/${rewardId}`);
    return response.data;
  }

  /**
   * Resgatar recompensa
   */
  static async redeemReward(
    userId: string,
    rewardId: string
  ): Promise<UserReward> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/rewards/${rewardId}/redeem`
    );
    return response.data;
  }

  /**
   * Obter recompensas resgatadas pelo usuário
   */
  static async getUserRewards(
    userId: string,
    status?: 'pending' | 'delivered' | 'expired'
  ): Promise<UserReward[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(
      `/gamification/users/${userId}/rewards${params}`
    );
    return response.data;
  }

  /**
   * Verificar se usuário pode resgatar recompensa
   */
  static async canRedeemReward(
    userId: string,
    rewardId: string
  ): Promise<{
    canRedeem: boolean;
    reason?: string;
    requirements: {
      requirement: RewardRequirement;
      met: boolean;
      current: number;
      needed: number;
    }[];
  }> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/rewards/${rewardId}/can-redeem`
    );
    return response.data;
  }

  /**
   * Obter estatísticas de gamificação do usuário
   */
  static async getUserGamificationStats(
    userId: string
  ): Promise<GamificationStats> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/stats`
    );
    return response.data;
  }

  /**
   * Obter configurações de gamificação
   */
  static async getGamificationSettings(): Promise<GamificationSettings> {
    const response = await apiClient.get('/gamification/settings');
    return response.data;
  }

  /**
   * Atualizar configurações de gamificação
   */
  static async updateGamificationSettings(
    updates: Partial<GamificationSettings>
  ): Promise<GamificationSettings> {
    const response = await apiClient.patch('/gamification/settings', updates);
    return response.data;
  }

  /**
   * Obter atividades recentes de gamificação
   */
  static async getRecentActivities(
    userId: string,
    limit = 20
  ): Promise<{
    type: 'points' | 'achievement' | 'badge' | 'challenge' | 'streak' | 'reward';
    title: string;
    description: string;
    points?: number;
    timestamp: string;
    metadata?: Record<string, any>;
  }[]> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/activities?limit=${limit}`
    );
    return response.data;
  }

  /**
   * Obter sugestões de atividades para ganhar pontos
   */
  static async getPointSuggestions(
    userId: string,
    limit = 10
  ): Promise<{
    activity: string;
    description: string;
    points: number;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
  }[]> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/suggestions?limit=${limit}`
    );
    return response.data;
  }

  /**
   * Obter conquistas próximas de serem desbloqueadas
   */
  static async getNearbyAchievements(
    userId: string,
    limit = 5
  ): Promise<{
    achievement: Achievement;
    progress: number;
    pointsNeeded: number;
    estimatedCompletion: string;
  }[]> {
    const response = await apiClient.get(
      `/gamification/users/${userId}/achievements/nearby?limit=${limit}`
    );
    return response.data;
  }

  /**
   * Simular ação para ver pontos que seriam ganhos
   */
  static async simulateAction(
    userId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<{
    points: number;
    achievements: Achievement[];
    badges: Badge[];
    levelUp: boolean;
    newLevel?: UserLevel;
  }> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/simulate`,
      { action, metadata }
    );
    return response.data;
  }

  /**
   * Exportar dados de gamificação do usuário
   */
  static async exportUserData(
    userId: string,
    format: 'json' | 'csv' | 'pdf'
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/export`,
      { format }
    );
    return response.data;
  }

  /**
   * Resetar progresso do usuário
   */
  static async resetUserProgress(
    userId: string,
    type: 'all' | 'points' | 'achievements' | 'challenges' | 'streaks',
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(
      `/gamification/users/${userId}/reset`,
      { type, reason }
    );
    return response.data;
  }
}

export default GamificationService;