// Exportar todos os serviços
import AuthService from './auth';
import AIService from './ai';
import EventsService from './events';
import StoreService from './store';
import GamificationService from './gamification';
import AdminService from './admin';
import NotificationsService from './notifications';
import PaymentsService from './payments';
import MapboxService from './mapbox';
export { AuthService };
export { AIService };
export { EventsService };
export { StoreService };
export { GamificationService };
export { AdminService };
export { NotificationsService };
export { PaymentsService };
export { MapboxService };
export { paymentsService } from './payments';
export { mapboxService } from './mapbox';
import LiveMapService from './liveMap';
export { liveMapService } from './liveMap';
export { LiveMapService };
import ContentModerationService from './contentModeration';
export { contentModerationService } from './contentModeration';
export { ContentModerationService };
import FinancialReportsService from './financialReports';
export { financialReportsService } from './financialReports';
export { FinancialReportsService };
export { storeManagementService, StoreManagementService } from './storeManagement';

// Exportar como default também para conveniência
export {
  AuthService as Auth,
  AIService as AI,
  EventsService as Events,
  StoreService as Store,
  GamificationService as Gamification,
  AdminService as Admin,
  NotificationsService as Notifications,
  LiveMapService as LiveMap,
  ContentModerationService as ContentModeration,
  FinancialReportsService as FinancialReports
};

// Criar um objeto com todos os serviços para fácil acesso
export const Services = {
  Auth: AuthService,
  AI: AIService,
  Events: EventsService,
  Store: StoreService,
  Gamification: GamificationService,
  Admin: AdminService,
  Notifications: NotificationsService,
  LiveMap: LiveMapService,
  ContentModeration: ContentModerationService,
  FinancialReports: FinancialReportsService
} as const;

export default Services;