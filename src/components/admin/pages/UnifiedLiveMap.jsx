import React, { useState, useEffect, useRef, useCallback } from 'react'
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  MapPin,
  Users,
  Calendar,
  Activity,
  Filter,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  BarChart3,
  TrendingUp,
  Layers,
  Settings,
  Thermometer,
  Target,
  Zap,
  Globe
} from 'lucide-react'
import LiveMapService from '../../../services/liveMap'
import { apiClient } from '../../../lib/api'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const UnifiedLiveMap = () => {
  // Estados do mapa
  const [viewport, setViewport] = useState({
    latitude: -14.235,
    longitude: -51.9253,
    zoom: 4
  })
  const mapRef = useRef()

  // Estados dos dados
  const [onlineUsers, setOnlineUsers] = useState([])
  const [activeEvents, setActiveEvents] = useState([])
  const [checkins, setCheckins] = useState([])
  const [cityStats, setCityStats] = useState([])
  const [realTimeData, setRealTimeData] = useState({
    onlineUsers: 0,
    activeEvents: 0,
    totalCheckins: 0,
    lastUpdate: new Date()
  })

  // Estados de controle
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedView, setSelectedView] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Estados de filtros
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    startDate: '',
    endDate: ''
  })

  // Estados de visibilidade das camadas
  const [layerVisibility, setLayerVisibility] = useState({
    users: true,
    events: true,
    heatmap: true,
    stats: true,
    clusters: true,
    density: true
  })

  // Estados avançados de heatmap
  const [heatmapConfig, setHeatmapConfig] = useState({
    intensity: 1,
    radius: 20,
    opacity: 0.8,
    blur: 15,
    type: 'users', // 'users', 'events', 'checkins', 'combined'
    colorScheme: 'default' // 'default', 'fire', 'ocean', 'rainbow'
  })

  // Estados de personalização do mapa
  const [mapStyle, setMapStyle] = useState('streets')
  const [showCustomControls, setShowCustomControls] = useState(false)
  const [analysisMode, setAnalysisMode] = useState(false)
  const [densityAnalysis, setDensityAnalysis] = useState(null)

  // Estados de popups
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedCluster, setSelectedCluster] = useState(null)

  // Função para carregar dados
  const loadMapData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Construir parâmetros de filtro
      const filterParams = {
        ...(filters.city && { city: filters.city }),
        ...(filters.state && { state: filters.state }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      }

      // Carregar dados em paralelo
      const [usersResponse, eventsResponse, checkinsResponse, statsResponse, realTimeResponse] = await Promise.all([
        LiveMapService.getOnlineUsers(),
        apiClient.get('/events/map', { params: filterParams }),
        apiClient.get('/checkins/map', { params: filterParams }),
        LiveMapService.getCityStats(),
        LiveMapService.getRealTimeStats()
      ])

      setOnlineUsers(usersResponse?.data?.users || [])
      setActiveEvents(eventsResponse.data?.data || [])
      setCheckins(Array.isArray(checkinsResponse.data) ? checkinsResponse.data : [])
      setCityStats(statsResponse?.data?.stats || [])
      setRealTimeData({
        onlineUsers: realTimeResponse?.data?.onlineUsers || 0,
        activeEvents: realTimeResponse?.data?.activeEvents || 0,
        totalCheckins: realTimeResponse?.data?.totalCheckins || 0,
        lastUpdate: new Date(realTimeResponse?.data?.lastUpdate || Date.now())
      })
    } catch (err) {
      console.error('Erro ao carregar dados do mapa:', err)
      setError('Erro ao carregar dados do mapa')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Função para atualizar dados
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadMapData()
    setIsRefreshing(false)
  }

  // Função avançada para gerar dados do heatmap
  const generateHeatmapData = useCallback(() => {
    let dataSource = []
    let weightMultiplier = 1

    switch (heatmapConfig.type) {
      case 'users':
        dataSource = Array.isArray(onlineUsers) ? onlineUsers : []
        weightMultiplier = 1
        break
      case 'events':
        dataSource = Array.isArray(activeEvents) ? activeEvents : []
        weightMultiplier = 2 // Eventos têm peso maior
        break
      case 'checkins':
        dataSource = Array.isArray(checkins) ? checkins : []
        weightMultiplier = 1
        break
      case 'combined':
        // Combina todos os tipos de dados
        dataSource = [
          ...(Array.isArray(onlineUsers) ? onlineUsers.map(u => ({ ...u, type: 'user', weight: 1 })) : []),
          ...(Array.isArray(activeEvents) ? activeEvents.map(e => ({ ...e, type: 'event', weight: 3 })) : []),
          ...(Array.isArray(checkins) ? checkins.map(c => ({ ...c, type: 'checkin', weight: 1 })) : [])
        ]
        weightMultiplier = 1
        break
      default:
        dataSource = Array.isArray(checkins) ? checkins : []
    }

    if (!dataSource.length) return null

    return {
      type: 'FeatureCollection',
      features: dataSource.map(item => ({
        type: 'Feature',
        properties: {
          weight: (item.weight || 1) * weightMultiplier,
          type: item.type || heatmapConfig.type,
          id: item.id,
          name: item.name || item.title || 'Item'
        },
        geometry: {
          type: 'Point',
          coordinates: [item.longitude, item.latitude]
        }
      }))
    }
  }, [onlineUsers, activeEvents, checkins, heatmapConfig.type])

  // Esquemas de cores para heatmap
  const colorSchemes = {
    default: [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(33,102,172,0)',
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)'
    ],
    fire: [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0,0,0,0)',
      0.2, 'rgb(128,0,0)',
      0.4, 'rgb(255,0,0)',
      0.6, 'rgb(255,165,0)',
      0.8, 'rgb(255,255,0)',
      1, 'rgb(255,255,255)'
    ],
    ocean: [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0,0,0,0)',
      0.2, 'rgb(0,0,139)',
      0.4, 'rgb(0,100,200)',
      0.6, 'rgb(0,191,255)',
      0.8, 'rgb(135,206,250)',
      1, 'rgb(255,255,255)'
    ],
    rainbow: [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0,0,0,0)',
      0.2, 'rgb(128,0,128)',
      0.4, 'rgb(0,0,255)',
      0.6, 'rgb(0,255,0)',
      0.8, 'rgb(255,255,0)',
      1, 'rgb(255,0,0)'
    ]
  }

  // Configuração avançada da camada de heatmap
  const getHeatmapLayer = useCallback(() => ({
    id: 'advanced-heatmap',
    type: 'heatmap',
    paint: {
      'heatmap-weight': {
        property: 'weight',
        type: 'exponential',
        stops: [[1, 0], [100, 1]]
      },
      'heatmap-intensity': {
        stops: [[11, heatmapConfig.intensity], [15, heatmapConfig.intensity * 2]]
      },
      'heatmap-color': colorSchemes[heatmapConfig.colorScheme] || colorSchemes.default,
      'heatmap-radius': {
        stops: [[11, heatmapConfig.radius * 0.75], [15, heatmapConfig.radius]]
      },
      'heatmap-opacity': heatmapConfig.opacity
    }
  }), [heatmapConfig])

  // Funções de alternância de camadas
  const toggleLayer = (layerName) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }))
  }

  // Função para análise de densidade
  const analyzeDensity = useCallback(() => {
    const allPoints = [
      ...(Array.isArray(onlineUsers) ? onlineUsers.map(u => ({ ...u, type: 'user' })) : []),
      ...(Array.isArray(activeEvents) ? activeEvents.map(e => ({ ...e, type: 'event' })) : []),
      ...(Array.isArray(checkins) ? checkins.map(c => ({ ...c, type: 'checkin' })) : [])
    ]

    if (allPoints.length === 0) return null

    // Agrupa pontos por proximidade (clustering simples)
    const clusters = []
    const processed = new Set()
    const radius = 0.01 // ~1km

    allPoints.forEach((point, index) => {
      if (processed.has(index)) return

      const cluster = {
        center: { lat: point.latitude, lng: point.longitude },
        points: [point],
        totalWeight: point.weight || 1,
        types: { [point.type]: 1 }
      }

      // Encontra pontos próximos
      allPoints.forEach((otherPoint, otherIndex) => {
        if (index === otherIndex || processed.has(otherIndex)) return

        const distance = Math.sqrt(
          Math.pow(point.latitude - otherPoint.latitude, 2) +
          Math.pow(point.longitude - otherPoint.longitude, 2)
        )

        if (distance <= radius) {
          cluster.points.push(otherPoint)
          cluster.totalWeight += otherPoint.weight || 1
          cluster.types[otherPoint.type] = (cluster.types[otherPoint.type] || 0) + 1
          processed.add(otherIndex)
        }
      })

      processed.add(index)
      clusters.push(cluster)
    })

    // Ordena clusters por densidade
    clusters.sort((a, b) => b.totalWeight - a.totalWeight)

    return {
      clusters: clusters.slice(0, 10), // Top 10 clusters
      totalPoints: allPoints.length,
      averageDensity: allPoints.length / clusters.length,
      hotspots: clusters.filter(c => c.totalWeight > 5)
    }
  }, [onlineUsers, activeEvents, checkins])

  // Função para gerar dados de clustering
  const generateClusterData = useCallback(() => {
    const analysis = analyzeDensity()
    if (!analysis) return null

    return {
      type: 'FeatureCollection',
      features: analysis.clusters.map((cluster, index) => ({
        type: 'Feature',
        properties: {
          id: `cluster-${index}`,
          weight: cluster.totalWeight,
          pointCount: cluster.points.length,
          types: cluster.types,
          isHotspot: cluster.totalWeight > 5
        },
        geometry: {
          type: 'Point',
          coordinates: [cluster.center.lng, cluster.center.lat]
        }
      }))
    }
  }, [analyzeDensity])

  // Função para aplicar filtros
  const applyFilters = () => {
    loadMapData()
    setShowFilters(false)
  }

  // Função para limpar filtros
  const clearFilters = () => {
    setFilters({
      city: '',
      state: '',
      startDate: '',
      endDate: ''
    })
    loadMapData()
  }

  // Efeitos
  useEffect(() => {
    loadMapData()

    // Subscrever a atualizações em tempo real
    const unsubscribe = LiveMapService.subscribeToUpdates((stats) => {
      setRealTimeData({
        onlineUsers: stats.onlineUsers,
        activeEvents: stats.activeEvents,
        totalCheckins: stats.totalCheckins,
        lastUpdate: new Date(stats.lastUpdate)
      })
    })

    return unsubscribe
  }, [])

  // Configuração da camada de clusters
  const clusterLayer = {
    id: 'clusters',
    type: 'circle',
    paint: {
      'circle-color': [
        'case',
        ['get', 'isHotspot'],
        '#ff4444',
        '#4444ff'
      ],
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'weight'],
        1, 8,
        10, 20,
        50, 35
      ],
      'circle-opacity': 0.7,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  }

  // Estilos de mapa disponíveis
  const mapStyles = {
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    navigation: 'mapbox://styles/mapbox/navigation-day-v1'
  }

  // Verificar token do Mapbox
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Token do Mapbox não configurado</p>
          <p className="text-sm text-gray-500 mt-2">
            Configure VITE_MAPBOX_TOKEN no arquivo .env
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa ao Vivo Unificado</h1>
          <p className="text-gray-600 mt-1">
            Visualização em tempo real de usuários, eventos e check-ins
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
          <button
            onClick={() => setShowCustomControls(!showCustomControls)}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${showCustomControls ? 'text-blue-700 bg-blue-50' : 'text-gray-700 bg-white'} hover:bg-gray-50`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Personalizar
          </button>
          <button
            onClick={() => {
              setAnalysisMode(!analysisMode)
              if (!analysisMode) {
                setDensityAnalysis(analyzeDensity())
              }
            }}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${analysisMode ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-white'} hover:bg-gray-50`}
          >
            <Target className="h-4 w-4 mr-2" />
            Análise
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Estatísticas em tempo real */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Usuários Online
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {realTimeData.onlineUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Eventos Ativos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {realTimeData.activeEvents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Check-ins
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {realTimeData.totalCheckins}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Última Atualização
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {realTimeData.lastUpdate.toLocaleTimeString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de controles personalizados */}
      {showCustomControls && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Personalização do Mapa</h3>
            <button
              onClick={() => setShowCustomControls(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurações de Heatmap */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-800 flex items-center">
                <Thermometer className="h-4 w-4 mr-2" />
                Configurações de Heatmap
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Dados
                  </label>
                  <select
                    value={heatmapConfig.type}
                    onChange={(e) => setHeatmapConfig(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="users">Usuários Online</option>
                    <option value="events">Eventos Ativos</option>
                    <option value="checkins">Check-ins</option>
                    <option value="combined">Combinado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Esquema de Cores
                  </label>
                  <select
                    value={heatmapConfig.colorScheme}
                    onChange={(e) => setHeatmapConfig(prev => ({ ...prev, colorScheme: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="default">Padrão</option>
                    <option value="fire">Fogo</option>
                    <option value="ocean">Oceano</option>
                    <option value="rainbow">Arco-íris</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intensidade: {heatmapConfig.intensity}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={heatmapConfig.intensity}
                    onChange={(e) => setHeatmapConfig(prev => ({ ...prev, intensity: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raio: {heatmapConfig.radius}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={heatmapConfig.radius}
                    onChange={(e) => setHeatmapConfig(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opacidade: {Math.round(heatmapConfig.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={heatmapConfig.opacity}
                  onChange={(e) => setHeatmapConfig(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Configurações do Mapa */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-800 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Estilo do Mapa
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estilo Base
                </label>
                <select
                  value={mapStyle}
                  onChange={(e) => setMapStyle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="streets">Ruas</option>
                  <option value="satellite">Satélite</option>
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                  <option value="outdoors">Outdoor</option>
                  <option value="navigation">Navegação</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-700">Camadas Visíveis</h5>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={layerVisibility.users}
                      onChange={() => toggleLayer('users')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Usuários Online</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={layerVisibility.events}
                      onChange={() => toggleLayer('events')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Eventos Ativos</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={layerVisibility.heatmap}
                      onChange={() => toggleLayer('heatmap')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mapa de Calor</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={layerVisibility.clusters}
                      onChange={() => toggleLayer('clusters')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Clusters de Densidade</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Painel de análise */}
      {analysisMode && densityAnalysis && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Análise de Densidade
            </h3>
            <button
              onClick={() => setAnalysisMode(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{densityAnalysis.totalPoints}</div>
              <div className="text-sm text-blue-800">Total de Pontos</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{densityAnalysis.clusters.length}</div>
              <div className="text-sm text-green-800">Clusters Identificados</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{densityAnalysis.hotspots.length}</div>
              <div className="text-sm text-yellow-800">Pontos Quentes</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{Math.round(densityAnalysis.averageDensity * 10) / 10}</div>
              <div className="text-sm text-purple-800">Densidade Média</div>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-3">Top Clusters por Densidade</h4>
            <div className="space-y-2">
              {densityAnalysis.clusters.slice(0, 5).map((cluster, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Cluster #{index + 1}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      ({cluster.center.lat.toFixed(4)}, {cluster.center.lng.toFixed(4)})
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{cluster.totalWeight}</div>
                    <div className="text-sm text-gray-600">{cluster.points.length} pontos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Digite a cidade"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <input
                type="text"
                value={filters.state}
                onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Digite o estado"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Limpar
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Controles de camadas */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Camadas do Mapa</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleLayer('users')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              layerVisibility.users
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {layerVisibility.users ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            Usuários
          </button>
          <button
            onClick={() => toggleLayer('events')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              layerVisibility.events
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {layerVisibility.events ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            Eventos
          </button>
          <button
            onClick={() => toggleLayer('heatmap')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              layerVisibility.heatmap
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {layerVisibility.heatmap ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            Heatmap
          </button>
        </div>
      </div>

      {/* Mapa */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Carregando mapa...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadMapData}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <div className="h-96">
            <Map
              ref={mapRef}
              {...viewport}
              onMove={evt => setViewport(evt.viewState)}
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle={mapStyles[mapStyle]}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Heatmap avançado */}
              {layerVisibility.heatmap && generateHeatmapData() && (
                <Source id="heatmap-data" type="geojson" data={generateHeatmapData()}>
                  <Layer {...getHeatmapLayer()} />
                </Source>
              )}

              {/* Clusters de densidade */}
              {layerVisibility.clusters && generateClusterData() && (
                <Source id="cluster-data" type="geojson" data={generateClusterData()}>
                  <Layer 
                    {...clusterLayer} 
                    onClick={(e) => {
                      if (e.features && e.features[0] && densityAnalysis) {
                        const feature = e.features[0];
                        const clusterId = feature.properties.clusterId;
                        const cluster = densityAnalysis.clusters[clusterId];
                        if (cluster) {
                          setSelectedCluster(cluster);
                        }
                      }
                    }}
                  />
                </Source>
              )}

              {/* Marcadores de eventos */}
              {layerVisibility.events && activeEvents.map((event) => (
                <Marker
                  key={event.id}
                  latitude={event.latitude}
                  longitude={event.longitude}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="bg-green-500 rounded-full p-2 cursor-pointer hover:bg-green-600 transition-colors">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                </Marker>
              ))}

              {/* Popups de eventos */}
              {selectedEvent && (
                <Popup
                  latitude={selectedEvent.latitude}
                  longitude={selectedEvent.longitude}
                  onClose={() => setSelectedEvent(null)}
                  closeButton={true}
                  closeOnClick={false}
                >
                  <div className="p-2">
                    <h4 className="font-semibold text-sm">{selectedEvent.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{selectedEvent.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedEvent.location?.city}, {selectedEvent.location?.state}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(selectedEvent.date).toLocaleDateString()}
                    </p>
                  </div>
                </Popup>
              )}

              {/* Marcadores de usuários */}
              {layerVisibility.users && onlineUsers.map((user) => (
                <Marker
                  key={user.id}
                  latitude={user.latitude}
                  longitude={user.longitude}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                </Marker>
              ))}

              {/* Popups de usuários */}
              {selectedUser && (
                <Popup
                  latitude={selectedUser.latitude}
                  longitude={selectedUser.longitude}
                  onClose={() => setSelectedUser(null)}
                  closeButton={true}
                  closeOnClick={false}
                >
                  <div className="p-2">
                    <h4 className="font-semibold text-sm">{selectedUser.username}</h4>
                    <p className="text-xs text-gray-600">
                      {selectedUser.location?.city}, {selectedUser.location?.state}
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {selectedUser.status === 'online' ? 'Online' : 'Em evento'}
                    </p>
                  </div>
                </Popup>
              )}

              {/* Popups de clusters */}
              {selectedCluster && (
                <Popup
                  latitude={selectedCluster.center.lat}
                  longitude={selectedCluster.center.lng}
                  onClose={() => setSelectedCluster(null)}
                  closeButton={true}
                  closeOnClick={false}
                >
                  <div className="p-3">
                    <h4 className="font-semibold text-sm mb-2">Cluster de Densidade</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de pontos:</span>
                        <span className="font-medium">{selectedCluster.points.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Peso total:</span>
                        <span className="font-medium">{selectedCluster.totalWeight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Usuários:</span>
                        <span className="font-medium">{selectedCluster.types.users || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Eventos:</span>
                        <span className="font-medium">{selectedCluster.types.events || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-ins:</span>
                        <span className="font-medium">{selectedCluster.types.checkins || 0}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>
          </div>
        )}
      </div>

      {/* Estatísticas por cidade */}
      {layerVisibility.stats && cityStats.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas por Cidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cityStats.slice(0, 6).map((city, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900">
                  {city.city}, {city.state}
                </h4>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Usuários:</span>
                    <span className="font-medium">{city.users}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Eventos:</span>
                    <span className="font-medium">{city.events}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Check-ins:</span>
                    <span className="font-medium">{city.checkins}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UnifiedLiveMap