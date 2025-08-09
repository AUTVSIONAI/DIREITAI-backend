import React, { useState, useEffect } from 'react'
import { MapPin, Clock, Users, Award, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'

const CheckIn = () => {
  const { user } = useAuth()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [secretCode, setSecretCode] = useState('')
  const [checkInStatus, setCheckInStatus] = useState(null)
  const [nearbyEvents, setNearbyEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  useEffect(() => {
    getCurrentLocation()
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true)
      const response = await fetch('/api/events?status=ativo&limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const formattedEvents = data.events.map(event => ({
          id: event.id,
          title: event.title,
          location: event.location,
          date: event.date,
          time: event.time,
          participants: event.current_participants || 0,
          points: 100, // Pontos padrão por check-in
          status: event.status === 'ativo' ? 'active' : event.status,
          secret_code: event.secret_code
        }))
        setNearbyEvents(formattedEvents)
      } else {
        console.error('Erro ao buscar eventos:', response.statusText)
      }
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Geolocalização não disponível:', error.message)
          // Define uma localização padrão (São Paulo) se não conseguir obter a localização
          setLocation({
            lat: -23.5505,
            lng: -46.6333
          })
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    } else {
      console.warn('Geolocalização não suportada pelo navegador')
      // Define uma localização padrão (São Paulo)
      setLocation({
        lat: -23.5505,
        lng: -46.6333
      })
    }
  }

  const handleCheckIn = async (eventId) => {
    if (!secretCode.trim()) {
      alert('Por favor, insira o código secreto do evento')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: eventId,
          secret_code: secretCode,
          location: location
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setCheckInStatus({
          success: true,
          message: 'Check-in realizado com sucesso!',
          points: data.points || 100
        })
        setSecretCode('')
        // Atualizar a lista de eventos para refletir o check-in
        fetchEvents()
      } else {
        setCheckInStatus({
          success: false,
          message: data.error || 'Código secreto inválido. Verifique com os organizadores.'
        })
      }
    } catch (error) {
      console.error('Erro ao realizar check-in:', error)
      setCheckInStatus({
        success: false,
        message: 'Erro ao realizar check-in. Tente novamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  const getEventStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Ativo Agora'
      case 'upcoming':
        return 'Em Breve'
      case 'ended':
        return 'Finalizado'
      default:
        return 'Desconhecido'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check-in em Eventos</h2>
          <p className="text-gray-600">Registre sua presença e ganhe pontos</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <MapPin className="h-4 w-4" />
          <span>{location ? 'Localização detectada' : 'Detectando localização...'}</span>
        </div>
      </div>

      {/* Check-in Status */}
      {checkInStatus && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          checkInStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {checkInStatus.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <div>
            <p className={`font-medium ${
              checkInStatus.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {checkInStatus.message}
            </p>
            {checkInStatus.success && checkInStatus.points && (
              <p className="text-sm text-green-600">
                Você ganhou {checkInStatus.points} pontos!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Check-in */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-in Rápido</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código Secreto do Evento
            </label>
            <input
              type="text"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
              placeholder="Digite o código fornecido no evento"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              O código é fornecido pelos organizadores no local do evento
            </p>
          </div>
          
          <button
            onClick={() => {
              if (nearbyEvents.length > 0) {
                handleCheckIn(nearbyEvents[0].id)
              } else {
                alert('Nenhum evento disponível para check-in')
              }
            }}
            disabled={loading || !secretCode.trim() || nearbyEvents.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Fazer Check-in'}
          </button>
        </div>
      </div>

      {/* Nearby Events */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Eventos Próximos</h3>
        <div className="space-y-4">
          {loadingEvents ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando eventos...</p>
            </div>
          ) : nearbyEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum evento ativo encontrado no momento.</p>
            </div>
          ) : (
            nearbyEvents.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getEventStatusBadge(event.status)
                    }`}>
                      {getEventStatusText(event.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{event.date} às {event.time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{event.participants} participantes</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-primary-600 mb-2">
                    <Award className="h-4 w-4" />
                    <span className="font-medium">{event.points} pts</span>
                  </div>
                  
                  {event.status === 'active' && (
                    <button className="btn-primary text-sm px-3 py-1">
                      Check-in
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Como fazer check-in:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Vá até o local do evento</li>
          <li>Procure pelos organizadores ou voluntários</li>
          <li>Solicite o código secreto do evento</li>
          <li>Digite o código no campo acima e clique em "Fazer Check-in"</li>
          <li>Ganhe pontos e suba no ranking!</li>
        </ol>
      </div>

      {/* Demo Code */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">🎯 Código de Demonstração:</h4>
        <p className="text-sm text-yellow-800">
          Use o código <strong>LIBERDADE2024</strong> para testar o sistema de check-in.
        </p>
      </div>
    </div>
  )
}

export default CheckIn