import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import Overview from './pages/Overview'
import UserManagement from './pages/UserManagement'
import EventManagement from './pages/EventManagement'
import UnifiedLiveMap from './pages/UnifiedLiveMap'
import ContentModeration from './pages/ContentModeration'
import StoreManagement from './pages/StoreManagement'
import FinancialReports from './pages/FinancialReports'
import SystemSettings from './pages/SystemSettings'
import ApiLogs from './pages/ApiLogs'
import Announcements from './pages/Announcements'
import PlansManagement from './pages/PlansManagement'
import PaymentSuccess from './pages/PaymentSuccess'

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader setSidebarOpen={setSidebarOpen} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/events" element={<EventManagement />} />
            <Route path="/unified-map" element={<UnifiedLiveMap />} />
            <Route path="/moderation" element={<ContentModeration />} />
            <Route path="/store" element={<StoreManagement />} />
            <Route path="/reports" element={<FinancialReports />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="/logs" element={<ApiLogs />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/plans" element={<PlansManagement />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard