import { Routes, Route, Navigate } from 'react-router-dom'
import { LandingPage } from './components/Landing/LandingPage'
import { MainLayout } from './components/Layout/MainLayout'
import { CalendarPage } from './components/Calendar/CalendarPage'
import { DreamDetailPage } from './components/Dream/DreamDetailPage'
import { CategoryManagePage } from './components/Category/CategoryManagePage'
import { SettingsPage } from './components/Settings/SettingsPage'
import { SearchPage } from './components/Search/SearchPage'
import { AboutPage } from './components/About/AboutPage'
import { FeedPage } from './components/Feed/FeedPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route element={<MainLayout />}>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/dream/:id" element={<DreamDetailPage />} />
        <Route path="/categories" element={<CategoryManagePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
      <Route path="/feed" element={<FeedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
