import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../lib/supabase'
import { Menu, Bell, LogOut, Settings, User } from 'lucide-react'

const Header = ({ setSidebarOpen }) => {
  const { user, userProfile } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const getPlanBadge = (plan) => {
    const badges = {
      gratuito: 'bg-gray-100 text-gray-800',
      engajado: 'bg-blue-100 text-blue-800',
      premium: 'bg-yellow-100 text-yellow-800'
    }
    return badges[plan] || badges.gratuito
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="ml-4 lg:ml-0">
            <h1 className="text-2xl font-semibold text-gray-900">
              Central do Patriota
            </h1>
            <p className="text-sm text-gray-500">
              Bem-vindo de volta, {userProfile?.username || user?.email}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Plan Badge */}
          {userProfile?.plan && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              getPlanBadge(userProfile.plan)
            }`}>
              {userProfile.plan.charAt(0).toUpperCase() + userProfile.plan.slice(1)}
            </span>
          )}
          
          {/* Points */}
          {userProfile?.points !== undefined && (
            <div className="flex items-center space-x-1 bg-primary-50 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-primary-700">
                {userProfile.points} pts
              </span>
            </div>
          )}
          
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full">
            <Bell className="h-5 w-5" />
          </button>
          
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full"
            >
              <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </button>
            
            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile?.username || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email}
                  </p>
                </div>
                
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </button>
                
                <button 
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Close dropdown when clicking outside */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </header>
  )
}

export default Header