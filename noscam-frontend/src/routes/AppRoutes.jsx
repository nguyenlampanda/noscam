import {
  lazy,
  Suspense,
} from 'react'
import {
  Route,
  Routes,
} from 'react-router-dom'

import ProtectedAdminRoute from '../components/admin/ProtectedAdminRoute'
import AppLayout from '../layouts/AppLayout'

const HomePage = lazy(() =>
  import(
    '../pages/Home/HomePage'
  ),
)

const SearchPage = lazy(() =>
  import(
    '../pages/Search/SearchPage'
  ),
)

const ReportPage = lazy(() =>
  import(
    '../pages/Report/ReportPage'
  ),
)

const AlertsPage = lazy(() =>
  import(
    '../pages/Alerts/AlertsPage'
  ),
)

const GuidePage = lazy(() =>
  import(
    '../pages/Guide/GuidePage'
  ),
)

const AboutPage = lazy(() =>
  import(
    '../pages/About/AboutPage'
  ),
)

const AdminLoginPage = lazy(() =>
  import(
    '../pages/Admin/AdminLoginPage'
  ),
)

const AdminReportsPage = lazy(() =>
  import(
    '../pages/Admin/AdminReportsPage'
  ),
)

const AdminReportDetailPage =
  lazy(() =>
    import(
      '../pages/Admin/AdminReportDetailPage'
    ),
  )

function RouteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-white px-4">
      <div className="text-center">
        <div className="relative mx-auto h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-slate-200" />

          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-600" />
        </div>

        <p className="mt-4 text-sm font-medium text-slate-500">
          Đang tải NoScam...
        </p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Suspense
      fallback={<RouteLoading />}
    >
      <Routes>
        <Route
          element={<AppLayout />}
        >
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
          element={
            <AdminLoginPage />
          }
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
    </Suspense>
  )
}

export default AppRoutes