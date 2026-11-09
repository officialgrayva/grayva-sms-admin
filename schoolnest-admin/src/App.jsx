// ============================================================
// [SHARED ROOT] — UPDATED
// Single login form, no portal tabs. Adds pre-login 'register'
// and 'forgot' views alongside 'login'. Role is resolved purely
// from the decoded JWT after a single login call.
// Session survives a page refresh: the refresh token is kept in
// localStorage and exchanged for a new access token on startup.
// ============================================================
import React, { useState, useEffect } from 'react'
import { DEFAULT_BASE_URL, apiFetch } from './api'
import { decodeJwt } from './theme'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import LoginScreen from './components/LoginScreen'
import RegisterSchoolScreen from './components/RegisterSchoolScreen'
import ForgotPasswordFlow from './components/ForgotPasswordFlow'
import ForcedPasswordChange from './components/ForcedPasswordChange'
import SettingsModal from './components/SettingsModal'
import DashboardHome from './pages/DashboardHome'
import AcademicSetup from './pages/academic/AcademicSetup'
import StaffList from './pages/staff/StaffList'
import StudentsList from './pages/students/StudentsList'
import ParentsList from './pages/parents/ParentsList'
import ScoresResults from './pages/scores/ScoresResults'
import AttendanceView from './pages/attendance/AttendanceMark'
import FeesManagement from './pages/fees/FeesManagement'
import AssessmentsHome from './pages/assessments/AssessmentsHome'
import EventsManagement from './pages/events/EventsManagement'
import MessagingHome from './pages/messaging/MessagingHome'
import BillingHome from './pages/billing/BillingHome'
import SchoolProfile from './pages/settings/SchoolProfile'
import WalletHome from './pages/wallet/WalletHome'
import ErrorLogs from './pages/superadmin/ErrorLogs'
import NotificationsPage from './pages/notifications/NotificationsPage'
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications'
import Toast from './components/Toast'

import SchoolsManagement from './pages/superadmin/SchoolsManagement'
import PaymentsView from './pages/superadmin/PaymentsView'
import AnnouncementsView from './pages/superadmin/AnnouncementsView'

