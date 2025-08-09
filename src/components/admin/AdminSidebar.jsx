import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Map, 
  MapPin,
  Shield, 
  Store, 
  CreditCard,
  TrendingUp, 
  Settings, 
  FileText, 
  Megaphone,
  X
} from 'lucide-react'

const AdminSidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation()
  
  const menuItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      current: location.pathname === '/admin'
    },
    {
      name: 'Usuários',
      href: '/admin/users',
      icon: Users,
      current: location.pathname === '/admin/users'
    },
    {
      name: 'Eventos',
      href: '/admin/events',
      icon: Calendar,
      current: location.pathname === '/admin/events'
    },
    {
      name: 'Mapa ao Vivo',
      href: '/admin/unified-map',
      icon: Map,
      current: location.pathname === '/admin/unified-map'
    },
    {
      name: 'Moderação',
      href: '/admin/moderation',
      icon: Shield,
      current: location.pathname === '/admin/moderation'
    },
    {
      name: 'Loja',
      href: '/admin/store',
      icon: Store,
      current: location.pathname === '/admin/store'
    },
    {
      name: 'Gerenciar Planos',
      href: '/admin/plans',
      icon: CreditCard,
      current: location.pathname === '/admin/plans'
    },
    {
      name: 'Relatórios',
      href: '/admin/reports',
      icon: TrendingUp,
      current: location.pathname === '/admin/reports'
    },
    {
      name: 'Logs da API',
      href: '/admin/logs',
      icon: FileText,
      current: location.pathname === '/admin/logs'
    },
    {
      name: 'Anúncios',
      href: '/admin/announcements',
      icon: Megaphone,
      current: location.pathname === '/admin/announcements'
    },

    {
      name: 'Configurações',
      href: '/admin/settings',
      icon: Settings,
      current: location.pathname === '/admin/settings'
    }
  ]

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-conservative-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 bg-conservative-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="text-white font-bold text-lg">Admin Panel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                    ${item.current
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-conservative-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Admin Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-conservative-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Admin
              </p>
              <p className="text-xs text-gray-400 truncate">
                Central de Comando
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminSidebar