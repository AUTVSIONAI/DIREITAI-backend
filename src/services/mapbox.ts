import { apiClient } from '../lib/api'

export interface MapEvent {
  id: string
  title: string
  description: string
  latitude: number
  longitude: number
  date: string
  time: string
  city: string
  state: string
  status: 'active' | 'completed' | 'cancelled'
  participantCount: number
  maxParticipants?: number
  createdBy: string
  createdAt: string
}

export interface MapCheckin {
  id: string
  eventId: string
  userId: string
  latitude: number
  longitude: number
  timestamp: string
  city?: string
  state?: string
  count?: number // For aggregated checkins
}

export interface MapFilters {
  city?: string
  state?: string
  startDate?: string
  endDate?: string
}

class MapboxService {
  async getEvents(filters?: MapFilters): Promise<MapEvent[]> {
    const params = new URLSearchParams()
    
    if (filters?.city) params.append('city', filters.city)
    if (filters?.state) params.append('state', filters.state)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    
    const response = await apiClient.get(`/events/map?${params.toString()}`)
    return response.data
  }

  async getCheckins(filters?: MapFilters): Promise<MapCheckin[]> {
    const params = new URLSearchParams()
    
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    
    const response = await apiClient.get(`/checkins/map?${params.toString()}`)
    return response.data
  }

  async getCities(): Promise<string[]> {
    const response = await apiClient.get('/events/cities')
    return response.data
  }

  async getStates(): Promise<string[]> {
    const response = await apiClient.get('/events/states')
    return response.data
  }
}

export const mapboxService = new MapboxService()
export default mapboxService