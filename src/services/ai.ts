import { apiClient } from '../lib/api';
import type {
  AIConversation,
  AIMessage,
  AIGeneration,
  AIModel,
  AIPromptTemplate,
  CreateConversationData,
  SendMessageData,
  AIUsageStats,
  AIQuota,
  AIFeedback,
  AISettings,
  AIAnalytics,
  AIStreamResponse,
  AIContextWindow
} from '../types';

/**
 * Serviço de IA para gerenciar conversas e interações com modelos de linguagem
 */
export class AIService {
  /**
   * Obter todas as conversas do usuário
   */
  static async getConversations(userId: string): Promise<AIConversation[]> {
    try {
      const response = await apiClient.get(`/ai/conversations?userId=${userId}`);
      // Verificar se a resposta é um array válido
      if (Array.isArray(response.data)) {
        return response.data;
      }
      console.warn('API retornou dados inválidos para conversas:', response.data);
      return [];
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      return [];
    }
  }

  /**
   * Obter uma conversa específica
   */
  static async getConversation(conversationId: string): Promise<AIConversation> {
    const response = await apiClient.get(`/ai/conversations/${conversationId}`);
    return response.data;
  }

  /**
   * Criar nova conversa
   */
  static async createConversation(data: CreateConversationData): Promise<AIConversation> {
    const response = await apiClient.post('/ai/conversations', data);
    return response.data;
  }

  /**
   * Atualizar conversa
   */
  static async updateConversation(
    conversationId: string,
    updates: Partial<AIConversation>
  ): Promise<AIConversation> {
    const response = await apiClient.patch(`/ai/conversations/${conversationId}`, updates);
    return response.data;
  }

