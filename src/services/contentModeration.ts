import { apiClient } from '../lib/api'

export interface ModerationContent {
  id: number
  type: 'ai_generated' | 'user_generated'
  contentType: 'text' | 'image' | 'video' | 'video_script'
  title: string
  content: string
  author: string
  authorPlan: string
  createdAt: string
  reportCount?: number
  priority?: 'low' | 'medium' | 'high'
  category: string
  aiTemplate?: string
  status: 'pending' | 'approved' | 'rejected'
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}

export interface ModerationStats {
  pending: number
  approved: number
  rejected: number
  totalReports: number
  avgResponseTime: number
  todayModerated: number
}

export interface ModerationFilters {
  status?: 'pending' | 'approved' | 'rejected'
  type?: 'ai_generated' | 'user_generated'
  contentType?: 'text' | 'image' | 'video' | 'video_script'
  category?: string
  priority?: 'low' | 'medium' | 'high'
  author?: string
  dateFrom?: string
  dateTo?: string
}

class ContentModerationService {
  static async getPendingContent(filters?: ModerationFilters): Promise<{
    success: boolean
    data?: { content: ModerationContent[], total: number }
    error?: string
  }> {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString())
        })
      }
      
      const response = await apiClient.get(`/admin/content-moderation/pending?${params}`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Error fetching pending content:', error)
      return {
        success: false,
        error: 'Erro ao buscar conteúdo pendente'
      }
    }
  }

  static async getApprovedContent(filters?: ModerationFilters): Promise<{
    success: boolean
    data?: { content: ModerationContent[], total: number }
    error?: string
  }> {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString())
        })
      }
      
      const response = await apiClient.get(`/admin/content-moderation/approved?${params}`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Error fetching approved content:', error)
      return {
        success: false,
        error: 'Erro ao buscar conteúdo aprovado'
      }
    }
  }

  static async getRejectedContent(filters?: ModerationFilters): Promise<{
    success: boolean
    data?: { content: ModerationContent[], total: number }
    error?: string
  }> {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString())
        })
      }
      
      const response = await apiClient.get(`/admin/content-moderation/rejected?${params}`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Error fetching rejected content:', error)
      return {
        success: false,
        error: 'Erro ao buscar conteúdo rejeitado'
      }
    }
  }

  static async getModerationStats(): Promise<{
    success: boolean
    data?: ModerationStats
    error?: string
  }> {
    try {
      const response = await apiClient.get('/admin/content-moderation/stats')
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Error fetching moderation stats:', error)
      return {
        success: false,
        error: 'Erro ao buscar estatísticas de moderação'
      }
    }
  }

  static async approveContent(contentId: number, reason?: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await apiClient.patch(`/admin/content-moderation/${contentId}/approve`, {
        reason
      })
      return { success: true }
    } catch (error) {
      console.error('Error approving content:', error)
      return {
        success: false,
        error: 'Erro ao aprovar conteúdo'
      }
    }
  }

  static async rejectContent(contentId: number, reason: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await apiClient.patch(`/admin/content-moderation/${contentId}/reject`, {
        reason
      })
      return { success: true }
    } catch (error) {
      console.error('Error rejecting content:', error)
      return {
        success: false,
        error: 'Erro ao rejeitar conteúdo'
      }
    }
  }

  static async deleteContent(contentId: number): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await apiClient.delete(`/admin/content-moderation/${contentId}`)
      return { success: true }
    } catch (error) {
      console.error('Error deleting content:', error)
      return {
        success: false,
        error: 'Erro ao deletar conteúdo'
      }
    }
  }

  static async reportContent(contentId: number, reason: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await apiClient.post(`/admin/content-moderation/${contentId}/report`, {
        reason
      })
      return { success: true }
    } catch (error) {
      console.error('Error reporting content:', error)
      return {
        success: false,
        error: 'Erro ao reportar conteúdo'
      }
    }
  }
}

// Create and export singleton instance
export const contentModerationService = new ContentModerationService();

// Export the class as named export
export { ContentModerationService };

export default ContentModerationService