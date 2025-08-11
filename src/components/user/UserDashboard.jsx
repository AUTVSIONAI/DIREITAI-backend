import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Profile from './pages/Profile'
import DireitaGPT from './pages/direitagpt'
import CheckIn from './pages/CheckIn'
import Ranking from './pages/Ranking'
import Store from './pages/Store'
import CreativeAI from './pages/CreativeAI'
import Achievements from './pages/Achievements'
import Plan from './pages/Plan'
import Overview from './pages/Overview'
import StoreSuccess from './pages/StoreSuccess'

const UserDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header setSidebarOpen={setSidebarOpen} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/direitagpt" element={<DireitaGPT />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/store" element={<Store />} />
            <Route path="/store/success" element={<StoreSuccess />} />
            <Route path="/creative" element={<CreativeAI />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/plan" element={<Plan />} />
          </Routes>
        </main>
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default UserDashboard