  /**
   * Deletar conversa
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/ai/conversations/${conversationId}`);
  }

  /**
   * Obter mensagens de uma conversa
   */
  static async getMessages(
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: AIMessage[]; total: number; hasMore: boolean }> {
    const response = await apiClient.get(
      `/ai/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Enviar mensagem para IA
   */
  static async sendMessage(data: SendMessageData): Promise<AIMessage> {
    return await this.retryWithBackoff(async () => {
      const response = await apiClient.post(
        `/ai/conversations/${data.conversationId}/messages`,
        data
      );
      return response.data;
    });
  }

  /**
   * Função auxiliar para retry com exponential backoff
   */
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Verifica se é erro 429 (rate limit)
        const is429Error = 
          error.message?.includes('429') || 
          error.status === 429 || 
          error.response?.status === 429 ||
          (error.message && error.message.includes('status: 429'));
        
        // Se não é erro 429 ou é a última tentativa, lança o erro
        if (!is429Error || attempt === maxRetries) {
          throw error;
        }
        
        // Calcula o delay com exponential backoff (mais agressivo)
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 2000;
        console.log(`⏳ Rate limit atingido (429), tentando novamente em ${Math.round(delay)}ms (tentativa ${attempt + 1}/${maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Enviar mensagem com streaming
   */
  static async sendMessageStream(
    data: SendMessageData,
    onChunk: (chunk: AIStreamResponse) => void,
    onComplete: (message: AIMessage) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await this.retryWithBackoff(async () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://direitai-backend.vercel.app/api';
        const res = await fetch(`${apiUrl}/ai/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        return res;
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const chunk: AIStreamResponse = JSON.parse(data);
              
              if (chunk.type === 'chunk') {
                onChunk(chunk);
              } else if (chunk.type === 'complete') {
                onComplete(chunk.message!);
              } else if (chunk.type === 'error') {
                onError(new Error(chunk.error));
              }
            } catch (parseError) {
              console.error('Erro ao parsear chunk:', parseError);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Erro desconhecido'));
    }
  }

  /**
   * Regenerar resposta da IA
   */
  static async regenerateMessage(
    conversationId: string,
    messageId: string
  ): Promise<AIMessage> {
    const response = await apiClient.post(
      `/ai/conversations/${conversationId}/messages/${messageId}/regenerate`
    );
    return response.data;
  }

  /**
   * Editar mensagem
   */
  static async editMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<AIMessage> {
    const response = await apiClient.patch(
      `/ai/conversations/${conversationId}/messages/${messageId}`,
      { content }
    );
    return response.data;
  }

  /**
   * Deletar mensagem
   */
  static async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await apiClient.delete(`/ai/conversations/${conversationId}/messages/${messageId}`);
  }

  /**
   * Obter modelos de IA disponíveis
   */
  static async getModels(): Promise<AIModel[]> {
    const response = await apiClient.get('/ai/models');
    return response.data;
  }

  /**
   * Obter modelo específico
   */
  static async getModel(modelId: string): Promise<AIModel> {
    const response = await apiClient.get(`/ai/models/${modelId}`);
    return response.data;
  }

  /**
   * Obter templates de prompt
   */
  static async getPromptTemplates(): Promise<AIPromptTemplate[]> {
    const response = await apiClient.get('/ai/prompt-templates');
    return response.data;
  }

  /**
   * Criar template de prompt
   */
  static async createPromptTemplate(template: Omit<AIPromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIPromptTemplate> {
    const response = await apiClient.post('/ai/prompt-templates', template);
    return response.data;
  }

  /**
   * Atualizar template de prompt
   */
  static async updatePromptTemplate(
    templateId: string,
    updates: Partial<AIPromptTemplate>
  ): Promise<AIPromptTemplate> {
    const response = await apiClient.patch(`/ai/prompt-templates/${templateId}`, updates);
    return response.data;
  }

  /**
   * Deletar template de prompt
   */
  static async deletePromptTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/ai/prompt-templates/${templateId}`);
  }

  /**
   * Obter estatísticas de uso da IA
   */
  static async getUsageStats(userId: string, period = '30d'): Promise<AIUsageStats> {
    const response = await apiClient.get(`/ai/usage/stats?userId=${userId}&period=${period}`);
    return response.data;
  }

  /**
   * Obter quota do usuário
   */
  static async getUserQuota(userId: string): Promise<AIQuota> {
    const response = await apiClient.get(`/ai/quota?userId=${userId}`);
    return response.data;
  }

  /**
   * Obter configurações de IA do usuário
   */
  static async getUserSettings(userId: string): Promise<AISettings> {
    const response = await apiClient.get(`/ai/settings?userId=${userId}`);
    return response.data;
  }

  /**
   * Atualizar configurações de IA do usuário
   */
  static async updateUserSettings(
    userId: string,
    settings: Partial<AISettings>
  ): Promise<AISettings> {
    const response = await apiClient.patch(`/ai/settings?userId=${userId}`, settings);
    return response.data;
  }

  /**
   * Enviar feedback sobre uma resposta da IA
   */
  static async sendFeedback(feedback: Omit<AIFeedback, 'id' | 'createdAt'>): Promise<AIFeedback> {
    const response = await apiClient.post('/ai/feedback', feedback);
    return response.data;
  }

  /**
   * Obter análises de IA
   */
  static async getAnalytics(
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AIAnalytics> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/ai/analytics?${params.toString()}`);
    return response.data;
  }

  /**
   * Exportar conversa
   */
  static async exportConversation(
    conversationId: string,
    format: 'json' | 'txt' | 'pdf' = 'json'
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/ai/conversations/${conversationId}/export?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Importar conversa
   */
  static async importConversation(
    userId: string,
    file: File
  ): Promise<AIConversation> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    const response = await apiClient.post('/ai/conversations/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Buscar conversas
   */
  static async searchConversations(
    userId: string,
    query: string,
    filters?: {
      modelId?: string;
      startDate?: string;
      endDate?: string;
      tags?: string[];
    }
  ): Promise<AIConversation[]> {
    const params = new URLSearchParams({
      userId,
      query
    });

    if (filters) {
      if (filters.modelId) params.append('modelId', filters.modelId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.tags) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
    }

    const response = await apiClient.get(`/ai/conversations/search?${params.toString()}`);
    return response.data;
  }

  /**
   * Obter sugestões de prompt
   */
  static async getPromptSuggestions(
    context: string,
    category?: string
  ): Promise<string[]> {
    const response = await apiClient.post('/ai/prompt-suggestions', {
      context,
      category
    });
    return response.data;
  }

  /**
   * Verificar moderação de conteúdo
   */
  static async moderateContent(content: string): Promise<{
    flagged: boolean;
    categories: string[];
    confidence: number;
  }> {
    const response = await apiClient.post('/ai/moderate', { content });
    return response.data;
  }

  /**
   * Obter contexto da conversa
   */
  static async getContextWindow(
    conversationId: string,
    messageId?: string
  ): Promise<AIContextWindow> {
    const url = messageId 
      ? `/ai/conversations/${conversationId}/context?messageId=${messageId}`
      : `/ai/conversations/${conversationId}/context`;
    
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Gerar título para conversa
   */
  static async generateConversationTitle(
    conversationId: string
  ): Promise<{ title: string }> {
    const response = await apiClient.post(
      `/ai/conversations/${conversationId}/generate-title`
    );
    return response.data;
  }

  /**
   * Gerar resumo da conversa
   */
  static async generateConversationSummary(
    conversationId: string
  ): Promise<{ summary: string }> {
    const response = await apiClient.post(
      `/ai/conversations/${conversationId}/generate-summary`
    );
    return response.data;
  }

  /**
   * Obter conversas relacionadas
   */
  static async getRelatedConversations(
    conversationId: string,
    limit = 5
  ): Promise<AIConversation[]> {
    const response = await apiClient.get(
      `/ai/conversations/${conversationId}/related?limit=${limit}`
    );
    return response.data;
  }

  /**
   * Marcar conversa como favorita
   */
  static async toggleConversationFavorite(
    conversationId: string,
    isFavorite: boolean
  ): Promise<AIConversation> {
    const response = await apiClient.patch(
      `/ai/conversations/${conversationId}/favorite`,
      { isFavorite }
    );
    return response.data;
  }

  /**
   * Arquivar/desarquivar conversa
   */
  static async toggleConversationArchive(
    conversationId: string,
    isArchived: boolean
  ): Promise<AIConversation> {
    const response = await apiClient.patch(
      `/ai/conversations/${conversationId}/archive`,
      { isArchived }
    );
    return response.data;
  }

  /**
   * Compartilhar conversa
   */
  static async shareConversation(
    conversationId: string,
    options: {
      isPublic: boolean;
      allowComments?: boolean;
      expiresAt?: string;
    }
  ): Promise<{ shareUrl: string; shareId: string }> {
    const response = await apiClient.post(
      `/ai/conversations/${conversationId}/share`,
      options
    );
    return response.data;
  }

  /**
   * Obter conversa compartilhada
   */
  static async getSharedConversation(shareId: string): Promise<AIConversation> {
    const response = await apiClient.get(`/ai/shared/${shareId}`);
    return response.data;
  }

  /**
   * Clonar conversa
   */
  static async cloneConversation(
    conversationId: string,
    userId: string
  ): Promise<AIConversation> {
    const response = await apiClient.post(
      `/ai/conversations/${conversationId}/clone`,
      { userId }
    );
    return response.data;
  }
}

export default AIService;