import { apiClient } from '../lib/api';
import { ApiResponse } from '../types/api';

export interface OnlineUser {
  id: number;
  username: string;
  location: {
    city: string;
    state: string;
    lat: number;
    lng: number;
  };
  status: 'online' | 'in_event';
  lastActivity: string;
  plan: string;
}

export interface ActiveEvent {
  id: number;
  title: string;
  location: {
    city: string;
    state: string;
    lat: number;
    lng: number;
  };
  participants: number;
  status: string;
  startTime: string;
  endTime?: string;
}

export interface CityStats {
  city: string;
  state: string;
  users: number;
  events: number;
  checkins: number;
}

export interface RealTimeStats {
  onlineUsers: number;
  activeEvents: number;
  totalCheckins: number;
  lastUpdate: string;
}

export class LiveMapService {
  /**
   * Get online users
   */
  static async getOnlineUsers(): Promise<ApiResponse<{ users: OnlineUser[] }>> {
    return apiClient.get('/admin/live-map/users');
  }

  /**
   * Get active events
   */
  static async getActiveEvents(): Promise<ApiResponse<{ events: ActiveEvent[] }>> {
    return apiClient.get('/admin/live-map/events');
  }

  /**
   * Get city statistics
   */
  static async getCityStats(): Promise<ApiResponse<{ stats: CityStats[] }>> {
    return apiClient.get('/admin/live-map/stats');
  }

  /**
   * Get real-time statistics
   */
  static async getRealTimeStats(): Promise<ApiResponse<RealTimeStats>> {
    return apiClient.get('/admin/live-map/realtime');
  }

  /**
   * Subscribe to real-time updates (using polling for now)
   */
  static subscribeToUpdates(
    callback: (stats: RealTimeStats) => void,
    interval: number = 30000 // 30 seconds
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        const response = await this.getRealTimeStats();
        if (response.success && response.data) {
          callback(response.data);
        }
      } catch (error) {
        console.error('Error fetching real-time stats:', error);
      }
    }, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

// Create and export singleton instance
export const liveMapService = new LiveMapService();

export default LiveMapService;