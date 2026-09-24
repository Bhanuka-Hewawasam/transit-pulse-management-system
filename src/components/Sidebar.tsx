// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\Sidebar.tsx

import React from 'react';
import {
  LayoutDashboard,
  Bus,
  Users,
  MapPin,
  User,
  Calendar,
  Ticket,
  CreditCard,
  Wrench,
  MessageSquare,
  BarChart3,
  Database,
  FileText,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  page: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

// ─── Navigation config ───────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',        page: 'dashboard',         icon: <LayoutDashboard size={18} /> },
  { label: 'Vehicles',         page: 'vehicles',          icon: <Bus             size={18} /> },
  { label: 'Drivers',          page: 'drivers',           icon: <User            size={18} /> },
  { label: 'Routes',           page: 'routes',            icon: <MapPin          size={18} /> },
  { label: 'Passengers',       page: 'passengers',        icon: <Users           size={18} /> },
  { label: 'Trips',            page: 'trips',             icon: <Calendar        size={18} /> },
  { label: 'Bookings',         page: 'bookings',          icon: <Ticket          size={18} /> },
  { label: 'Payments',         page: 'payments',          icon: <CreditCard      size={18} /> },
  { label: 'Maintenance',      page: 'maintenance',       icon: <Wrench          size={18} /> },
  { label: 'Feedback',         page: 'feedback',          icon: <MessageSquare   size={18} /> },
  { label: 'Reports',          page: 'reports',           icon: <BarChart3       size={18} /> },
  { label: 'MongoDB Content',  page: 'mongodb',           icon: <Database        size={18} /> },
  { label: 'Documentation',    page: 'documentation',     icon: <FileText        size={18} /> },
];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Sidebar – fixed left navigation panel for SmartMove TMS.
 * Width is w-64 (256 px). Remains full-height on all screen sizes.
 */
const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside
      className="fixed top-0 left-0 h-screen w-64 flex flex-col z-30 overflow-y-auto"
      style={{ backgroundColor: '#0f2044' }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        {/* Bus icon in orange accent circle */}
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ backgroundColor: '#e66000' }}
        >
          <Bus size={20} color="#ffffff" />
        </div>

        {/* Brand text */}
        <div className="leading-tight">
          <span className="block text-lg font-bold tracking-wide" style={{ color: '#ffffff' }}>
            Smart<span style={{ color: '#e66000' }}>Move</span>
          </span>
          <span className="block text-[10px] font-medium tracking-widest uppercase" style={{ color: '#7a8db0' }}>
            Transport Solutions
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.page;

          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left',
                isActive
                  ? 'text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white',
              ].join(' ')}
              style={isActive ? { backgroundColor: '#1a5fb4' } : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon */}
              <span className={isActive ? 'text-white' : 'text-gray-400'}>
                {item.icon}
              </span>

              {/* Label */}
              <span>{item.label}</span>

              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-5 rounded-full"
                  style={{ backgroundColor: '#3584e4' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-center" style={{ color: '#4a5a7a' }}>
          SmartMove TMS &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
