import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/AdminRoute'
import { Layout } from './components/Layout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { GiftsPage } from './pages/GiftsPage'
import { HomePage } from './pages/HomePage'
import { RsvpPage } from './pages/RsvpPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="confirmar" element={<RsvpPage />} />
          <Route path="presentes" element={<GiftsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
