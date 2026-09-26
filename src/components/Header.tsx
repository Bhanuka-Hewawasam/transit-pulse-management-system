// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\Header.tsx

import React, { useState, useEffect } from 'react';
import { Clock, Menu } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  /** The page name displayed as the header title, e.g. 'Dashboard' */
  currentPage: string;
  onOpenMenu: () => void;
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
 * Header – top bar that shows the current page title, live system time,
 * the app version label, and a user avatar. It sits to the right of the
 * 256 px sidebar (ml-64).
 */
const Header: React.FC<HeaderProps> = ({ currentPage, onOpenMenu }) => {
  const [now, setNow] = useState<Date>(new Date());

  // Update the clock every second
  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <header
      className="
        fixed top-0 left-64 right-0 z-20
        h-16 flex items-center justify-between
        px-6 bg-white border-b border-gray-200
        shadow-sm
      "
    >
      {/* ── Left: page title ── */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOpenMenu} aria-label="Open navigation" className="flex h-9 w-9 items-center justify-center rounded text-gray-600 hover:bg-gray-100 md:hidden"><Menu size={19} /></button>
        <h1 className="text-xl font-semibold" style={{ color: '#0f2044' }}>
          {formatPageTitle(currentPage)}
        </h1>
      </div>

      {/* ── Right: clock, version badge, avatar ── */}
      <div className="flex items-center gap-4">
        {/* Live clock */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <Clock size={14} className="shrink-0" />
          <span className="text-sm font-mono tracking-tight">
            {formatDateTime(now)}
          </span>
        </div>

        {/* Version label */}
        <span
          className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: '#f4f6fb', color: '#1a5fb4' }}
        >
          SmartMove TMS v1.0
        </span>

        {/* User avatar */}
        <div
          className="
            flex items-center justify-center
            w-9 h-9 rounded-full
            text-white text-sm font-bold
            select-none cursor-default
            ring-2 ring-offset-1
          "
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
