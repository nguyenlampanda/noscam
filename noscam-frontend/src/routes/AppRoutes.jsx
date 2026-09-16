import { Route, Routes } from 'react-router-dom'

import AppLayout from '../layouts/AppLayout'

import HomePage from '../pages/Home/HomePage'
import SearchPage from '../pages/Search/SearchPage'
import ReportPage from '../pages/Report/ReportPage'
import AlertsPage from '../pages/Alerts/AlertsPage'
import GuidePage from '../pages/Guide/GuidePage'
import AboutPage from '../pages/About/AboutPage'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes