import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { apiClient } from '../../../lib/api';
import { MapPin, Calendar, Users, Filter, X } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MapboxLiveMap = () => {
  const [viewState, setViewState] = useState({
    longitude: -47.8825,
    latitude: -15.7942,
    zoom: 5
  });
  
  const [events, setEvents] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const mapRef = useRef();
  
  // Carregar dados iniciais
  useEffect(() => {
    loadMapData();
  }, [filters]);
  
  const loadMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir query params
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      
      // Carregar eventos e check-ins em paralelo
      const [eventsResponse, checkinsResponse] = await Promise.all([
        apiClient.get(`/events/map?${params.toString()}`),
        apiClient.get(`/checkins/map?${params.toString()}`)
      ]);
      
      if (eventsResponse?.data?.success) {
        setEvents(eventsResponse.data.data || []);
      } else {
        setEvents([]);
      }
      
      if (checkinsResponse?.data?.success) {
        setCheckins(checkinsResponse.data.data || []);
      } else {
        setCheckins([]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do mapa:', error);
      setError('Erro ao carregar dados do mapa');
    } finally {
      setLoading(false);
    }
  };
  
  // Gerar dados para heatmap de check-ins
  const generateHeatmapData = () => {
    if (!checkins.length) return null;
    
    const features = checkins.map(checkin => ({
      type: 'Feature',
      properties: {
        weight: checkin.count || 1
      },
      geometry: {
        type: 'Point',
        coordinates: [checkin.longitude, checkin.latitude]
      }
    }));
    
    return {
      type: 'FeatureCollection',
      features
    };
  };
  
  // Configuração da camada de heatmap
  const heatmapLayer = {
    id: 'checkins-heatmap',
    type: 'heatmap',
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'weight'],
        0, 0,
        6, 1
      ],
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 1,
        9, 3
      ],
      'heatmap-color': [
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
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 2,
        9, 20
      ],
      'heatmap-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        7, 1,
        9, 0
      ]
    }
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      city: '',
      state: '',
      dateFrom: '',
      dateTo: ''
    });
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Token do Mapbox não configurado</p>
          <p className="text-sm text-gray-500 mt-2">
            Configure VITE_MAPBOX_TOKEN no arquivo .env
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa ao Vivo</h1>
          <p className="text-gray-600">Eventos e check-ins em tempo real</p>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Filter className="h-4 w-4" />
          Filtros
        </button>
      </div>
      
      {/* Filtros */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <input
                type="text"
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                placeholder="Ex: SP"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={loadMapData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
      
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eventos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Check-ins</p>
              <p className="text-2xl font-bold text-gray-900">
                {checkins.reduce((total, checkin) => total + (checkin.count || 1), 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Localizações</p>
              <p className="text-2xl font-bold text-gray-900">{checkins.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mapa */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <div className="h-96 md:h-[600px]">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            attributionControl={false}
          >
            {/* Heatmap de check-ins */}
            {generateHeatmapData() && (
              <Source id="checkins" type="geojson" data={generateHeatmapData()}>
                <Layer {...heatmapLayer} />
              </Source>
            )}
            
            {/* Marcadores de eventos */}
            {events.map((event) => (
              <Marker
                key={event.event_id}
                longitude={event.longitude}
                latitude={event.latitude}
                anchor="bottom"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedEvent(event);
                }}
              >
                <div className="bg-red-500 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-red-600 transition-colors">
                  <Calendar className="h-4 w-4" />
                </div>
              </Marker>
            ))}
            
            {/* Popup do evento selecionado */}
            {selectedEvent && (
              <Popup
                longitude={selectedEvent.longitude}
                latitude={selectedEvent.latitude}
                anchor="top"
                onClose={() => setSelectedEvent(null)}
                className="max-w-sm"
              >
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{selectedEvent.title}</h3>
                  
                  {selectedEvent.description && (
                    <p className="text-gray-600 mb-3 text-sm">
                      {selectedEvent.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedEvent.city}, {selectedEvent.state}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{formatDate(selectedEvent.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{selectedEvent.confirmed_count || 0} confirmados</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Implementar navegação para detalhes do evento
                      console.log('Ver detalhes do evento:', selectedEvent.event_id);
                    }}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      </div>
      
      {/* Legenda */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="font-semibold text-gray-900 mb-3">Legenda</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Eventos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-red-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Densidade de Check-ins</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapboxLiveMap;