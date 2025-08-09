import React, { useState, useEffect } from 'react'
import { AdminService } from '../../../services/admin'
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  MessageSquare, 
  Shield, 
  Activity,
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react'

const Overview = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    todayCheckins: 0,
    activeEvents: 0,
    monthlyRevenue: 0,
    aiConversations: 0,
    moderatedContent: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        const data = await AdminService.getOverview();
        setStats({
          activeUsers: data.users?.active || 0,
          todayCheckins: data.checkins?.today || 0,
          activeEvents: data.events?.active || 0,
          monthlyRevenue: data.revenue?.monthly || 0,
          aiConversations: data.aiConversations?.today || 0,
          moderatedContent: data.moderation?.pending || 0
        });
      } catch (err) {
        console.error('Erro ao carregar dados do overview:', err);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const statsCards = [
    {
      name: 'Usuários Ativos',
      value: stats.activeUsers.toLocaleString(),
      change: '+12%',
      changeType: 'increase',
      icon: Users,
      color: 'blue'
    },
    {
      name: 'Check-ins Hoje',
      value: stats.todayCheckins.toLocaleString(),
      change: '+8%',
      changeType: 'increase',
      icon: MapPin,
      color: 'green'
    },
    {
      name: 'Eventos Ativos',
      value: stats.activeEvents.toLocaleString(),
      change: '+3',
      changeType: 'increase',
      icon: Calendar,
      color: 'purple'
    },
    {
      name: 'Receita Mensal',
      value: `R$ ${stats.monthlyRevenue.toLocaleString()}`,
      change: '+15%',
      changeType: 'increase',
      icon: DollarSign,
      color: 'yellow'
    },
    {
      name: 'Conversas IA',
      value: stats.aiConversations.toLocaleString(),
      change: '+22%',
      changeType: 'increase',
      icon: MessageSquare,
      color: 'indigo'
    },
    {
      name: 'Conteúdo Moderado',
      value: stats.moderatedContent.toLocaleString(),
      change: '-5%',
      changeType: 'decrease',
      icon: Shield,
      color: 'red'
    }
  ]

  const recentEvents = [
    {
      id: 1,
      name: 'Marcha da Família',
      location: 'São Paulo, SP',
      checkins: 1247,
      status: 'active',
      date: '2024-01-15'
    },
    {
      id: 2,
      name: 'Encontro Conservador',
      location: 'Rio de Janeiro, RJ',
      checkins: 856,
      status: 'active',
      date: '2024-01-15'
    },
    {
      id: 3,
      name: 'Palestra Valores',
      location: 'Brasília, DF',
      checkins: 432,
      status: 'ended',
      date: '2024-01-14'
    }
  ]

  const topCities = [
    { city: 'São Paulo', state: 'SP', users: 3247, growth: '+15%' },
    { city: 'Rio de Janeiro', state: 'RJ', users: 2156, growth: '+12%' },
    { city: 'Brasília', state: 'DF', users: 1834, growth: '+18%' },
    { city: 'Belo Horizonte', state: 'MG', users: 1456, growth: '+8%' },
    { city: 'Porto Alegre', state: 'RS', users: 1234, growth: '+22%' }
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'user_join',
      message: 'João Silva se registrou na plataforma',
      time: '2 min atrás',
      icon: Users
    },
    {
      id: 2,
      type: 'event_checkin',
      message: 'Maria Santos fez check-in no evento "Marcha da Família"',
      time: '5 min atrás',
      icon: MapPin
    },
    {
      id: 3,
      type: 'ai_conversation',
      message: 'Pedro Costa iniciou conversa com DireitaGPT',
      time: '8 min atrás',
      icon: MessageSquare
    },
    {
      id: 4,
      type: 'content_moderated',
      message: 'Conteúdo reportado foi aprovado após moderação',
      time: '12 min atrás',
      icon: Shield
    }
  ]

  const getStatColor = (color) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      yellow: 'bg-yellow-500',
      indigo: 'bg-indigo-500',
      red: 'bg-red-500'
    }
    return colors[color] || colors.blue
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h2>
          <p className="text-gray-600">Visão geral da plataforma Direitai.com</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Activity className="h-4 w-4 mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    {stat.changeType === 'increase' ? (
                      <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                  </div>
                </div>
                <div className={`w-12 h-12 ${getStatColor(stat.color)} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Eventos Recentes</h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Ver todos
            </button>
          </div>
          <div className="space-y-4">
            {recentEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{event.name}</h4>
                  <p className="text-sm text-gray-600">{event.location}</p>
                  <p className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{event.checkins} check-ins</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    event.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status === 'active' ? 'Ativo' : 'Finalizado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cidades com Mais Usuários</h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Ver ranking
            </button>
          </div>
          <div className="space-y-3">
            {topCities.map((city, index) => (
              <div key={`${city.city}-${city.state}`} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{city.city}</p>
                    <p className="text-sm text-gray-600">{city.state}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{city.users.toLocaleString()}</p>
                  <p className="text-sm text-green-600">{city.growth}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes</h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map(activity => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <button className="w-full btn-primary">
              <Calendar className="h-4 w-4 mr-2" />
              Criar Evento
            </button>
            <button className="w-full btn-secondary">
              <Users className="h-4 w-4 mr-2" />
              Gerenciar Usuários
            </button>
            <button className="w-full btn-secondary">
              <Shield className="h-4 w-4 mr-2" />
              Moderar Conteúdo
            </button>
            <button className="w-full btn-secondary">
              <Activity className="h-4 w-4 mr-2" />
              Ver Relatórios
            </button>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="card bg-green-50 border-green-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Activity className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-green-900">Sistema Operacional</h3>
            <p className="text-sm text-green-800">
              Todos os serviços estão funcionando normalmente. Última verificação: agora
            </p>
          </div>
          <div className="flex items-center space-x-4 text-sm text-green-800">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>API: 99.9%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>DB: 100%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>CDN: 99.8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview