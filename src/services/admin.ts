import { apiClient } from '../lib/api';
import type {
  AdminUser,
  AdminPermission,
  AdminRole,
  AdminDashboardStats,
  AdminActivity,
  AdminReport,
  SystemHealth,
  AdminNotification,
  ContentModeration,
  SystemSettings,
  AdminAuditLog,
  BackupInfo,
  AdminAnalytics,
  CreateAdminUserData,
  UpdateAdminUserData,
  CreateReportData,
  UpdateSystemSettingData,
  AdminFilters,
  ModerationFilters,
  AuditLogFilters
} from '../types';

/**
 * Serviço de administração para gerenciar usuários, sistema e configurações
 */
export class AdminService {
  /**
   * Obter estatísticas do dashboard administrativo
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  }

  /**
   * Obter dados de overview do dashboard
   */
  static async getOverview(): Promise<any> {
    const response = await apiClient.get('/admin/overview');
    return response.data;
  }

  /**
   * Obter lista de usuários
   */
  static async getUsers(filters?: {
    plan?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get(`/admin/users?${params.toString()}`);
    return response.data;
  }

  /**
   * Atualizar usuário
   */
  static async updateUser(
    userId: string,
    updates: {
      full_name?: string;
      username?: string;
      email?: string;
      city?: string;
      state?: string;
      plan?: string;
    }
  ): Promise<any> {
    const response = await apiClient.put(`/admin/users/${userId}`, updates);
    return response.data;
  }

  /**
   * Obter análises administrativas
   */
  static async getAnalytics(
    period: 'day' | 'week' | 'month' | 'year',
    startDate?: string,
    endDate?: string
  ): Promise<AdminAnalytics> {
    const params = new URLSearchParams({ period });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(
      `/admin/analytics?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter saúde do sistema
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const response = await apiClient.get('/admin/system/health');
    return response.data;
  }

  /**
   * Obter todos os usuários administrativos
   */
  static async getAdminUsers(
    filters?: AdminFilters,
    page = 1,
    limit = 20
  ): Promise<{
    users: AdminUser[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(
      `/admin/users?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter usuário administrativo específico
   */
  static async getAdminUser(userId: string): Promise<AdminUser> {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  }

  /**
   * Criar novo usuário administrativo
   */
  static async createAdminUser(
    data: CreateAdminUserData
  ): Promise<AdminUser> {
    const response = await apiClient.post('/admin/users', data);
    return response.data;
  }

  /**
   * Atualizar usuário administrativo
   */
  static async updateAdminUser(
    userId: string,
    updates: UpdateAdminUserData
  ): Promise<AdminUser> {
    const response = await apiClient.patch(`/admin/users/${userId}`, updates);
    return response.data;
  }

  /**
   * Deletar usuário administrativo
   */
  static async deleteAdminUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  }

  /**
   * Ativar/desativar usuário administrativo
   */
  static async toggleAdminUserStatus(
    userId: string,
    active: boolean
  ): Promise<AdminUser> {
    const response = await apiClient.patch(`/admin/users/${userId}/status`, {
      active
    });
    return response.data;
  }

  /**
   * Redefinir senha de usuário administrativo
   */
  static async resetAdminUserPassword(
    userId: string
  ): Promise<{ temporaryPassword: string }> {
    const response = await apiClient.post(
      `/admin/users/${userId}/reset-password`
    );
    return response.data;
  }

  /**
   * Obter todas as funções administrativas
   */
  static async getAdminRoles(): Promise<AdminRole[]> {
    const response = await apiClient.get('/admin/roles');
    return response.data;
  }

  /**
   * Obter função administrativa específica
   */
  static async getAdminRole(roleId: string): Promise<AdminRole> {
    const response = await apiClient.get(`/admin/roles/${roleId}`);
    return response.data;
  }

  /**
   * Criar nova função administrativa
   */
  static async createAdminRole(data: {
    name: string;
    description: string;
    permissions: string[];
    level: number;
  }): Promise<AdminRole> {
    const response = await apiClient.post('/admin/roles', data);
    return response.data;
  }

  /**
   * Atualizar função administrativa
   */
  static async updateAdminRole(
    roleId: string,
    updates: {
      name?: string;
      description?: string;
      permissions?: string[];
      level?: number;
    }
  ): Promise<AdminRole> {
    const response = await apiClient.patch(`/admin/roles/${roleId}`, updates);
    return response.data;
  }

  /**
   * Deletar função administrativa
   */
  static async deleteAdminRole(roleId: string): Promise<void> {
    await apiClient.delete(`/admin/roles/${roleId}`);
  }

  /**
   * Obter todas as permissões
   */
  static async getPermissions(): Promise<AdminPermission[]> {
    const response = await apiClient.get('/admin/permissions');
    return response.data;
  }

  /**
   * Atribuir função a usuário
   */
  static async assignRoleToUser(
    userId: string,
    roleId: string
  ): Promise<AdminUser> {
    const response = await apiClient.post(
      `/admin/users/${userId}/roles/${roleId}`
    );
    return response.data;
  }

  /**
   * Remover função de usuário
   */
  static async removeRoleFromUser(
    userId: string,
    roleId: string
  ): Promise<AdminUser> {
    const response = await apiClient.delete(
      `/admin/users/${userId}/roles/${roleId}`
    );
    return response.data;
  }

  /**
   * Obter atividades administrativas
   */
  static async getAdminActivities(
    userId?: string,
    action?: string,
    page = 1,
    limit = 20
  ): Promise<{
    activities: AdminActivity[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (userId) params.append('userId', userId);
    if (action) params.append('action', action);

    const response = await apiClient.get(
      `/admin/activities?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter relatórios administrativos
   */
  static async getReports(
    type?: string,
    status?: string,
    page = 1,
    limit = 20
  ): Promise<{
    reports: AdminReport[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (type) params.append('type', type);
    if (status) params.append('status', status);

    const response = await apiClient.get(
      `/admin/reports?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter relatório específico
   */
  static async getReport(reportId: string): Promise<AdminReport> {
    const response = await apiClient.get(`/admin/reports/${reportId}`);
    return response.data;
  }

  /**
   * Criar novo relatório
   */
  static async createReport(data: CreateReportData): Promise<AdminReport> {
    const response = await apiClient.post('/admin/reports', data);
    return response.data;
  }

  /**
   * Atualizar relatório
   */
  static async updateReport(
    reportId: string,
    updates: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
      tags?: string[];
    }
  ): Promise<AdminReport> {
    const response = await apiClient.patch(
      `/admin/reports/${reportId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar relatório
   */
  static async deleteReport(reportId: string): Promise<void> {
    await apiClient.delete(`/admin/reports/${reportId}`);
  }

  /**
   * Gerar relatório automático
   */
  static async generateReport(data: {
    type: string;
    parameters: Record<string, any>;
    format: 'pdf' | 'excel' | 'csv';
    schedule?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string;
      recipients: string[];
    };
  }): Promise<{ reportId: string; downloadUrl?: string }> {
    const response = await apiClient.post('/admin/reports/generate', data);
    return response.data;
  }

  /**
   * Baixar relatório
   */
  static async downloadReport(
    reportId: string,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const response = await apiClient.post(
      `/admin/reports/${reportId}/download`,
      { format }
    );
    return response.data;
  }

  /**
   * Obter notificações administrativas
   */
  static async getAdminNotifications(
    read?: boolean,
    priority?: string,
    page = 1,
    limit = 20
  ): Promise<{
    notifications: AdminNotification[];
    total: number;
    totalPages: number;
    unreadCount: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (read !== undefined) params.append('read', read.toString());
    if (priority) params.append('priority', priority);

    const response = await apiClient.get(
      `/admin/notifications?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Marcar notificação como lida
   */
  static async markNotificationAsRead(
    notificationId: string
  ): Promise<AdminNotification> {
    const response = await apiClient.patch(
      `/admin/notifications/${notificationId}/read`
    );
    return response.data;
  }

  /**
   * Marcar todas as notificações como lidas
   */
  static async markAllNotificationsAsRead(): Promise<{ count: number }> {
    const response = await apiClient.patch('/admin/notifications/read-all');
    return response.data;
  }

  /**
   * Obter itens para moderação de conteúdo
   */
  static async getModerationQueue(
    filters?: ModerationFilters,
    page = 1,
    limit = 20
  ): Promise<{
    items: ContentModeration[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(
      `/admin/moderation?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Moderar conteúdo
   */
  static async moderateContent(
    itemId: string,
    action: 'approve' | 'reject' | 'flag',
    reason?: string,
    notes?: string
  ): Promise<ContentModeration> {
    const response = await apiClient.post(
      `/admin/moderation/${itemId}/moderate`,
      { action, reason, notes }
    );
    return response.data;
  }

  /**
   * Obter configurações do sistema
   */
  static async getSystemSettings(): Promise<SystemSettings> {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  }

  /**
   * Atualizar configuração do sistema
   */
  static async updateSystemSetting(
    key: string,
    data: UpdateSystemSettingData
  ): Promise<SystemSettings> {
    const response = await apiClient.patch(`/admin/settings/${key}`, data);
    return response.data;
  }

  /**
   * Atualizar múltiplas configurações
   */
  static async updateSystemSettings(
    settings: Record<string, any>
  ): Promise<SystemSettings> {
    const response = await apiClient.patch('/admin/settings', settings);
    return response.data;
  }

  /**
   * Resetar configuração para padrão
   */
  static async resetSystemSetting(key: string): Promise<SystemSettings> {
    const response = await apiClient.post(`/admin/settings/${key}/reset`);
    return response.data;
  }

  /**
   * Obter logs de auditoria
   */
  static async getAuditLogs(
    filters?: AuditLogFilters,
    page = 1,
    limit = 20
  ): Promise<{
    logs: AdminAuditLog[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

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

    const response = await apiClient.get(
      `/admin/audit-logs?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter log de auditoria específico
   */
  static async getAuditLog(logId: string): Promise<AdminAuditLog> {
    const response = await apiClient.get(`/admin/audit-logs/${logId}`);
    return response.data;
  }

  /**
   * Exportar logs de auditoria
   */
  static async exportAuditLogs(
    filters?: AuditLogFilters,
    format: 'csv' | 'excel' | 'json' = 'csv'
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const params = new URLSearchParams({ format });

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

    const response = await apiClient.post(
      `/admin/audit-logs/export?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter informações de backup
   */
  static async getBackupInfo(): Promise<BackupInfo[]> {
    const response = await apiClient.get('/admin/backups');
    return response.data;
  }

  /**
   * Criar backup
   */
  static async createBackup(data: {
    type: 'full' | 'incremental' | 'differential';
    description?: string;
    includeFiles?: boolean;
    includeDatabase?: boolean;
  }): Promise<{ backupId: string; status: string }> {
    const response = await apiClient.post('/admin/backups', data);
    return response.data;
  }

  /**
   * Restaurar backup
   */
  static async restoreBackup(
    backupId: string,
    options?: {
      restoreFiles?: boolean;
      restoreDatabase?: boolean;
      targetDate?: string;
    }
  ): Promise<{ restoreId: string; status: string }> {
    const response = await apiClient.post(
      `/admin/backups/${backupId}/restore`,
      options
    );
    return response.data;
  }

  /**
   * Deletar backup
   */
  static async deleteBackup(backupId: string): Promise<void> {
    await apiClient.delete(`/admin/backups/${backupId}`);
  }

  /**
   * Obter status de operação de backup/restore
   */
  static async getOperationStatus(
    operationId: string
  ): Promise<{
    id: string;
    type: 'backup' | 'restore';
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message?: string;
    startedAt: string;
    completedAt?: string;
  }> {
    const response = await apiClient.get(
      `/admin/operations/${operationId}/status`
    );
    return response.data;
  }

  /**
   * Executar manutenção do sistema
   */
  static async runSystemMaintenance(tasks: {
    clearCache?: boolean;
    optimizeDatabase?: boolean;
    cleanupFiles?: boolean;
    updateIndexes?: boolean;
    generateSitemaps?: boolean;
  }): Promise<{ maintenanceId: string; status: string }> {
    const response = await apiClient.post('/admin/maintenance', tasks);
    return response.data;
  }

  /**
   * Obter métricas de performance
   */
  static async getPerformanceMetrics(
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<{
    cpu: number[];
    memory: number[];
    disk: number[];
    network: number[];
    responseTime: number[];
    errorRate: number[];
    timestamps: string[];
  }> {
    const response = await apiClient.get(
      `/admin/metrics/performance?period=${period}`
    );
    return response.data;
  }

  /**
   * Obter estatísticas de uso
   */
  static async getUsageStats(
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<{
    activeUsers: number;
    newUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    pageViews: number;
    bounceRate: number;
    conversionRate: number;
    revenue: number;
  }> {
    const response = await apiClient.get(
      `/admin/stats/usage?period=${period}`
    );
    return response.data;
  }

  /**
   * Enviar notificação para usuários
   */
  static async sendBroadcastNotification(data: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    targetUsers?: string[];
    targetRoles?: string[];
    channels: ('email' | 'push' | 'sms' | 'in_app')[];
    scheduledFor?: string;
  }): Promise<{ notificationId: string; status: string }> {
    const response = await apiClient.post('/admin/notifications/broadcast', data);
    return response.data;
  }

  /**
   * Obter estatísticas de notificações
   */
  static async getNotificationStats(
    notificationId: string
  ): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }> {
    const response = await apiClient.get(
      `/admin/notifications/${notificationId}/stats`
    );
    return response.data;
  }
}

export default AdminService;