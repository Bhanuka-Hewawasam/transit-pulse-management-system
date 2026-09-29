// File: d:\Projects\DM-Project\transit-pulse-management-system\src\App.tsx

import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header, { type HeaderSelectOption } from './components/Header';
import Dashboard from './pages/Dashboard';
import RoutesPage from './pages/Routes';
import ManagementPage from './pages/ManagementPage';
import Reports from './pages/Reports';
import MongoDBContent from './pages/MongoDBContent';
import Documentation from './pages/Documentation';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';

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
};

function UnavailablePage({ page }: { page: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs">
      <h2 className="text-xl font-semibold text-slate-900">{pageLabels[page] ?? page}</h2>
      <p className="mt-2 text-sm text-slate-500">
        This section is not available.
      </p>
    </section>
  );
}

function App() {
  const pathRole: Role = window.location.pathname === '/passenger'
    ? 'passenger'
    : window.location.pathname === '/driver'
    ? 'driver'
    : 'admin';

  const [role, setRole] = useState<Role>(pathRole);
  const [activePage, setActivePage] = useState('dashboard');
  const [passengerTab, setPassengerTab] = useState<'find' | 'bookings' | 'feedback' | 'profile'>('find');
  const [driverTab, setDriverTab] = useState<'trips' | 'vehicle' | 'feedback' | 'profile'>('trips');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [applicationMode, setApplicationMode] = useState<'oracle' | 'demo' | null>(null);

  // Shared select props passed from Passenger/Driver dashboards up to Top Bar Header
  const [headerSelectProps, setHeaderSelectProps] = useState<{
    value: string;
    onChange: (value: string) => void;
    options: HeaderSelectOption[];
    placeholder: string;
    ariaLabel: string;
    selectedName?: string;
  } | undefined>(undefined);

  const switchRole = (nextRole: Role) => {
    setRole(nextRole);
    setHeaderSelectProps(undefined);
    window.history.pushState({}, '', nextRole === 'admin' ? '/admin' : `/${nextRole}`);
  };

  const navigateTo = (page: string) => {
    if (role === 'passenger') {
      setPassengerTab(page as typeof passengerTab);
    } else if (role === 'driver') {
      setDriverTab(page as typeof driverTab);
    } else {
      setActivePage(page);
    }
    setHeaderSearch('');
  };

  const renderPageContent = () => {
    if (role === 'passenger') {
      return (
        <PassengerDashboard
          inSharedLayout={true}
          activeTab={passengerTab}
          onTabChange={setPassengerTab}
          onSelectPropsChange={setHeaderSelectProps}
          onModeChange={setApplicationMode}
        />
      );
    }

    if (role === 'driver') {
      return (
        <DriverDashboard
          inSharedLayout={true}
          activeTab={driverTab}
          onTabChange={setDriverTab}
          onSelectPropsChange={setHeaderSelectProps}
          onModeChange={setApplicationMode}
        />
      );
    }

    if (activePage === 'dashboard') return <Dashboard />;
    if (activePage === 'routes') return <RoutesPage searchValue={headerSearch} onSearchValueChange={setHeaderSearch} />;
    if (['vehicles', 'drivers', 'passengers', 'trips', 'bookings', 'payments', 'maintenance', 'feedback'].includes(activePage)) {
      return <ManagementPage key={activePage} page={activePage} searchValue={headerSearch} onSearchValueChange={setHeaderSearch} />;
    }
    if (activePage === 'reports') return <Reports />;
    if (activePage === 'mongodb') return <MongoDBContent searchValue={headerSearch} onSearchValueChange={setHeaderSearch} />;
    if (activePage === 'documentation') return <Documentation />;
    return <UnavailablePage page={activePage} />;
  };

  const currentNavPage = role === 'passenger' ? passengerTab : role === 'driver' ? driverTab : activePage;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* Shared Sidebar */}
      <Sidebar
        role={role}
        activePage={currentNavPage}
        onNavigate={navigateTo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Shared Header Top Bar */}
      <Header
        currentPage={currentNavPage}
        onOpenMenu={() => setSidebarOpen(true)}
        searchValue={headerSearch}
        onSearchValueChange={setHeaderSearch}
        role={role}
        onRoleChange={switchRole}
        mode={applicationMode}
        selectProps={role !== 'admin' ? headerSelectProps : undefined}
      />

      {/* Main Content Area */}
      <main className="ml-0 pt-16 md:ml-64">
        <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
          {renderPageContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
