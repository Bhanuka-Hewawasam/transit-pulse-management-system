// File: d:\Projects\DM-Project\transit-pulse-management-system\src\components\Sidebar.tsx

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
  Search,
  Star,
  X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  page: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  role: 'admin' | 'passenger' | 'driver';
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Navigation Groups Config ────────────────────────────────────────────────

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview & Analytics',
    items: [
      { label: 'Dashboard',        page: 'dashboard',         icon: <LayoutDashboard size={18} /> },
      { label: 'Routes',           page: 'routes',            icon: <MapPin          size={18} /> },
      { label: 'Reports',          page: 'reports',           icon: <BarChart3       size={18} /> },
      { label: 'MongoDB Content',  page: 'mongodb',           icon: <Database        size={18} /> },
      { label: 'Documentation',    page: 'documentation',     icon: <FileText        size={18} /> },
    ],
  },
  {
    title: 'Fleet & Operations',
    items: [
      { label: 'Vehicles',         page: 'vehicles',          icon: <Bus             size={18} /> },
      { label: 'Drivers',          page: 'drivers',           icon: <User            size={18} /> },
      { label: 'Passengers',       page: 'passengers',        icon: <Users           size={18} /> },
      { label: 'Trips',            page: 'trips',             icon: <Calendar        size={18} /> },
      { label: 'Bookings',         page: 'bookings',          icon: <Ticket          size={18} /> },
      { label: 'Payments',         page: 'payments',          icon: <CreditCard      size={18} /> },
      { label: 'Maintenance',      page: 'maintenance',       icon: <Wrench          size={18} /> },
      { label: 'Feedback',         page: 'feedback',          icon: <MessageSquare   size={18} /> },
    ],
  },
];

const PASSENGER_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Passenger Portal',
    items: [
      { label: 'Find a trip',      page: 'find',              icon: <Search          size={18} /> },
      { label: 'My bookings',      page: 'bookings',          icon: <Ticket          size={18} /> },
      { label: 'Trip feedback',    page: 'feedback',          icon: <MessageSquare   size={18} /> },
      { label: 'My profile',       page: 'profile',           icon: <User            size={18} /> },
    ],
  },
];

const DRIVER_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Driver Portal',
    items: [
      { label: 'My trips',         page: 'trips',             icon: <Calendar        size={18} /> },
      { label: 'Assigned vehicle', page: 'vehicle',           icon: <Bus             size={18} /> },
      { label: 'Passenger rating', page: 'feedback',          icon: <Star            size={18} /> },
      { label: 'My profile',       page: 'profile',           icon: <User            size={18} /> },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Sidebar – Clean fixed left vertical nav for SmartMove Transport App.
 * Width is w-64 (256 px). Fixed while content scrolls.
 * Includes app logo, grouped links with subtle dividers, mobile drawer toggle.
 */
const Sidebar: React.FC<SidebarProps> = ({ role, activePage, onNavigate, isOpen, onClose }) => {
  const groups = role === 'admin'
    ? ADMIN_NAV_GROUPS
    : role === 'passenger'
    ? PASSENGER_NAV_GROUPS
    : DRIVER_NAV_GROUPS;

  // Soft and elegant light pastel badges for roles
  const roleBadgeStyles = {
    admin: {
      text: '#4f46e5', // Deep Indigo
      bg: '#eef2ff',   // Soft Indigo Tint
      border: '#c7d2fe'
    },
    passenger: {
      text: '#0d9488', // Deep Teal
      bg: '#f0fdfa',   // Soft Teal Tint
      border: '#99f6e4'
    },
    driver: {
      text: '#d97706', // Deep Amber
      bg: '#fffbeb',   // Soft Amber Tint
      border: '#fde68a'
    }
  }[role];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs transition-opacity md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-64 flex-col z-50 overflow-y-auto border-r border-slate-200/80 shadow-sm transition-transform duration-200 ${
          isOpen ? 'translate-x-0 flex' : '-translate-x-full md:translate-x-0 md:flex'
        }`}
        style={{ backgroundColor: '#ffffff' }} // Clean White Background
        aria-label="Sidebar navigation"
      >
        {/* ── Brand Header ── */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Bus icon in vibrant modern gradient */}
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl shadow-md shadow-indigo-500/20"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}
            >
              <Bus size={20} color="#ffffff" />
            </div>

            {/* Brand text */}
            <div className="leading-tight">
              <span className="block text-lg font-black tracking-tight text-slate-800">
                Smart<span style={{ color: '#4f46e5' }}>Move</span>
              </span>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Transport Solutions
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Role Badge Pill (Light Soft Theme) ── */}
        <div className="px-5 pt-4 pb-2">
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs border"
            style={{
              backgroundColor: roleBadgeStyles.bg,
              borderColor: roleBadgeStyles.border,
            }}
          >
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Access Mode</span>
            <span className="font-extrabold capitalize" style={{ color: roleBadgeStyles.text }}>
              {role} Portal
            </span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-2 space-y-5">
          {groups.map((group, groupIdx) => (
            <div key={group.title ?? groupIdx} className="space-y-1">
              {group.title && (
                <h2 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {group.title}
                </h2>
              )}
              {group.items.map((item) => {
                const isActive = activePage === item.page;

                return (
                  <button
                    key={item.page}
                    onClick={() => {
                      onNavigate(item.page);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 text-left ${
                      isActive
                        ? 'text-indigo-600 shadow-sm border border-indigo-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: '#f5f3ff' } // Soft Light Indigo Background
                        : undefined
                    }
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {/* Icon */}
                    <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>

                    {/* Label */}
                    <span className="flex-1 truncate">{item.label}</span>

                    {/* Active indicator bar */}
                    {isActive && (
                      <span
                        className="w-1.5 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: '#4f46e5' }}
                      />
                    )}
                  </button>
                );
              })}
              {groupIdx < groups.length - 1 && (
                <div className="pt-3 border-b border-slate-100" />
              )}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <p className="text-[11px] font-medium text-center text-slate-400">
            SmartMove TMS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;