// ---------- session persistence (survives page refresh) ----------
const SESSION_KEY = 'schoolnest_session'
const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}
const saveSession = (s) => {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}
const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)
  const [showSettings, setShowSettings] = useState(false)
  const [preLoginView, setPreLoginView] = useState('login') // 'login' | 'register' | 'forgot'
  const [prefill, setPrefill] = useState(null) // { subdomain, identifier } after a fresh registration
  const [forgotSubdomain, setForgotSubdomain] = useState('')
  const [auth, setAuth] = useState(null)
  const [booting, setBooting] = useState(true) // true while we check for a saved session
  const [activeSection, setActiveSection] = useState('dashboard')
  const [errorFilter, setErrorFilter] = useState({ schoolId: null, schoolName: null })
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeToast, setActiveToast] = useState(null)

  const { latestNotification } = useRealtimeNotifications(baseUrl, auth?.token)

  function handleLoggedIn(data, subdomain) {
    const decoded = decodeJwt(data.accessToken)
    saveSession({
      refreshToken: data.refreshToken,
      subdomain,
      user: data.user,
      mustChangePassword: data.mustChangePassword,
    })
    setAuth({
      token: data.accessToken,
      role: decoded?.role,
      schoolId: decoded?.schoolId,
      subdomain,
      mustChangePassword: data.mustChangePassword,
      user: data.user,
    })
  }

  function handleRegistered(info) {
    setPrefill(info)
    setPreLoginView('login')
  }

  function handlePasswordChanged() {
    const saved = loadSession()
    if (saved) saveSession({ ...saved, mustChangePassword: false })
    setAuth((prev) => ({ ...prev, mustChangePassword: false }))
  }

  function handleLogout() {
    const saved = loadSession()
    if (saved?.refreshToken && auth?.token) {
      apiFetch(baseUrl, '/auth/logout', {
        method: 'POST',
        body: { refreshToken: saved.refreshToken },
        token: auth.token,
        subdomain: auth.subdomain,
      }).catch(() => {})
    }
    clearSession()
    setAuth(null)
    setActiveSection('dashboard')
  }

  function handleAvatarUpdated(url) {
    const saved = loadSession()
    if (saved) saveSession({ ...saved, user: { ...saved.user, avatarUrl: url } })
    setAuth((prev) => ({ ...prev, user: { ...prev.user, avatarUrl: url } }))
  }

  // Restore the session on page load
  useEffect(() => {
    const saved = loadSession()
    if (!saved?.refreshToken) { setBooting(false); return }

    apiFetch(baseUrl, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken: saved.refreshToken },
      subdomain: saved.subdomain,
    })
      .then((data) => {
        const decoded = decodeJwt(data.accessToken)
        saveSession({ ...saved, refreshToken: data.refreshToken }) // the backend issues a new one each time
        setAuth({
          token: data.accessToken,
          role: decoded?.role,
          schoolId: decoded?.schoolId,
          subdomain: saved.subdomain,
          mustChangePassword: saved.mustChangePassword,
          user: saved.user,
        })
      })
      .catch(() => clearSession()) // expired or logged out: fall through to the login page
      .finally(() => setBooting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (latestNotification) {
      setUnreadCount((c) => c + 1)
      setActiveToast(latestNotification)
    }
  }, [latestNotification])

  if (booting) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</div>
  }

  if (!auth) {
    if (preLoginView === 'register') {
      return <RegisterSchoolScreen baseUrl={baseUrl} onBack={() => setPreLoginView('login')} onRegistered={handleRegistered} />
    }
    if (preLoginView === 'forgot') {
      return <ForgotPasswordFlow baseUrl={baseUrl} initialSubdomain={forgotSubdomain} onBack={() => setPreLoginView('login')} />
    }
    return (
      <>
        <PrefilledLogin
          baseUrl={baseUrl}
          prefill={prefill}
          onLoggedIn={handleLoggedIn}
          onOpenSettings={() => setShowSettings(true)}
          onGoToRegister={() => setPreLoginView('register')}
          onGoToForgotPassword={(sd) => { setForgotSubdomain(sd); setPreLoginView('forgot') }}
        />
        {showSettings && <SettingsModal baseUrl={baseUrl} onSave={setBaseUrl} onClose={() => setShowSettings(false)} />}
      </>
    )
  }

  if (auth.mustChangePassword) {
    return <ForcedPasswordChange baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} onDone={handlePasswordChanged} />
  }

  return (
     <div className="flex" style={{ backgroundColor: '#F5F6F8', minHeight: '100vh' }}>
      <Sidebar role={auth.role} activeSection={activeSection} onNavigate={setActiveSection} onLogout={handleLogout} />
      <div className="flex-1">
        <Topbar
          activeSection={activeSection}
          userName={auth.user?.fullName}
          avatarUrl={auth.user?.avatarUrl}
          unreadCount={unreadCount}
          onOpenNotifications={() => setActiveSection('notifications')}
        />
        <main className="p-6">
          {activeSection === 'dashboard' && <DashboardHome baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} role={auth.role} schoolId={auth.schoolId} onNavigate={setActiveSection} />}
          {activeSection === 'academic' && <AcademicSetup baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'staff' && <StaffList baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'students' && <StudentsList baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'parents' && <ParentsList baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'scores' && <ScoresResults baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'attendance' && <AttendanceView baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'fees' && <FeesManagement baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'assessments' && <AssessmentsHome baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'events' && <EventsManagement baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'messaging' && <MessagingHome baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'billing' && <BillingHome baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'profile' && (
            <SchoolProfile baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} schoolId={auth.schoolId}
              avatarUrl={auth.user?.avatarUrl} onAvatarUpdated={handleAvatarUpdated} />
          )}
          {activeSection === 'schools' && (
            <SchoolsManagement baseUrl={baseUrl} token={auth.token}
              onViewSchoolErrors={(id, name) => { setErrorFilter({ schoolId: id, schoolName: name }); setActiveSection('errors') }} />
          )}
          {activeSection === 'errors' && (
            <ErrorLogs baseUrl={baseUrl} token={auth.token}
              initialSchoolId={errorFilter.schoolId} initialSchoolName={errorFilter.schoolName}
              onClearSchoolFilter={() => setErrorFilter({ schoolId: null, schoolName: null })} />
          )}
          {activeSection === 'notifications' && (
            <NotificationsPage baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} onUnreadCountChange={setUnreadCount} />
          )}
          {activeSection === 'payments' && <PaymentsView baseUrl={baseUrl} token={auth.token} />}
          {activeSection === 'wallet' && <WalletHome baseUrl={baseUrl} token={auth.token} subdomain={auth.subdomain} />}
          {activeSection === 'announcements' && <AnnouncementsView baseUrl={baseUrl} token={auth.token} />}
        </main>
      </div>
      <Toast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
        onClick={() => { setActiveSection('notifications'); setActiveToast(null) }}
      />
      {showSettings && <SettingsModal baseUrl={baseUrl} onSave={setBaseUrl} onClose={() => setShowSettings(false)} />}
    </div>
  )
}

// Small wrapper so LoginScreen doesn't need to know about the prefill mechanism itself
function PrefilledLogin({ baseUrl, prefill, onLoggedIn, onOpenSettings, onGoToRegister, onGoToForgotPassword }) {
  return (
    <LoginScreenWithPrefill
      baseUrl={baseUrl}
      prefill={prefill}
      onLoggedIn={onLoggedIn}
      onOpenSettings={onOpenSettings}
      onGoToRegister={onGoToRegister}
      onGoToForgotPassword={onGoToForgotPassword}
    />
  )
}

function LoginScreenWithPrefill(props) {
  return (
    <LoginScreen
      key={props.prefill?.subdomain || 'blank'}
      {...props}
      initialSubdomain={props.prefill?.subdomain}
      initialIdentifier={props.prefill?.identifier}
    />
  )
}