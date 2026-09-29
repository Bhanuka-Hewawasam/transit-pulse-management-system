// File: d:\Projects\DM-Project\transit-pulse-management-system\src\components\Header.tsx

import React, { useState, useEffect } from 'react';
import { Clock, Menu } from 'lucide-react';
import SearchBar from './SearchBar';
import SearchableSelect from './SearchableSelect';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HeaderSelectOption {
  value: string;
  label: string;
  secondaryLabel?: string;
  initials?: string;
}

interface HeaderProps {
  currentPage: string;
  onOpenMenu: () => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  role: 'admin' | 'passenger' | 'driver';
  onRoleChange: (role: 'admin' | 'passenger' | 'driver') => void;
  mode?: 'oracle' | 'demo' | null;
  selectProps?: {
    value: string;
    onChange: (value: string) => void;
    options: HeaderSelectOption[];
    placeholder: string;
    ariaLabel: string;
    selectedName?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPageTitle(page: string, role: 'admin' | 'passenger' | 'driver'): string {
  if (role === 'passenger') {
    const map: Record<string, string> = {
      find: 'Find a Trip',
      bookings: 'My Bookings',
      feedback: 'Trip Feedback',
      profile: 'My Profile',
    };
    return map[page] ?? 'Passenger Dashboard';
  }
  if (role === 'driver') {
    const map: Record<string, string> = {
      trips: 'My Trips',
      vehicle: 'Assigned Vehicle',
      feedback: 'Passenger Rating',
      profile: 'Driver Profile',
    };
    return map[page] ?? 'Driver Dashboard';
  }

  const overrides: Record<string, string> = {
    dashboard:     'Dashboard Overview',
    vehicles:      'Vehicles Management',
    drivers:       'Drivers Directory',
    routes:        'Transit Routes',
    passengers:    'Passengers Directory',
    trips:         'Scheduled Trips',
    bookings:      'Passenger Bookings',
    payments:      'Payment History',
    maintenance:   'Fleet Maintenance',
    feedback:      'Feedback & Ratings',
    reports:       'System Reports',
    mongodb:       'MongoDB Content',
    documentation: 'Documentation & API',
  };
  return overrides[page] ?? page.charAt(0).toUpperCase() + page.slice(1);
}

function formatDateTime(date: Date): string {
  const dayNames  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName  = dayNames[date.getDay()];
  const day      = String(date.getDate()).padStart(2, '0');
  const month    = monthNames[date.getMonth()];
  const year     = date.getFullYear();
  const hh       = String(date.getHours()).padStart(2, '0');
  const mm       = String(date.getMinutes()).padStart(2, '0');
  const ss       = String(date.getSeconds()).padStart(2, '0');

  return `${dayName}, ${day} ${month} ${year}  ${hh}:${mm}:${ss}`;
}

function getInitials(name?: string): string {
  if (!name) return 'SM';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Header – Shared top bar across Admin, Passenger, and Driver roles.
 * Includes page title, search, role switcher, SearchableSelect slot for acting passenger/driver,
 * mode status pill, live clock, and user avatar.
 */
const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMenu,
  searchValue,
  onSearchValueChange,
  role,
  onRoleChange,
  mode,
  selectProps,
}) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const initials = getInitials(selectProps?.selectedName);

  return (
    <header
      className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6 md:left-64"
      style={{ height: '64px' }}
    >
      {/* ── Left: hamburger & page title ── */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 md:hidden"
        >
          <Menu size={19} />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg" style={{ color: '#0f2044' }}>
            {formatPageTitle(currentPage, role)}
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">
            SmartMove Transport System
          </p>
        </div>
      </div>

      {/* ── Middle: Search bar (admin mode or optional) ── */}
      {role === 'admin' && (
        <div className="hidden min-w-0 flex-1 max-w-sm lg:block">
          <SearchBar
            value={searchValue}
            onChange={onSearchValueChange}
            placeholder={`Search ${formatPageTitle(currentPage, role).toLowerCase()}…`}
          />
        </div>
      )}

      {/* ── Right: SearchableSelect, Role switcher, Mode Badge, Clock, User Avatar ── */}
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        {/* Mode indicator pill */}
        {mode && (
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider sm:inline-flex ${
              mode === 'oracle'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            }`}
            role="status"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${mode === 'oracle' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            {mode} mode
          </span>
        )}

        {/* Passenger / Driver SearchableSelect when active */}
        {selectProps && (
          <div className="w-44 sm:w-56 lg:w-64">
            <SearchableSelect
              value={selectProps.value}
              onChange={(val) => selectProps.onChange(String(val))}
              options={selectProps.options}
              placeholder={selectProps.placeholder}
              ariaLabel={selectProps.ariaLabel}
            />
          </div>
        )}

        {/* Role selector dropdown */}
        <div className="relative">
          <label className="sr-only" htmlFor="header-role-select">Demo role</label>
          <select
            id="header-role-select"
            value={role}
            onChange={(event) => onRoleChange(event.target.value as HeaderProps['role'])}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-all hover:bg-white hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:px-3 sm:text-sm"
            aria-label="Demo role"
          >
            <option value="admin">Admin Portal</option>
            <option value="passenger">Passenger Portal</option>
            <option value="driver">Driver Portal</option>
          </select>
        </div>

        {/* Clock */}
        <div className="hidden items-center gap-1.5 text-slate-500 xl:flex">
          <Clock size={14} className="shrink-0" />
          <span className="text-xs font-mono text-slate-600">
            {formatDateTime(now)}
          </span>
        </div>

        {/* User avatar with initials */}
        <div
          className="flex h-9 w-9 select-none items-center justify-center rounded-full text-xs font-bold text-white shadow-xs ring-2 ring-offset-1 transition-transform hover:scale-105"
          style={{ backgroundColor: '#1a5fb4', boxShadow: '0 0 0 2px #3584e4' }}
          title={selectProps?.selectedName ? `${selectProps.selectedName} (${role})` : `SmartMove User (${role})`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Header;
