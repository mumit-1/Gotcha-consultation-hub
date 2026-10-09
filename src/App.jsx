import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth, RequireAdmin, RedirectIfAuth } from './components/auth/ProtectedRoute'

// Pages
import Landing          from './pages/Landing'
import Login            from './pages/Auth/Login'
import Register         from './pages/Auth/Register'
import ResetPassword    from './pages/Auth/ResetPassword'
import Dashboard        from './pages/Dashboard'
import FindConsultants  from './pages/FindConsultants'
import ConsultantProfile from './pages/ConsultantProfile'
import BookSession      from './pages/BookSession'
import BecomeConsultant from './pages/BecomeConsultant'
import Availability     from './pages/Availability'
import MyConsultations  from './pages/MyConsultations'
import Notifications    from './pages/Notifications'
import Profile          from './pages/Profile'
import AdminDashboard   from './pages/Admin/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"              element={<Landing />} />
          <Route path="/find"          element={<FindConsultants />} />
          <Route path="/consultant/:uid" element={<ConsultantProfile />} />

          {/* Auth — redirect if already logged in */}
          <Route path="/login"          element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
          <Route path="/register"       element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
          <Route path="/reset-password" element={<RedirectIfAuth><ResetPassword /></RedirectIfAuth>} />

          {/* Protected */}
          <Route path="/dashboard"          element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/book/:consultantId" element={<RequireAuth><BookSession /></RequireAuth>} />
          <Route path="/become-consultant"  element={<RequireAuth><BecomeConsultant /></RequireAuth>} />
          <Route path="/availability"       element={<RequireAuth><Availability /></RequireAuth>} />
          <Route path="/my-consultations"   element={<RequireAuth><MyConsultations /></RequireAuth>} />
          <Route path="/notifications"      element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/profile"            element={<RequireAuth><Profile /></RequireAuth>} />

          {/* Admin */}
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen bg-neo-bg flex items-center justify-center p-8 text-center">
              <div>
                <div className="inline-block bg-neo-accent text-white border-4 border-black shadow-neo-xl px-6 py-4 font-black text-8xl mb-6 rotate-2">
                  404
                </div>
                <h1 className="font-black text-4xl uppercase mt-6 mb-4">Page Not Found</h1>
                <a href="/" className="btn btn-primary btn-lg">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
