import { apiClient } from '../lib/api';

// Interfaces para o sistema de memória da IA
export interface AIConversationV2 {
  id: string;
  user_id: string;
  title: string;
  type: 'direitagpt' | 'creative' | 'support';
  status: 'active' | 'archived' | 'deleted';
  message_count: number;
  total_tokens: number;
  total_cost: number;
  last_message_at: string;
  metadata: Record<string, any>;
  tags: string[];
  is_favorite: boolean;
  is_shared: boolean;
  share_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessageV2 {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  model?: string;
  provider?: string;
  temperature?: number;
  max_tokens?: number;
  response_time?: number;
  cost: number;
  metadata: Record<string, any>;
  parent_message_id?: string;
  is_edited: boolean;
  edit_history: any[];
  created_at: string;
  updated_at: string;
}

export interface AIMemory {
  id: string;
  user_id: string;
  conversation_id?: string;
  memory_type: 'preference' | 'fact' | 'context' | 'personality';
  key: string;
  value: string;
  confidence: number;
  source: string;
  expires_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIUserSettings {
  id: string;
  user_id: string;
  preferred_model: string;
  preferred_provider: string;
  default_temperature: number;
  default_max_tokens: number;
  voice_enabled: boolean;
  voice_auto_play: boolean;
  voice_speed: number;
  voice_volume: number;
  preferred_voice?: string;
  conversation_context_length: number;
  auto_save_conversations: boolean;
  show_token_usage: boolean;
  show_cost: boolean;
  enable_memory: boolean;
  language_preference: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessageFeedback {
  id: string;
  message_id: string;
  user_id: string;
  rating: number;
  feedback_type?: string;
  comment?: string;
  created_at: string;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  category?: string;
  variables: string[];
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AIContext {
  user_preferences: Record<string, string>;
  conversation_history: Array<{
    role: string;
    content: string;
    created_at: string;
  }>;
  relevant_memories: AIMemory[];
  user_settings: AIUserSettings;
}

export interface ConversationStats {
  total_conversations: number;
  active_conversations: number;
  archived_conversations: number;
  total_messages: number;
  total_tokens: number;
  total_cost: number;
  by_type: Record<string, number>;
}

/**
 * Serviço para gerenciar a memória e configurações avançadas da IA
 */
export class AIMemoryService {
  // ===== CONVERSAS =====
  
  static async createConversation(
    title?: string,
    type: 'direitagpt' | 'creative' | 'support' = 'direitagpt'
  ): Promise<AIConversationV2> {
    const response = await apiClient.post('/ai-memory/conversations', {
      title,
      type
    });
    return response.data.data;
  }

  static async getConversations(
    status: 'active' | 'archived' | 'deleted' = 'active',
    limit = 50
  ): Promise<AIConversationV2[]> {
    const response = await apiClient.get('/ai-memory/conversations', {
      params: { status, limit }
    });
    return response.data.data;
  }

  static async getConversation(conversationId: string): Promise<AIConversationV2> {
    const response = await apiClient.get(`/ai-memory/conversations/${conversationId}`);
    return response.data.data;
  }

  static async updateConversation(
    conversationId: string,
    updates: Partial<Pick<AIConversationV2, 'title' | 'is_favorite' | 'tags' | 'metadata'>>
  ): Promise<AIConversationV2> {
    const response = await apiClient.put(`/ai-memory/conversations/${conversationId}`, updates);
    return response.data.data;
  }

  static async archiveConversation(conversationId: string): Promise<AIConversationV2> {
    const response = await apiClient.post(`/ai-memory/conversations/${conversationId}/archive`);
    return response.data.data;
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/ai-memory/conversations/${conversationId}`);
  }

  // ===== MENSAGENS =====

  static async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<AIMessageV2> {
    const response = await apiClient.post(`/ai-memory/conversations/${conversationId}/messages`, {
      role,
      content,
      metadata
    });
    return response.data.data;
  }

  static async getMessages(
    conversationId: string,
    limit = 50
  ): Promise<AIMessageV2[]> {
    const response = await apiClient.get(`/ai-memory/conversations/${conversationId}/messages`, {
      params: { limit }
    });
    return response.data.data;
  }

  static async getConversationContext(
    conversationId: string,
    length = 10
  ): Promise<Array<{ role: string; content: string; created_at: string }>> {
    const response = await apiClient.get(`/ai-memory/conversations/${conversationId}/context`, {
      params: { length }
    });
    return response.data.data;
  }

  // ===== MEMÓRIA =====

  static async saveMemory(
    memoryType: 'preference' | 'fact' | 'context' | 'personality',
    key: string,
    value: string,
    options?: {
      confidence?: number;
      source?: string;
      conversationId?: string;
      expiresAt?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AIMemory> {
    const response = await apiClient.post('/ai-memory/memory', {
      memory_type: memoryType,
      key,
      value,
      ...options
    });
    return response.data.data;
  }

  static async getMemory(
    memoryType?: 'preference' | 'fact' | 'context' | 'personality',
    key?: string
  ): Promise<AIMemory[]> {
    const response = await apiClient.get('/ai-memory/memory', {
      params: { memory_type: memoryType, key }
    });
    return response.data.data;
  }

  static async getUserPreferences(): Promise<Record<string, string>> {
    const response = await apiClient.get('/ai-memory/preferences');
    return response.data.data;
  }

  static async saveUserPreference(
    key: string,
    value: string,
    conversationId?: string
  ): Promise<AIMemory> {
    const response = await apiClient.post('/ai-memory/preferences', {
      key,
      value,
      conversation_id: conversationId
    });
    return response.data.data;
  }

  static async deleteMemory(
    memoryType: 'preference' | 'fact' | 'context' | 'personality',
    key: string
  ): Promise<void> {
    await apiClient.delete('/ai-memory/memory', {
      data: { memory_type: memoryType, key }
    });
  }

  // ===== CONFIGURAÇÕES =====

  static async getUserSettings(): Promise<AIUserSettings> {
    const response = await apiClient.get('/ai-memory/settings');
    return response.data.data;
  }

  static async updateUserSettings(
    settings: Partial<Omit<AIUserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<AIUserSettings> {
    const response = await apiClient.put('/ai-memory/settings', settings);
    return response.data.data;
  }

  // ===== FEEDBACK =====

  static async addMessageFeedback(
    messageId: string,
    rating: number,
    feedbackType?: string,
    comment?: string
  ): Promise<AIMessageFeedback> {
    const response = await apiClient.post(`/ai-memory/messages/${messageId}/feedback`, {
      rating,
      feedback_type: feedbackType,
      comment
    });
    return response.data.data;
  }

  // ===== TEMPLATES =====

  static async getPromptTemplates(
    category?: string,
    isActive = true
  ): Promise<AIPromptTemplate[]> {
    const response = await apiClient.get('/ai-memory/templates', {
      params: { category, is_active: isActive }
    });
    return response.data.data;
  }

  // ===== ESTATÍSTICAS =====

  static async getConversationStats(): Promise<ConversationStats> {
    const response = await apiClient.get('/ai-memory/stats');
    return response.data.data;
  }

  // ===== CONTEXTO DA IA =====

  static async buildAIContext(
    conversationId?: string,
    includeMemory = true
  ): Promise<AIContext> {
    const response = await apiClient.get('/ai-memory/context', {
      params: { conversation_id: conversationId, include_memory: includeMemory }
    });
    return response.data.data;
  }

  // ===== UTILITÁRIOS =====

  /**
   * Salva automaticamente preferências do usuário baseado na conversa
   */
  static async extractAndSavePreferences(
    conversationId: string,
    userMessage: string,
    aiResponse: string
  ): Promise<void> {
    // Lógica simples para extrair preferências
    const preferences = this.extractPreferencesFromText(userMessage + ' ' + aiResponse);
    
    for (const [key, value] of Object.entries(preferences)) {
      try {
        await this.saveUserPreference(key, value, conversationId);
      } catch (error) {
        console.warn(`Erro ao salvar preferência ${key}:`, error);
      }
    }
  }

  /**
   * Extrai preferências de um texto (implementação básica)
   */
  private static extractPreferencesFromText(text: string): Record<string, string> {
    const preferences: Record<string, string> = {};
    const lowerText = text.toLowerCase();

    // Detectar preferências políticas
    if (lowerText.includes('conservador') || lowerText.includes('direita')) {
      preferences['orientacao_politica'] = 'conservador';
    }
    if (lowerText.includes('liberal') || lowerText.includes('libertário')) {
      preferences['orientacao_economica'] = 'liberal';
    }

    // Detectar temas de interesse
    if (lowerText.includes('economia') || lowerText.includes('mercado')) {
      preferences['interesse_economia'] = 'alto';
    }
    if (lowerText.includes('família') || lowerText.includes('tradicional')) {
      preferences['valores_familiares'] = 'tradicional';
    }
    if (lowerText.includes('religião') || lowerText.includes('fé')) {
      preferences['interesse_religiao'] = 'alto';
    }

    // Detectar preferências de comunicação
    if (lowerText.includes('formal') || lowerText.includes('respeitoso')) {
      preferences['estilo_comunicacao'] = 'formal';
    }
    if (lowerText.includes('casual') || lowerText.includes('descontraído')) {
      preferences['estilo_comunicacao'] = 'casual';
    }

    return preferences;
  }

  /**
   * Constrói um prompt personalizado baseado no contexto do usuário
   */
  static async buildPersonalizedPrompt(
    basePrompt: string,
    conversationId?: string
  ): Promise<string> {
    try {
      const context = await this.buildAIContext(conversationId, true);
      
      let personalizedPrompt = basePrompt;

      // Adicionar preferências do usuário
      if (Object.keys(context.user_preferences).length > 0) {
        personalizedPrompt += '\n\nPreferências do usuário:';
        for (const [key, value] of Object.entries(context.user_preferences)) {
          personalizedPrompt += `\n- ${key}: ${value}`;
        }
      }

      // Adicionar memórias relevantes
      if (context.relevant_memories.length > 0) {
        personalizedPrompt += '\n\nInformações relevantes sobre o usuário:';
        context.relevant_memories.forEach(memory => {
          personalizedPrompt += `\n- ${memory.key}: ${memory.value}`;
        });
      }

      // Adicionar configurações de voz se habilitadas
      if (context.user_settings.voice_enabled) {
        personalizedPrompt += '\n\nNota: O usuário tem a funcionalidade de voz habilitada, então mantenha as respostas claras e adequadas para síntese de voz.';
      }

      return personalizedPrompt;
    } catch (error) {
      console.warn('Erro ao construir prompt personalizado:', error);
      return basePrompt;
    }
  }
}

export default AIMemoryService;