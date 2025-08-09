import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Trash2, 
  Flag, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  Download,
  MoreHorizontal,
  User,
  MessageSquare,
  Image,
  Video,
  FileText,
  TrendingUp,
  Shield,
  AlertCircle
} from 'lucide-react'
import { ContentModerationService } from '../../../services'

const ContentModeration = () => {
  const [selectedTab, setSelectedTab] = useState('pending')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContent, setSelectedContent] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Estados para dados reais
  const [pendingContent, setPendingContent] = useState([])
  const [approvedContent, setApprovedContent] = useState([])
  const [rejectedContent, setRejectedContent] = useState([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carregar dados da API
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [pendingData, approvedData, rejectedData, statsData] = await Promise.all([
        ContentModerationService.getPendingContent(),
        ContentModerationService.getApprovedContent(),
        ContentModerationService.getRejectedContent(),
        ContentModerationService.getModerationStats()
      ])
      
      setPendingContent(Array.isArray(pendingData) ? pendingData : [])
      setApprovedContent(Array.isArray(approvedData) ? approvedData : [])
      setRejectedContent(Array.isArray(rejectedData) ? rejectedData : [])
      setStats(statsData || { pending: 0, approved: 0, rejected: 0, total: 0 })
    } catch (err) {
      console.error('Erro ao carregar dados de moderação:', err)
      setError('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [])

  // Estatísticas de moderação
  const moderationStats = {
    pending: stats.pending || 0,
    approved: stats.approved || 0,
    rejected: stats.rejected || 0,
    totalToday: stats.totalToday || 0,
    avgResponseTime: stats.avgResponseTime || '0 min',
    accuracyRate: stats.accuracyRate || '0%'
  }

  const getContentByTab = () => {
    switch (selectedTab) {
      case 'pending': return Array.isArray(pendingContent) ? pendingContent : []
      case 'approved': return Array.isArray(approvedContent) ? approvedContent : []
      case 'rejected': return Array.isArray(rejectedContent) ? rejectedContent : []
      default: return Array.isArray(pendingContent) ? pendingContent : []
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'text': return <FileText className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      case 'video_script': return <Video className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getPlanBadge = (plan) => {
    const badges = {
      gratuito: { color: 'bg-gray-100 text-gray-800', label: 'Gratuito' },
      engajado: { color: 'bg-blue-100 text-blue-800', label: 'Engajado' },
      premium: { color: 'bg-purple-100 text-purple-800', label: 'Premium' }
    }
    return badges[plan] || badges.gratuito
  }

  const handleApprove = async (contentId) => {
    try {
      await ContentModerationService.approveContent(contentId)
      await loadData() // Recarregar dados após aprovação
    } catch (err) {
      console.error('Erro ao aprovar conteúdo:', err)
      setError('Erro ao aprovar conteúdo. Tente novamente.')
    }
  }

  const handleReject = async (contentId, reason) => {
    try {
      await ContentModerationService.rejectContent(contentId, reason)
      await loadData() // Recarregar dados após rejeição
    } catch (err) {
      console.error('Erro ao rejeitar conteúdo:', err)
      setError('Erro ao rejeitar conteúdo. Tente novamente.')
    }
  }

  const handleDelete = async (contentId) => {
    try {
      await ContentModerationService.deleteContent(contentId)
      await loadData() // Recarregar dados após exclusão
    } catch (err) {
      console.error('Erro ao deletar conteúdo:', err)
      setError('Erro ao deletar conteúdo. Tente novamente.')
    }
  }

  const filteredContent = (getContentByTab() || []).filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.author.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || content.category === selectedFilter
    return matchesSearch && matchesFilter
  })

  // Tratamento de loading e erro
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar dados</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Moderação de Conteúdo</h2>
          <p className="text-gray-600">Gerencie e modere conteúdo gerado por IA e usuários</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={loadData}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Atualizar
          </button>
          <button className="btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </button>
          <button className="btn-primary flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Configurar Filtros
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600">{moderationStats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aprovados</p>
              <p className="text-2xl font-bold text-green-600">{moderationStats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejeitados</p>
              <p className="text-2xl font-bold text-red-600">{moderationStats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Hoje</p>
              <p className="text-2xl font-bold text-gray-900">{moderationStats.totalToday}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
              <p className="text-2xl font-bold text-gray-900">{moderationStats.avgResponseTime}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Precisão</p>
              <p className="text-2xl font-bold text-gray-900">{moderationStats.accuracyRate}</p>
            </div>
            <Shield className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedTab('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === 'pending'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pendentes ({moderationStats.pending})
            </button>
            <button
              onClick={() => setSelectedTab('approved')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === 'approved'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Aprovados ({moderationStats.approved})
            </button>
            <button
              onClick={() => setSelectedTab('rejected')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === 'rejected'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rejeitados ({moderationStats.rejected})
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar conteúdo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="political">Política</option>
                  <option value="economic">Economia</option>
                  <option value="family">Família</option>
                  <option value="educational">Educação</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conteúdo</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="all">Todos os Tipos</option>
                  <option value="ai_generated">Gerado por IA</option>
                  <option value="user_generated">Gerado por Usuário</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="all">Todas as Prioridades</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano do Autor</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="all">Todos os Planos</option>
                  <option value="premium">Premium</option>
                  <option value="engajado">Engajado</option>
                  <option value="gratuito">Gratuito</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="space-y-4">
          {filteredContent.map(content => {
            const planBadge = getPlanBadge(content.authorPlan)
            return (
              <div key={content.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {getContentTypeIcon(content.contentType)}
                        <h3 className="text-lg font-medium text-gray-900">{content.title}</h3>
                      </div>
                      {content.type === 'ai_generated' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          IA
                        </span>
                      )}
                      {content.priority && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(content.priority)}`}>
                          {content.priority === 'high' ? 'Alta' : content.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">{content.content}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{content.author}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${planBadge.color}`}>
                          {planBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(content.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {content.reportCount > 0 && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <Flag className="h-4 w-4" />
                          <span>{content.reportCount} denúncia(s)</span>
                        </div>
                      )}
                      {content.aiTemplate && (
                        <div className="flex items-center space-x-1">
                          <span className="text-blue-600">Template: {content.aiTemplate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedContent(content)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {selectedTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(content.id)}
                          className="p-2 text-green-600 hover:text-green-800"
                          title="Aprovar"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(content.id)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="Rejeitar"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredContent.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum conteúdo encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros ou termo de busca.</p>
          </div>
        )}
      </div>

      {/* Content Details Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes do Conteúdo</h3>
              <button
                onClick={() => setSelectedContent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{selectedContent.title}</h4>
                <div className="flex items-center space-x-2 mt-2">
                  {selectedContent.type === 'ai_generated' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Gerado por IA
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {selectedContent.category}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo</label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{selectedContent.content}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Autor</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedContent.author}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plano</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlanBadge(selectedContent.authorPlan).color}`}>
                    {getPlanBadge(selectedContent.authorPlan).label}
                  </span>
                </div>
              </div>
              
              {selectedContent.aiTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Template de IA</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedContent.aiTemplate}</p>
                </div>
              )}
              
              {selectedContent.reportCount > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Denúncias</label>
                  <p className="text-lg font-semibold text-red-600">{selectedContent.reportCount} denúncia(s)</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedContent(null)}
                className="btn-secondary"
              >
                Fechar
              </button>
              {selectedTab === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleReject(selectedContent.id)
                      setSelectedContent(null)
                    }}
                    className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedContent.id)
                      setSelectedContent(null)
                    }}
                    className="btn-primary"
                  >
                    Aprovar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentModeration