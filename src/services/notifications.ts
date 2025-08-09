import { apiClient } from '../lib/api';
import type {
  Notification,
  NotificationChannel,
  NotificationTemplate,
  NotificationVariable,
  NotificationPreferences,
  PushSubscription,
  EmailCampaign,
  EmailCampaignStats,
  NotificationQueue,
  NotificationStats,
  WebhookEndpoint,
  WebhookDelivery,
  AnnouncementBanner,
  CreateNotificationData,
  CreateCampaignData,
  UpdateNotificationPreferencesData,
  NotificationFilters
} from '../types';

/**
 * Serviço de notificações para gerenciar comunicações e campanhas
 */
export class NotificationsService {
  /**
   * Obter notificações do usuário
   */
  static async getUserNotifications(
    filters?: NotificationFilters,
    page = 1,
    limit = 20
  ): Promise<{
    notifications: Notification[];
    total: number;
    totalPages: number;
    unreadCount: number;
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
      `/notifications?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter notificação específica
   */
  static async getNotification(notificationId: string): Promise<Notification> {
    const response = await apiClient.get(`/notifications/${notificationId}`);
    return response.data;
  }

  /**
   * Criar nova notificação
   */
  static async createNotification(
    data: CreateNotificationData
  ): Promise<Notification> {
    const response = await apiClient.post('/notifications', data);
    return response.data;
  }

  /**
   * Marcar notificação como lida
   */
  static async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  }

  /**
   * Marcar notificação como não lida
   */
  static async markAsUnread(notificationId: string): Promise<Notification> {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/unread`
    );
    return response.data;
  }

  /**
   * Marcar todas as notificações como lidas
   */
  static async markAllAsRead(): Promise<{ count: number }> {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  }

  /**
   * Deletar notificação
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }

  /**
   * Deletar todas as notificações
   */
  static async deleteAllNotifications(): Promise<{ count: number }> {
    const response = await apiClient.delete('/notifications/all');
    return response.data;
  }

  /**
   * Arquivar notificação
   */
  static async archiveNotification(notificationId: string): Promise<Notification> {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/archive`
    );
    return response.data;
  }

  /**
   * Desarquivar notificação
   */
  static async unarchiveNotification(
    notificationId: string
  ): Promise<Notification> {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/unarchive`
    );
    return response.data;
  }

  /**
   * Obter preferências de notificação do usuário
   */
  static async getNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  }

  /**
   * Atualizar preferências de notificação
   */
  static async updateNotificationPreferences(
    data: UpdateNotificationPreferencesData
  ): Promise<NotificationPreferences> {
    const response = await apiClient.patch('/notifications/preferences', data);
    return response.data;
  }

  /**
   * Resetar preferências para padrão
   */
  static async resetNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.post('/notifications/preferences/reset');
    return response.data;
  }

  /**
   * Obter canais de notificação disponíveis
   */
  static async getNotificationChannels(): Promise<NotificationChannel[]> {
    const response = await apiClient.get('/notifications/channels');
    return response.data;
  }

  /**
   * Obter canal específico
   */
  static async getNotificationChannel(
    channelId: string
  ): Promise<NotificationChannel> {
    const response = await apiClient.get(
      `/notifications/channels/${channelId}`
    );
    return response.data;
  }

  /**
   * Ativar/desativar canal de notificação
   */
  static async toggleNotificationChannel(
    channelId: string,
    enabled: boolean
  ): Promise<NotificationChannel> {
    const response = await apiClient.patch(
      `/notifications/channels/${channelId}`,
      { enabled }
    );
    return response.data;
  }

  /**
   * Configurar canal de notificação
   */
  static async configureNotificationChannel(
    channelId: string,
    config: Record<string, any>
  ): Promise<NotificationChannel> {
    const response = await apiClient.patch(
      `/notifications/channels/${channelId}/config`,
      config
    );
    return response.data;
  }

  /**
   * Testar canal de notificação
   */
  static async testNotificationChannel(
    channelId: string,
    testData?: Record<string, any>
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const response = await apiClient.post(
      `/notifications/channels/${channelId}/test`,
      testData
    );
    return response.data;
  }

  /**
   * Obter templates de notificação
   */
  static async getNotificationTemplates(
    type?: string,
    category?: string
  ): Promise<NotificationTemplate[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (category) params.append('category', category);

    const response = await apiClient.get(
      `/notifications/templates?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter template específico
   */
  static async getNotificationTemplate(
    templateId: string
  ): Promise<NotificationTemplate> {
    const response = await apiClient.get(
      `/notifications/templates/${templateId}`
    );
    return response.data;
  }

  /**
   * Criar template de notificação
   */
  static async createNotificationTemplate(data: {
    name: string;
    type: string;
    category: string;
    subject?: string;
    content: string;
    variables: NotificationVariable[];
    channels: string[];
    isActive: boolean;
    metadata?: Record<string, any>;
  }): Promise<NotificationTemplate> {
    const response = await apiClient.post('/notifications/templates', data);
    return response.data;
  }

  /**
   * Atualizar template de notificação
   */
  static async updateNotificationTemplate(
    templateId: string,
    updates: {
      name?: string;
      subject?: string;
      content?: string;
      variables?: NotificationVariable[];
      channels?: string[];
      isActive?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<NotificationTemplate> {
    const response = await apiClient.patch(
      `/notifications/templates/${templateId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar template de notificação
   */
  static async deleteNotificationTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/notifications/templates/${templateId}`);
  }

  /**
   * Duplicar template de notificação
   */
  static async duplicateNotificationTemplate(
    templateId: string,
    newName: string
  ): Promise<NotificationTemplate> {
    const response = await apiClient.post(
      `/notifications/templates/${templateId}/duplicate`,
      { name: newName }
    );
    return response.data;
  }

  /**
   * Visualizar template com dados de exemplo
   */
  static async previewNotificationTemplate(
    templateId: string,
    sampleData?: Record<string, any>
  ): Promise<{
    subject: string;
    content: string;
    renderedAt: string;
  }> {
    const response = await apiClient.post(
      `/notifications/templates/${templateId}/preview`,
      sampleData
    );
    return response.data;
  }

  /**
   * Registrar dispositivo para push notifications
   */
  static async registerPushSubscription(
    subscription: PushSubscription
  ): Promise<{ id: string; status: string }> {
    const response = await apiClient.post('/notifications/push/subscribe', {
      subscription
    });
    return response.data;
  }

  /**
   * Cancelar registro de push notifications
   */
  static async unregisterPushSubscription(
    subscriptionId?: string
  ): Promise<{ success: boolean }> {
    const response = await apiClient.post('/notifications/push/unsubscribe', {
      subscriptionId
    });
    return response.data;
  }

  /**
   * Obter assinaturas de push do usuário
   */
  static async getPushSubscriptions(): Promise<PushSubscription[]> {
    const response = await apiClient.get('/notifications/push/subscriptions');
    return response.data;
  }

  /**
   * Testar push notification
   */
  static async testPushNotification(data: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
  }): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/notifications/push/test', data);
    return response.data;
  }

  /**
   * Obter campanhas de email
   */
  static async getEmailCampaigns(
    status?: string,
    page = 1,
    limit = 20
  ): Promise<{
    campaigns: EmailCampaign[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (status) params.append('status', status);

    const response = await apiClient.get(
      `/notifications/email/campaigns?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter campanha específica
   */
  static async getEmailCampaign(campaignId: string): Promise<EmailCampaign> {
    const response = await apiClient.get(
      `/notifications/email/campaigns/${campaignId}`
    );
    return response.data;
  }

  /**
   * Criar campanha de email
   */
  static async createEmailCampaign(
    data: CreateCampaignData
  ): Promise<EmailCampaign> {
    const response = await apiClient.post(
      '/notifications/email/campaigns',
      data
    );
    return response.data;
  }

  /**
   * Atualizar campanha de email
   */
  static async updateEmailCampaign(
    campaignId: string,
    updates: {
      name?: string;
      subject?: string;
      content?: string;
      targetAudience?: any;
      scheduledFor?: string;
      settings?: Record<string, any>;
    }
  ): Promise<EmailCampaign> {
    const response = await apiClient.patch(
      `/notifications/email/campaigns/${campaignId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar campanha de email
   */
  static async deleteEmailCampaign(campaignId: string): Promise<void> {
    await apiClient.delete(`/notifications/email/campaigns/${campaignId}`);
  }

  /**
   * Enviar campanha de email
   */
  static async sendEmailCampaign(
    campaignId: string,
    options?: {
      testMode?: boolean;
      testEmails?: string[];
      sendAt?: string;
    }
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    const response = await apiClient.post(
      `/notifications/email/campaigns/${campaignId}/send`,
      options
    );
    return response.data;
  }

  /**
   * Pausar campanha de email
   */
  static async pauseEmailCampaign(
    campaignId: string
  ): Promise<EmailCampaign> {
    const response = await apiClient.post(
      `/notifications/email/campaigns/${campaignId}/pause`
    );
    return response.data;
  }

  /**
   * Retomar campanha de email
   */
  static async resumeEmailCampaign(
    campaignId: string
  ): Promise<EmailCampaign> {
    const response = await apiClient.post(
      `/notifications/email/campaigns/${campaignId}/resume`
    );
    return response.data;
  }

  /**
   * Cancelar campanha de email
   */
  static async cancelEmailCampaign(
    campaignId: string
  ): Promise<EmailCampaign> {
    const response = await apiClient.post(
      `/notifications/email/campaigns/${campaignId}/cancel`
    );
    return response.data;
  }

  /**
   * Obter estatísticas da campanha
   */
  static async getEmailCampaignStats(
    campaignId: string
  ): Promise<EmailCampaignStats> {
    const response = await apiClient.get(
      `/notifications/email/campaigns/${campaignId}/stats`
    );
    return response.data;
  }

  /**
   * Duplicar campanha de email
   */
  static async duplicateEmailCampaign(
    campaignId: string,
    newName: string
  ): Promise<EmailCampaign> {
    const response = await apiClient.post(
      `/notifications/email/campaigns/${campaignId}/duplicate`,
      { name: newName }
    );
    return response.data;
  }

  /**
   * Obter fila de notificações
   */
  static async getNotificationQueue(
    status?: string,
    priority?: string,
    page = 1,
    limit = 20
  ): Promise<{
    items: NotificationQueue[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);

    const response = await apiClient.get(
      `/notifications/queue?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Reprocessar item da fila
   */
  static async retryQueueItem(queueId: string): Promise<NotificationQueue> {
    const response = await apiClient.post(
      `/notifications/queue/${queueId}/retry`
    );
    return response.data;
  }

  /**
   * Cancelar item da fila
   */
  static async cancelQueueItem(queueId: string): Promise<NotificationQueue> {
    const response = await apiClient.post(
      `/notifications/queue/${queueId}/cancel`
    );
    return response.data;
  }

  /**
   * Obter estatísticas de notificações
   */
  static async getNotificationStats(
    period: 'day' | 'week' | 'month' | 'year',
    startDate?: string,
    endDate?: string
  ): Promise<NotificationStats> {
    const params = new URLSearchParams({ period });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(
      `/notifications/stats?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter webhooks configurados
   */
  static async getWebhookEndpoints(): Promise<WebhookEndpoint[]> {
    const response = await apiClient.get('/notifications/webhooks');
    return response.data;
  }

  /**
   * Criar webhook endpoint
   */
  static async createWebhookEndpoint(data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    isActive: boolean;
    headers?: Record<string, string>;
  }): Promise<WebhookEndpoint> {
    const response = await apiClient.post('/notifications/webhooks', data);
    return response.data;
  }

  /**
   * Atualizar webhook endpoint
   */
  static async updateWebhookEndpoint(
    webhookId: string,
    updates: {
      name?: string;
      url?: string;
      events?: string[];
      secret?: string;
      isActive?: boolean;
      headers?: Record<string, string>;
    }
  ): Promise<WebhookEndpoint> {
    const response = await apiClient.patch(
      `/notifications/webhooks/${webhookId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar webhook endpoint
   */
  static async deleteWebhookEndpoint(webhookId: string): Promise<void> {
    await apiClient.delete(`/notifications/webhooks/${webhookId}`);
  }

  /**
   * Testar webhook endpoint
   */
  static async testWebhookEndpoint(
    webhookId: string,
    testData?: Record<string, any>
  ): Promise<{ success: boolean; response: any; statusCode: number }> {
    const response = await apiClient.post(
      `/notifications/webhooks/${webhookId}/test`,
      testData
    );
    return response.data;
  }

  /**
   * Obter entregas de webhook
   */
  static async getWebhookDeliveries(
    webhookId: string,
    status?: string,
    page = 1,
    limit = 20
  ): Promise<{
    deliveries: WebhookDelivery[];
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (status) params.append('status', status);

    const response = await apiClient.get(
      `/notifications/webhooks/${webhookId}/deliveries?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Reenviar webhook
   */
  static async resendWebhook(
    webhookId: string,
    deliveryId: string
  ): Promise<WebhookDelivery> {
    const response = await apiClient.post(
      `/notifications/webhooks/${webhookId}/deliveries/${deliveryId}/resend`
    );
    return response.data;
  }

  /**
   * Obter banners de anúncio ativos
   */
  static async getAnnouncementBanners(): Promise<AnnouncementBanner[]> {
    const response = await apiClient.get('/notifications/announcements');
    return response.data;
  }

  /**
   * Criar banner de anúncio
   */
  static async createAnnouncementBanner(data: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    priority: number;
    targetAudience?: any;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    isDismissible: boolean;
    actionButton?: {
      text: string;
      url: string;
    };
  }): Promise<AnnouncementBanner> {
    const response = await apiClient.post('/notifications/announcements', data);
    return response.data;
  }

  /**
   * Atualizar banner de anúncio
   */
  static async updateAnnouncementBanner(
    bannerId: string,
    updates: {
      title?: string;
      message?: string;
      type?: 'info' | 'warning' | 'error' | 'success';
      priority?: number;
      targetAudience?: any;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
      isDismissible?: boolean;
      actionButton?: {
        text: string;
        url: string;
      };
    }
  ): Promise<AnnouncementBanner> {
    const response = await apiClient.patch(
      `/notifications/announcements/${bannerId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar banner de anúncio
   */
  static async deleteAnnouncementBanner(bannerId: string): Promise<void> {
    await apiClient.delete(`/notifications/announcements/${bannerId}`);
  }

  /**
   * Dispensar banner para o usuário
   */
  static async dismissAnnouncementBanner(
    bannerId: string
  ): Promise<{ success: boolean }> {
    const response = await apiClient.post(
      `/notifications/announcements/${bannerId}/dismiss`
    );
    return response.data;
  }

  /**
   * Obter estatísticas do banner
   */
  static async getAnnouncementBannerStats(
    bannerId: string
  ): Promise<{
    views: number;
    clicks: number;
    dismissals: number;
    clickRate: number;
    dismissalRate: number;
  }> {
    const response = await apiClient.get(
      `/notifications/announcements/${bannerId}/stats`
    );
    return response.data;
  }
}

export default NotificationsService;