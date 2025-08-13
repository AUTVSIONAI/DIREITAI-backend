import React, { useState, useEffect } from 'react'
import { Trophy, Medal, Crown, MapPin, TrendingUp, Users, Filter } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { apiClient } from '../../../lib/api'

const Ranking = () => {
  const { userProfile } = useAuth()
  const [selectedScope, setSelectedScope] = useState('city')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [rankings, setRankings] = useState([])
  const [userPosition, setUserPosition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Mock ranking data
  const mockRankings = {
    city: {
      week: [
        { id: 1, username: 'PatriotaSP', points: 850, checkins: 12, city: 'São Paulo', avatar: null },
        { id: 2, username: 'DefensorBR', points: 720, checkins: 10, city: 'São Paulo', avatar: null },
        { id: 3, username: 'ConservadorSP', points: 680, checkins: 9, city: 'São Paulo', avatar: null },
        { id: 4, username: 'LiberdadeSP', points: 620, checkins: 8, city: 'São Paulo', avatar: null },
        { id: 5, username: 'TradicionalSP', points: 580, checkins: 7, city: 'São Paulo', avatar: null },
        { id: 6, username: userProfile?.username || 'Você', points: userProfile?.points || 450, checkins: 6, city: 'São Paulo', avatar: null, isCurrentUser: true },
      ],
      month: [
        { id: 1, username: 'PatriotaSP', points: 2850, checkins: 42, city: 'São Paulo', avatar: null },
        { id: 2, username: 'DefensorBR', points: 2420, checkins: 38, city: 'São Paulo', avatar: null },
        { id: 3, username: 'ConservadorSP', points: 2180, checkins: 35, city: 'São Paulo', avatar: null },
        { id: 4, username: 'LiberdadeSP', points: 1920, checkins: 32, city: 'São Paulo', avatar: null },
        { id: 5, username: 'TradicionalSP', points: 1780, checkins: 29, city: 'São Paulo', avatar: null },
        { id: 6, username: userProfile?.username || 'Você', points: userProfile?.points || 1450, checkins: 26, city: 'São Paulo', avatar: null, isCurrentUser: true },
      ]
    },
    state: {
      week: [
        { id: 1, username: 'PatriotaSP', points: 850, checkins: 12, city: 'São Paulo', avatar: null },
        { id: 2, username: 'DefensorRJ', points: 780, checkins: 11, city: 'Rio de Janeiro', avatar: null },
        { id: 3, username: 'ConservadorBH', points: 720, checkins: 10, city: 'Belo Horizonte', avatar: null },
        { id: 4, username: 'LiberdadeSP', points: 680, checkins: 9, city: 'São Paulo', avatar: null },
        { id: 5, username: 'TradicionalSP', points: 620, checkins: 8, city: 'São Paulo', avatar: null },
        { id: 23, username: userProfile?.username || 'Você', points: userProfile?.points || 450, checkins: 6, city: 'São Paulo', avatar: null, isCurrentUser: true },
      ],
      month: [
        { id: 1, username: 'PatriotaSP', points: 3850, checkins: 52, city: 'São Paulo', avatar: null },
        { id: 2, username: 'DefensorRJ', points: 3420, checkins: 48, city: 'Rio de Janeiro', avatar: null },
        { id: 3, username: 'ConservadorBH', points: 3180, checkins: 45, city: 'Belo Horizonte', avatar: null },
        { id: 4, username: 'LiberdadeSP', points: 2920, checkins: 42, city: 'São Paulo', avatar: null },
        { id: 5, username: 'TradicionalSP', points: 2780, checkins: 39, city: 'São Paulo', avatar: null },
        { id: 23, username: userProfile?.username || 'Você', points: userProfile?.points || 1450, checkins: 26, city: 'São Paulo', avatar: null, isCurrentUser: true },
      ]
    },
    country: {
      week: [
        { id: 1, username: 'PatriotaSP', points: 850, checkins: 12, city: 'São Paulo', avatar: null },
        { id: 2, username: 'DefensorRJ', points: 820, checkins: 11, city: 'Rio de Janeiro', avatar: null },
        { id: 3, username: 'ConservadorRS', points: 780, checkins: 11, city: 'Porto Alegre', avatar: null },
        { id: 4, username: 'LiberdadeDF', points: 750, checkins: 10, city: 'Brasília', avatar: null },
        { id: 5, username: 'TradicionalMG', points: 720, checkins: 10, city: 'Belo Horizonte', avatar: null },
        { id: 156, username: userProfile?.username || 'Você', points: userProfile?.points || 450, checkins: 6, city: 'São Paulo', avatar: null, isCurrentUser: true },
      ],
      month: [
        { id: 1, username: 'PatriotaSP', points: 4850, checkins: 62, city: 'São Paulo', avatar: null },
        { id: 2, username: 'DefensorRJ', points: 4420, checkins: 58, city: 'Rio de Janeiro', avatar: null },
        { id: 3, username: 'ConservadorRS', points: 4180, checkins: 55, city: 'Porto Alegre', avatar: null },
        { id: 4, username: 'LiberdadeDF', points: 3920, checkins: 52, city: 'Brasília', avatar: null },
        { id: 5, username: 'TradicionalMG', points: 3780, checkins: 49, city: 'Belo Horizonte', avatar: null },
        { id: 156, username: userProfile?.username || 'Você', points: userProfile?.points || 1450, checkins: 26, city: 'São Paulo', avatar: null, isCurrentUser: true },
      ]
    }
  }

  useEffect(() => {
    fetchRankings()
  }, [selectedScope, selectedPeriod])

  const fetchRankings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Por enquanto, usar dados mock até a API estar pronta
      // TODO: Implementar API real de ranking
      const currentRankings = mockRankings[selectedScope][selectedPeriod]
      setRankings(currentRankings.filter(user => !user.isCurrentUser))
      setUserPosition(currentRankings.find(user => user.isCurrentUser))
      
      // Código para API real (comentado por enquanto):
      /*
      const response = await apiClient.get(`/users/ranking?scope=${selectedScope}&period=${selectedPeriod}`)
      if (response.data) {
        setRankings(response.data.rankings || [])
        setUserPosition(response.data.userPosition || null)
      }
      */
    } catch (err) {
      console.error('Error fetching rankings:', err)
      setError('Erro ao carregar ranking')
      // Fallback para dados mock em caso de erro
      const currentRankings = mockRankings[selectedScope][selectedPeriod]
      setRankings(currentRankings.filter(user => !user.isCurrentUser))
      setUserPosition(currentRankings.find(user => user.isCurrentUser))
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (position) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-gray-600">#{position}</span>
    }
  }

  const getRankBadge = (position) => {
    switch (position) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getScopeLabel = (scope) => {
    switch (scope) {
      case 'city': return 'Cidade'
      case 'state': return 'Estado'
      case 'country': return 'País'
      default: return scope
    }
  }

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'Semana'
      case 'month': return 'Mês'
      default: return period
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchRankings}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ranking de Patriotas</h2>
          <p className="text-gray-600">Veja sua posição entre os conservadores mais ativos</p>
        </div>
        <Trophy className="h-8 w-8 text-yellow-500" />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-700">Filtros:</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Escopo</label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="city">Minha Cidade</option>
              <option value="state">Meu Estado</option>
              <option value="country">Todo o País</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Position */}
      {userPosition && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-full">
                <span className="text-white font-bold">
                  {userPosition.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Sua Posição</h3>
                <p className="text-sm text-gray-600">
                  {getScopeLabel(selectedScope)} • {getPeriodLabel(selectedPeriod)}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                getRankBadge(userPosition.id)
              }`}>
                #{userPosition.id}
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>{userPosition.points} pontos</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{userPosition.checkins} check-ins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Rankings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Patriotas - {getScopeLabel(selectedScope)} ({getPeriodLabel(selectedPeriod)})
        </h3>
        
        <div className="space-y-3">
          {rankings.slice(0, 5).map((user, index) => {
            const position = index + 1
            return (
              <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                position <= 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10">
                    {getRankIcon(position)}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{user.username}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{user.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">
                    {user.points.toLocaleString()} pts
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.checkins} check-ins
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900">Participantes Ativos</h4>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {selectedScope === 'city' ? '1,234' : selectedScope === 'state' ? '12,456' : '156,789'}
          </p>
          <p className="text-sm text-gray-500 mt-1">nesta {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
        </div>
        
        <div className="card text-center">
          <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
            <MapPin className="h-6 w-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900">Check-ins Totais</h4>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {selectedScope === 'city' ? '2,567' : selectedScope === 'state' ? '25,678' : '312,456'}
          </p>
          <p className="text-sm text-gray-500 mt-1">nesta {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
        </div>
        
        <div className="card text-center">
          <div className="p-3 bg-yellow-100 rounded-lg w-fit mx-auto mb-3">
            <TrendingUp className="h-6 w-6 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-900">Crescimento</h4>
          <p className="text-2xl font-bold text-yellow-600 mt-1">+23%</p>
          <p className="text-sm text-gray-500 mt-1">vs. {getPeriodLabel(selectedPeriod).toLowerCase()} anterior</p>
        </div>
      </div>

      {/* Motivation */}
      <div className="bg-gradient-to-r from-primary-600 to-conservative-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-2">Continue Subindo no Ranking!</h3>
        <p className="text-primary-100 mb-4">
          Participe de mais eventos, converse com o DireitaIA e engaje-se com a comunidade para ganhar pontos e subir no ranking.
        </p>
        <div className="flex space-x-4">
          <button className="bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
            Fazer Check-in
          </button>
          <button className="border border-white text-white px-4 py-2 rounded-lg font-medium hover:bg-white hover:text-primary-600">
            Conversar com IA
          </button>
        </div>
      </div>
    </div>
  )
}

export default Ranking