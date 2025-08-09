import { supabase } from '../lib/supabase'

class AIService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'https://direitai-backend.vercel.app/api'
  }

  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado')
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  }

  async sendMessage(message, conversationId = null) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${this.baseURL}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          conversation_id: conversationId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        response: data.response,
        model: data.model,
        provider: data.provider,
        tokensUsed: data.tokensUsed,
        dailyUsage: data.dailyUsage,
        planLimit: data.planLimit
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getConversations(limit = 20) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${this.baseURL}/ai/conversations?limit=${limit}`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const data = await response.json()
      return data.conversations || []
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      return []
    }
  }

  async generateContent(type, prompt, tone = 'formal', length = 'medium') {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${this.baseURL}/ai/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          prompt,
          tone,
          length
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        content: data.content,
        model: data.model,
        provider: data.provider,
        tokensUsed: data.tokensUsed
      }
    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getUserUsage() {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${this.baseURL}/ai/usage`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        dailyUsage: data.dailyUsage,
        planLimit: data.planLimit,
        plan: data.plan
      }
    } catch (error) {
      console.error('Erro ao carregar uso:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export const aiService = new AIService()
export default aiService