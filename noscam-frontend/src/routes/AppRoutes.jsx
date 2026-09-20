import { Route, Routes } from 'react-router-dom'

import ProtectedAdminRoute from '../components/admin/ProtectedAdminRoute'
import AppLayout from '../layouts/AppLayout'

import AboutPage from '../pages/About/AboutPage'
import AdminLoginPage from '../pages/Admin/AdminLoginPage'
import AdminReportDetailPage from '../pages/Admin/AdminReportDetailPage'
import AdminReportsPage from '../pages/Admin/AdminReportsPage'
import AlertsPage from '../pages/Alerts/AlertsPage'
import GuidePage from '../pages/Guide/GuidePage'
import HomePage from '../pages/Home/HomePage'
import ReportPage from '../pages/Report/ReportPage'
import SearchPage from '../pages/Search/SearchPage'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/search"
          element={<SearchPage />}
        />

        <Route
          path="/report"
          element={<ReportPage />}
        />

        <Route
          path="/alerts"
          element={<AlertsPage />}
        />

        <Route
          path="/guide"
          element={<GuidePage />}
        />

        <Route
          path="/about"
          element={<AboutPage />}
        />
      </Route>

      <Route
        path="/admin/login"
        element={<AdminLoginPage />}
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedAdminRoute>
            <AdminReportsPage />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/admin/reports/:id"
        element={
          <ProtectedAdminRoute>
            <AdminReportDetailPage />
          </ProtectedAdminRoute>
        }
      />
    </Routes>
  )
}

export default AppRoutes