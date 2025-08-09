import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthProvider from './contexts/AuthProvider'
import HomePage from './pages/HomePage'
import Login from './components/auth/Login'
import UserDashboard from './components/user/UserDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<HomePage />} />
            
            {/* Rota de login */}
            <Route path="/login" element={<Login />} />
            
            {/* Rotas do usuário */}
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Rotas do admin */}
            <Route 
              path="/admin/*" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App