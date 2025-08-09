import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/Auth/RegisterPage'));
const ProfilePage = React.lazy(() => import('./pages/Profile/ProfilePage'));
const EventsPage = React.lazy(() => import('./pages/Events/EventsPage'));
const EventDetailPage = React.lazy(() => import('./pages/Events/EventDetailPage'));
const AIPage = React.lazy(() => import('./pages/AI/AIPage'));
const StorePage = React.lazy(() => import('./pages/Store/StorePage'));
const CartPage = React.lazy(() => import('./pages/Store/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/Store/CheckoutPage'));
const OrdersPage = React.lazy(() => import('./pages/Store/OrdersPage'));
const LeaderboardPage = React.lazy(() => import('./pages/Gamification/LeaderboardPage'));
const AchievementsPage = React.lazy(() => import('./pages/Gamification/AchievementsPage'));
const AdminDashboard = React.lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/Admin/AdminUsers'));
const AdminEvents = React.lazy(() => import('./pages/Admin/AdminEvents'));
const AdminStore = React.lazy(() => import('./pages/Admin/AdminStore'));
const AdminModeration = React.lazy(() => import('./pages/Admin/AdminModeration'));
const AdminSettings = React.lazy(() => import('./pages/Admin/AdminSettings'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>DireitaAI - Conectando Conservadores</title>
        <meta
          name="description"
          content="Plataforma completa para o público conservador com eventos, IA, gamificação e comunidade."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1e40af" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </Helmet>

      <Layout>
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />

            {/* Protected Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AIPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <AdminRoute>
                  <AdminEvents />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/store"
              element={
                <AdminRoute>
                  <AdminStore />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <AdminRoute>
                  <AdminModeration />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              }
            />

            {/* Redirect old routes */}
            <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
            <Route path="/shop" element={<Navigate to="/store" replace />} />

            {/* 404 Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </>
  );
}

export default App;