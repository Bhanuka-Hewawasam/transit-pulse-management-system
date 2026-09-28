// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\Header.tsx

import React, { useState, useEffect } from 'react';
import { Clock, Menu } from 'lucide-react';
import SearchBar from './SearchBar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  /** The page name displayed as the header title, e.g. 'Dashboard' */
  currentPage: string;
  onOpenMenu: () => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  role: 'admin' | 'passenger' | 'driver';
  onRoleChange: (role: 'admin' | 'passenger' | 'driver') => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable title from a page identifier string.
 * e.g. 'mongodb' → 'MongoDB Content', 'vehicles' → 'Vehicles'
 */
function formatPageTitle(page: string): string {
  const overrides: Record<string, string> = {
    dashboard:     'Dashboard',
    vehicles:      'Vehicles',
    drivers:       'Drivers',
    routes:        'Routes',
    passengers:    'Passengers',
    trips:         'Trips',
    bookings:      'Bookings',
    payments:      'Payments',
    maintenance:   'Maintenance',
    feedback:      'Feedback',
    reports:       'Reports',
    mongodb:       'MongoDB Content',
    documentation: 'Documentation',
  };
  return overrides[page] ?? page.charAt(0).toUpperCase() + page.slice(1);
}

/**
 * Formats a Date object into a readable date/time string.
 * e.g. "Thu, 24 Sep 2026  22:15:04"
 */
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

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Header – shared Admin shell bar with page title, search, role selector,
 * clock, version label and avatar.
 */
const Header: React.FC<HeaderProps> = ({ currentPage, onOpenMenu, searchValue, onSearchValueChange, role, onRoleChange }) => {
  const [now, setNow] = useState<Date>(new Date());

  // Update the clock every second
  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-3 shadow-sm sm:px-5 md:left-64 md:px-6"
    >
      {/* ── Left: page title ── */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button type="button" onClick={onOpenMenu} aria-label="Open navigation" className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700 md:hidden"><Menu size={19} /></button>
        <h1 className="hidden text-lg font-semibold sm:block sm:text-xl" style={{ color: '#0f2044' }}>
          {formatPageTitle(currentPage)}
        </h1>
        <h1 className="text-base font-semibold sm:hidden" style={{ color: '#0f2044' }}>{formatPageTitle(currentPage)}</h1>
      </div>

      <div className="min-w-0 flex-1"><SearchBar value={searchValue} onChange={onSearchValueChange} placeholder={`Search ${formatPageTitle(currentPage).toLowerCase()}…`} className="mx-auto max-w-md" /></div>

      {/* ── Right: role selector, clock, version badge, avatar ── */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <label className="sr-only" htmlFor="header-role-select">Demo role</label>
        <select id="header-role-select" value={role} onChange={(event) => onRoleChange(event.target.value as HeaderProps['role'])} className="w-24 rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:w-auto sm:px-3 sm:text-sm" aria-label="Demo role">
          <option value="admin">Admin demo</option><option value="passenger">Passenger demo</option><option value="driver">Driver demo</option>
        </select>
        <div className="hidden items-center gap-1.5 text-gray-500 xl:flex">
          <Clock size={14} className="shrink-0" />
          <span className="text-xs font-mono">
            {formatDateTime(now)}
          </span>
        </div>

        {/* Version label */}
        <span
          className="hidden 2xl:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: '#f4f6fb', color: '#1a5fb4' }}
        >
          SmartMove TMS v1.0
        </span>

        {/* User avatar */}
        <div
          className="flex h-9 w-9 select-none items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-offset-1"
          style={{ backgroundColor: '#1a5fb4', boxShadow: '0 0 0 2px #3584e4' }}
          title="SmartMove Admin"
        >
          SM
        </div>
      </div>
    </header>
  );
};

export default Header;
