import { apiClient } from '../lib/api';
import type {
  Event,
  EventAgendaItem,
  EventSpeaker,
  EventSponsor,
  EventParticipant,
  EventCheckIn,
  EventReview,
  CreateEventData,
  UpdateEventData,
  EventFilters,
  EventStats,
  EventAnalytics,
  EventNotification,
  EventQRCode
} from '../types';

/**
 * Serviço de eventos para gerenciar eventos jurídicos
 */
export class EventsService {
  /**
   * Obter todos os eventos
   */
  static async getEvents(
    filters?: EventFilters,
    page = 1,
    limit = 20
  ): Promise<{
    events: Event[];
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
      if (filters.location) params.append('location', filters.location);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.organizerId) params.append('organizerId', filters.organizerId);
      if (filters.tags) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.featured !== undefined) params.append('featured', filters.featured.toString());
      if (filters.hasAvailableSpots !== undefined) {
        params.append('hasAvailableSpots', filters.hasAvailableSpots.toString());
      }
    }

    const response = await apiClient.get(`/events?${params.toString()}`);
    return response.data;
  }

  /**
   * Obter evento específico
   */
  static async getEvent(eventId: string): Promise<Event> {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  }

  /**
   * Criar novo evento
   */
  static async createEvent(data: CreateEventData): Promise<Event> {
    const response = await apiClient.post('/events', data);
    return response.data;
  }

  /**
   * Atualizar evento
   */
  static async updateEvent(
    eventId: string,
    updates: UpdateEventData
  ): Promise<Event> {
    const response = await apiClient.patch(`/events/${eventId}`, updates);
    return response.data;
  }

  /**
   * Deletar evento
   */
  static async deleteEvent(eventId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}`);
  }

  /**
   * Publicar evento
   */
  static async publishEvent(eventId: string): Promise<Event> {
    const response = await apiClient.post(`/events/${eventId}/publish`);
    return response.data;
  }

  /**
   * Cancelar evento
   */
  static async cancelEvent(
    eventId: string,
    reason: string
  ): Promise<Event> {
    const response = await apiClient.post(`/events/${eventId}/cancel`, { reason });
    return response.data;
  }

  /**
   * Obter agenda do evento
   */
  static async getEventAgenda(eventId: string): Promise<EventAgendaItem[]> {
    const response = await apiClient.get(`/events/${eventId}/agenda`);
    return response.data;
  }

  /**
   * Adicionar item à agenda
   */
  static async addAgendaItem(
    eventId: string,
    item: Omit<EventAgendaItem, 'id' | 'eventId'>
  ): Promise<EventAgendaItem> {
    const response = await apiClient.post(`/events/${eventId}/agenda`, item);
    return response.data;
  }

  /**
   * Atualizar item da agenda
   */
  static async updateAgendaItem(
    eventId: string,
    itemId: string,
    updates: Partial<EventAgendaItem>
  ): Promise<EventAgendaItem> {
    const response = await apiClient.patch(
      `/events/${eventId}/agenda/${itemId}`,
      updates
    );
    return response.data;
  }

  /**
   * Remover item da agenda
   */
  static async removeAgendaItem(eventId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}/agenda/${itemId}`);
  }

  /**
   * Obter palestrantes do evento
   */
  static async getEventSpeakers(eventId: string): Promise<EventSpeaker[]> {
    const response = await apiClient.get(`/events/${eventId}/speakers`);
    return response.data;
  }

  /**
   * Adicionar palestrante
   */
  static async addSpeaker(
    eventId: string,
    speaker: Omit<EventSpeaker, 'id' | 'eventId'>
  ): Promise<EventSpeaker> {
    const response = await apiClient.post(`/events/${eventId}/speakers`, speaker);
    return response.data;
  }

  /**
   * Atualizar palestrante
   */
  static async updateSpeaker(
    eventId: string,
    speakerId: string,
    updates: Partial<EventSpeaker>
  ): Promise<EventSpeaker> {
    const response = await apiClient.patch(
      `/events/${eventId}/speakers/${speakerId}`,
      updates
    );
    return response.data;
  }

  /**
   * Remover palestrante
   */
  static async removeSpeaker(eventId: string, speakerId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}/speakers/${speakerId}`);
  }

  /**
   * Obter patrocinadores do evento
   */
  static async getEventSponsors(eventId: string): Promise<EventSponsor[]> {
    const response = await apiClient.get(`/events/${eventId}/sponsors`);
    return response.data;
  }

  /**
   * Adicionar patrocinador
   */
  static async addSponsor(
    eventId: string,
    sponsor: Omit<EventSponsor, 'id' | 'eventId'>
  ): Promise<EventSponsor> {
    const response = await apiClient.post(`/events/${eventId}/sponsors`, sponsor);
    return response.data;
  }

  /**
   * Atualizar patrocinador
   */
  static async updateSponsor(
    eventId: string,
    sponsorId: string,
    updates: Partial<EventSponsor>
  ): Promise<EventSponsor> {
    const response = await apiClient.patch(
      `/events/${eventId}/sponsors/${sponsorId}`,
      updates
    );
    return response.data;
  }

  /**
   * Remover patrocinador
   */
  static async removeSponsor(eventId: string, sponsorId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}/sponsors/${sponsorId}`);
  }

  /**
   * Inscrever-se em evento
   */
  static async registerForEvent(
    eventId: string,
    participantData: {
      userId: string;
      ticketType: string;
      additionalInfo?: Record<string, any>;
    }
  ): Promise<EventParticipant> {
    const response = await apiClient.post(
      `/events/${eventId}/register`,
      participantData
    );
    return response.data;
  }

  /**
   * Cancelar inscrição
   */
  static async unregisterFromEvent(
    eventId: string,
    userId: string
  ): Promise<void> {
    await apiClient.delete(`/events/${eventId}/register/${userId}`);
  }

  /**
   * Obter participantes do evento
   */
  static async getEventParticipants(
    eventId: string,
    page = 1,
    limit = 50
  ): Promise<{
    participants: EventParticipant[];
    total: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(
      `/events/${eventId}/participants?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Verificar se usuário está inscrito
   */
  static async isUserRegistered(
    eventId: string,
    userId: string
  ): Promise<{ isRegistered: boolean; participant?: EventParticipant }> {
    const response = await apiClient.get(
      `/events/${eventId}/participants/${userId}/status`
    );
    return response.data;
  }

  /**
   * Fazer check-in
   */
  static async checkIn(
    eventId: string,
    userId: string,
    checkInData?: {
      location?: string;
      notes?: string;
    }
  ): Promise<EventCheckIn> {
    const response = await apiClient.post(
      `/events/${eventId}/checkin/${userId}`,
      checkInData || {}
    );
    return response.data;
  }

  /**
   * Obter check-ins do evento
   */
  static async getEventCheckIns(
    eventId: string,
    page = 1,
    limit = 50
  ): Promise<{
    checkIns: EventCheckIn[];
    total: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(
      `/events/${eventId}/checkins?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Gerar QR Code para evento
   */
  static async generateEventQRCode(
    eventId: string,
    type: 'registration' | 'checkin' | 'info' = 'info'
  ): Promise<EventQRCode> {
    const response = await apiClient.post(`/events/${eventId}/qrcode`, { type });
    return response.data;
  }

  /**
   * Processar QR Code
   */
  static async processQRCode(
    qrData: string,
    userId?: string
  ): Promise<{
    success: boolean;
    action: string;
    event?: Event;
    message: string;
  }> {
    const response = await apiClient.post('/events/qrcode/process', {
      qrData,
      userId
    });
    return response.data;
  }

  /**
   * Adicionar avaliação do evento
   */
  static async addEventReview(
    eventId: string,
    review: Omit<EventReview, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>
  ): Promise<EventReview> {
    const response = await apiClient.post(`/events/${eventId}/reviews`, review);
    return response.data;
  }

  /**
   * Obter avaliações do evento
   */
  static async getEventReviews(
    eventId: string,
    page = 1,
    limit = 20
  ): Promise<{
    reviews: EventReview[];
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const response = await apiClient.get(
      `/events/${eventId}/reviews?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Atualizar avaliação
   */
  static async updateEventReview(
    eventId: string,
    reviewId: string,
    updates: Partial<EventReview>
  ): Promise<EventReview> {
    const response = await apiClient.patch(
      `/events/${eventId}/reviews/${reviewId}`,
      updates
    );
    return response.data;
  }

  /**
   * Deletar avaliação
   */
  static async deleteEventReview(
    eventId: string,
    reviewId: string
  ): Promise<void> {
    await apiClient.delete(`/events/${eventId}/reviews/${reviewId}`);
  }

  /**
   * Obter estatísticas do evento
   */
  static async getEventStats(eventId: string): Promise<EventStats> {
    const response = await apiClient.get(`/events/${eventId}/stats`);
    return response.data;
  }

  /**
   * Obter análises do evento
   */
  static async getEventAnalytics(
    eventId: string,
    period = '30d'
  ): Promise<EventAnalytics> {
    const response = await apiClient.get(
      `/events/${eventId}/analytics?period=${period}`
    );
    return response.data;
  }

  /**
   * Exportar lista de participantes
   */
  static async exportParticipants(
    eventId: string,
    format: 'csv' | 'xlsx' | 'pdf' = 'csv'
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/events/${eventId}/participants/export?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Enviar notificação para participantes
   */
  static async sendNotificationToParticipants(
    eventId: string,
    notification: {
      title: string;
      message: string;
      type: 'info' | 'reminder' | 'update' | 'cancellation';
      targetGroups?: ('all' | 'registered' | 'checked_in')[];
    }
  ): Promise<{ sent: number; failed: number }> {
    const response = await apiClient.post(
      `/events/${eventId}/notifications`,
      notification
    );
    return response.data;
  }

  /**
   * Obter notificações do evento
   */
  static async getEventNotifications(
    eventId: string,
    page = 1,
    limit = 20
  ): Promise<{
    notifications: EventNotification[];
    total: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(
      `/events/${eventId}/notifications?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Buscar eventos
   */
  static async searchEvents(
    query: string,
    filters?: Partial<EventFilters>
  ): Promise<Event[]> {
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

    const response = await apiClient.get(`/events/search?${params.toString()}`);
    return response.data;
  }

  /**
   * Obter eventos próximos
   */
  static async getUpcomingEvents(
    limit = 10,
    userId?: string
  ): Promise<Event[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (userId) params.append('userId', userId);

      const response = await apiClient.get(`/events/upcoming?${params.toString()}`);
      if (Array.isArray(response.data)) {
        return response.data;
      }
      console.warn('API retornou dados inválidos para eventos próximos:', response.data);
      return [];
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  /**
   * Obter eventos populares
   */
  static async getPopularEvents(
    limit = 10,
    period = '7d'
  ): Promise<Event[]> {
    const response = await apiClient.get(
      `/events/popular?limit=${limit}&period=${period}`
    );
    return response.data;
  }

  /**
   * Obter eventos recomendados
   */
  static async getRecommendedEvents(
    userId: string,
    limit = 10
  ): Promise<Event[]> {
    const response = await apiClient.get(
      `/events/recommended?userId=${userId}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Obter eventos do usuário
   */
  static async getUserEvents(
    userId: string,
    type: 'organized' | 'registered' | 'attended' = 'registered',
    page = 1,
    limit = 20
  ): Promise<{
    events: Event[];
    total: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(
      `/users/${userId}/events?type=${type}&page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Duplicar evento
   */
  static async duplicateEvent(
    eventId: string,
    updates?: Partial<CreateEventData>
  ): Promise<Event> {
    const response = await apiClient.post(
      `/events/${eventId}/duplicate`,
      updates || {}
    );
    return response.data;
  }

  /**
   * Obter categorias de eventos
   */
  static async getEventCategories(): Promise<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    eventCount: number;
  }[]> {
    const response = await apiClient.get('/events/categories');
    return response.data;
  }

  /**
   * Obter tipos de ticket
   */
  static async getTicketTypes(eventId: string): Promise<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    maxQuantity: number;
    availableQuantity: number;
    isActive: boolean;
    features: string[];
  }[]> {
    const response = await apiClient.get(`/events/${eventId}/ticket-types`);
    return response.data;
  }
}

export default EventsService;