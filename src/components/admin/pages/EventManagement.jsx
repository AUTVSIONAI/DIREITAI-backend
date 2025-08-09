import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  Calendar, 
  Users, 
  Clock,
  Key,
  Download,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { EventsService } from '../../../services/events'

const EventManagement = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCity, setSelectedCity] = useState('all')
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showActions, setShowActions] = useState(null)
  
  // Estados para o formulário de criação de evento
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    city: '',
    state: '',
    address: '',
    startDate: '',
    endDate: '',
    secretCode: '',
    maxCapacity: ''
  })
  const [isCreating, setIsCreating] = useState(false)

  // Função para carregar eventos
  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const filters = {}
      if (selectedStatus !== 'all') filters.status = selectedStatus
      if (selectedCity !== 'all') filters.location = selectedCity
      
      const response = await EventsService.getEvents(filters)
      setEvents(response.events || [])
    } catch (err) {
      console.error('Erro ao carregar eventos:', err)
      setError('Erro ao carregar eventos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Carregar eventos ao montar o componente
  useEffect(() => {
    loadEvents()
  }, [])

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEvents()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [selectedStatus, selectedCity])

  // Use real events data from API instead of mock data
  const displayEvents = events.length > 0 ? events : []

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Ativo' },
      completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Concluído' },
      draft: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Rascunho' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelado' }
    }
    return badges[status] || badges.draft
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
                         event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.city?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || event.status === selectedStatus
    const matchesCity = selectedCity === 'all' || event.location?.city === selectedCity
    
    return matchesSearch && matchesStatus && matchesCity
  })

  const cities = [...new Set(events.map(event => event.location?.city).filter(Boolean))]

  const handleViewEvent = (event) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleEditEvent = (event) => {
    // Implementar edição de evento
    console.log('Editar evento:', event)
  }

  const handleDeleteEvent = (event) => {
    // Implementar exclusão de evento
    console.log('Excluir evento:', event)
  }

  // Função para gerar código secreto aleatório
  const generateSecretCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Função para resetar o formulário
  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      city: '',
      state: '',
      address: '',
      startDate: '',
      endDate: '',
      secretCode: '',
      maxCapacity: ''
    })
  }

  // Função para criar novo evento
  const handleCreateEvent = async (e) => {
    e.preventDefault()
    
    // Validação básica
    if (!newEvent.title || !newEvent.city || !newEvent.startDate || !newEvent.endDate) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (new Date(newEvent.startDate) >= new Date(newEvent.endDate)) {
      alert('A data de término deve ser posterior à data de início')
      return
    }

    try {
      setIsCreating(true)
      
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        event_type: 'presencial',
        category: 'politica',
        start_date: newEvent.startDate,
        end_date: newEvent.endDate,
        location: newEvent.address,
        address: newEvent.address,
        city: newEvent.city,
        state: newEvent.state,
        country: 'Brasil',
        max_participants: parseInt(newEvent.maxCapacity) || 100,
        price: 0,
        is_free: true,
        requires_approval: false,
        tags: [],
        secret_code: newEvent.secretCode || generateSecretCode()
      }

      console.log('🚀 Enviando dados do evento:', eventData);
      
      // Chamar o serviço para criar o evento
      const newEventResponse = await EventsService.createEvent(eventData)
      
      console.log('✅ Resposta do servidor:', newEventResponse);
      
      if (newEventResponse) {
        // Recarregar a lista de eventos
        await loadEvents()
        
        // Fechar modal e resetar formulário
        setShowCreateModal(false)
        resetForm()
        
        alert('Evento criado com sucesso!')
      } else {
        throw new Error('Erro ao criar evento')
       }
    } catch (err) {
      console.error('❌ Erro ao criar evento:', err)
      console.error('❌ Detalhes do erro:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack
      })
      alert(`Erro ao criar evento: ${err.response?.data?.error || err.message || 'Erro desconhecido'}`)
    } finally {
      setIsCreating(false)
    }
  }

  // Função para atualizar campos do formulário
  const handleInputChange = (field, value) => {
    setNewEvent(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    // Mostrar toast de sucesso
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Eventos</h2>
          <p className="text-gray-600">Gerencie todos os eventos e manifestações</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Eventos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.reduce((sum, e) => sum + e.checkins, 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cidades Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{cities.length}</p>
            </div>
            <MapPin className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="completed">Concluído</option>
              <option value="draft">Rascunho</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Todas as Cidades</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Localização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-gray-500">Carregando eventos...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button
                      onClick={loadEvents}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Tentar Novamente
                    </button>
                  </td>
                </tr>
              )}
              {!loading && !error && filteredEvents.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Nenhum evento encontrado
                  </td>
                </tr>
              )}
              {!loading && !error && filteredEvents.length > 0 && filteredEvents.map((event) => {
                const statusBadge = getStatusBadge(event.status)
                const StatusIcon = statusBadge.icon
                const participationRate = (event.checkins / event.maxCapacity) * 100

                return (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">{event.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {event.location.city}, {event.location.state}
                      </div>
                      <div className="text-sm text-gray-500">{event.location.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(event.date)}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        até {formatDate(event.endDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {event.checkins} / {event.maxCapacity}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(participationRate, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {participationRate.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {event.secretCode}
                        </code>
                        <button
                          onClick={() => handleCopyCode(event.secretCode)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === event.id ? null : event.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {showActions === event.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => handleViewEvent(event)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="h-4 w-4 mr-3" />
                                Ver Detalhes
                              </button>
                              <button
                                onClick={() => handleEditEvent(event)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes do Evento</h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{selectedEvent.title}</h4>
                <p className="text-gray-600 mt-2">{selectedEvent.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Localização</label>
                  <p className="text-sm text-gray-900">
                    {selectedEvent.location.address}<br/>
                    {selectedEvent.location.city}, {selectedEvent.location.state}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data e Hora</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedEvent.date)} até {formatDate(selectedEvent.endDate)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código Secreto</label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {selectedEvent.secretCode}
                    </code>
                    <button
                      onClick={() => handleCopyCode(selectedEvent.secretCode)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Participação</label>
                  <p className="text-sm text-gray-900">
                    {selectedEvent.checkins} de {selectedEvent.maxCapacity} pessoas
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEventModal(false)}
                className="btn-secondary"
              >
                Fechar
              </button>
              <button className="btn-primary">
                Editar Evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Criar Novo Evento</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Título do Evento</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Digite o título do evento"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  rows={3}
                  value={newEvent.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Descreva o evento"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cidade</label>
                  <input
                    type="text"
                    value={newEvent.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Cidade"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <input
                    type="text"
                    value={newEvent.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Estado"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Endereço</label>
                <input
                  type="text"
                  value={newEvent.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Endereço completo"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Início</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Término</label>
                  <input
                    type="datetime-local"
                    value={newEvent.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código Secreto</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newEvent.secretCode}
                      onChange={(e) => handleInputChange('secretCode', e.target.value.toUpperCase())}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Código para check-in"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('secretCode', generateSecretCode())}
                      className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
                    >
                      Gerar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacidade Máxima</label>
                  <input
                    type="number"
                    value={newEvent.maxCapacity}
                    onChange={(e) => handleInputChange('maxCapacity', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Número máximo de participantes"
                    min="1"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Evento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventManagement