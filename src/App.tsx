import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import RoutesPage from './pages/Routes'
import ManagementPage from './pages/ManagementPage'
import Reports from './pages/Reports'
import MongoDBContent from './pages/MongoDBContent'
import Documentation from './pages/Documentation'
import PassengerDashboard from './pages/PassengerDashboard'
import DriverDashboard from './pages/DriverDashboard'

type Role = 'admin' | 'passenger' | 'driver';

const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  routes: 'Routes',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  passengers: 'Passengers',
  trips: 'Trips',
  bookings: 'Bookings',
  payments: 'Payments',
  maintenance: 'Maintenance',
  feedback: 'Feedback',
  reports: 'Reports',
  mongodb: 'MongoDB Content',
  documentation: 'Documentation',
}

function UnavailablePage({ page }: { page: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">{pageLabels[page] ?? page}</h2>
      <p className="mt-2 text-sm text-gray-500">
          This section is not available.
      </p>
    </section>
  )
}

function App() {
  const pathRole: Role = window.location.pathname === '/passenger' ? 'passenger' : window.location.pathname === '/driver' ? 'driver' : 'admin';
  const [role, setRole] = useState<Role>(pathRole);
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const switchRole = (nextRole: Role) => {
    setRole(nextRole);
    window.history.pushState({}, '', nextRole === 'admin' ? '/admin' : `/${nextRole}`);
  };

  const renderPage = () => {
    if (activePage === 'dashboard') return <Dashboard />
    if (activePage === 'routes') return <RoutesPage />
    if (['vehicles', 'drivers', 'passengers', 'trips', 'bookings', 'payments', 'maintenance', 'feedback'].includes(activePage)) {
      return <ManagementPage key={activePage} page={activePage} />
    }
    if (activePage === 'reports') return <Reports />
    if (activePage === 'mongodb') return <MongoDBContent />
    if (activePage === 'documentation') return <Documentation />
    return <UnavailablePage page={activePage} />
  }

  if (role === 'passenger') return <><div className="fixed right-4 top-4 z-50"><select value={role} onChange={(event) => switchRole(event.target.value as Role)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm" aria-label="Demo role"><option value="admin">Admin demo</option><option value="passenger">Passenger demo</option><option value="driver">Driver demo</option></select></div><main className="min-h-screen bg-gray-50 px-6 py-8"><div className="mx-auto max-w-screen-xl"><PassengerDashboard /></div></main></>;
  if (role === 'driver') return <><div className="fixed right-4 top-4 z-50"><select value={role} onChange={(event) => switchRole(event.target.value as Role)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm" aria-label="Demo role"><option value="admin">Admin demo</option><option value="passenger">Passenger demo</option><option value="driver">Driver demo</option></select></div><main className="min-h-screen bg-gray-50 px-6 py-8"><div className="mx-auto max-w-screen-xl"><DriverDashboard /></div></main></>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={setActivePage} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header currentPage={activePage} onOpenMenu={() => setSidebarOpen(true)} />
      <main className="ml-0 pt-16 md:ml-64">
        <div className="mx-auto max-w-screen-xl px-6 py-6"><div className="mb-4 flex justify-end"><select value={role} onChange={(event) => switchRole(event.target.value as Role)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" aria-label="Demo role"><option value="admin">Admin demo</option><option value="passenger">Passenger demo</option><option value="driver">Driver demo</option></select></div>{renderPage()}</div>
      </main>
    </div>
  )
}

export default App
