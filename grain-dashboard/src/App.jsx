import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Purchases  from './pages/Purchases'
import Sales      from './pages/Sales'
import Inventory  from './pages/Inventory'
import Suppliers  from './pages/Suppliers'
import Buyers     from './pages/Buyers'
import Payments   from './pages/Payments'
import Warehouses from './pages/Warehouses'
import Grains     from './pages/Grains'
import { Spinner } from './components/ui'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={28} />
    </div>
  )
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={28} />
    </div>
  )
  return user ? <Navigate to="/" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/purchases" element={<PrivateRoute><Purchases /></PrivateRoute>} />
      <Route path="/sales"     element={<PrivateRoute><Sales /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />
      <Route path="/buyers"    element={<PrivateRoute><Buyers /></PrivateRoute>} />
      <Route path="/payments"  element={<PrivateRoute><Payments /></PrivateRoute>} />
      <Route path="/warehouses"element={<PrivateRoute><Warehouses /></PrivateRoute>} />
      <Route path="/grains"    element={<PrivateRoute><Grains /></PrivateRoute>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
