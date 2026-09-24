// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\StatusBadge.tsx

import React from 'react';
import { AlertCircle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type BadgeType =
  | 'vehicle'
  | 'driver'
  | 'trip'
  | 'booking'
  | 'payment'
  | 'maintenance'
  | 'general';

interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
}

// ─── Color mapping ────────────────────────────────────────────────────────────

/**
 * Describes the visual style of a badge variant.
 */
interface BadgeStyle {
  bg: string;
  text: string;
  ring: string;
  showIcon?: boolean; // show an exclamation icon (overdue, etc.)
}

/**
 * Maps a normalised status string to its badge style.
 * The key is the lowercase/underscore form of the status value.
 */
const STATUS_STYLES: Record<string, BadgeStyle> = {
  // ── Green ──────────────────────────────────────────────────────────────────
  active:      { bg: '#dcfce7', text: '#166534', ring: '#bbf7d0' },
  confirmed:   { bg: '#dcfce7', text: '#166534', ring: '#bbf7d0' },
  paid:        { bg: '#dcfce7', text: '#166534', ring: '#bbf7d0' },
  completed:   { bg: '#dcfce7', text: '#166534', ring: '#bbf7d0' },
  available:   { bg: '#dcfce7', text: '#166534', ring: '#bbf7d0' },

  // ── Amber / Yellow ─────────────────────────────────────────────────────────
  maintenance:  { bg: '#fef9c3', text: '#854d0e', ring: '#fef08a' },
  in_progress:  { bg: '#fef9c3', text: '#854d0e', ring: '#fef08a' },
  on_trip:      { bg: '#fef9c3', text: '#854d0e', ring: '#fef08a' },
  pending:      { bg: '#fef9c3', text: '#854d0e', ring: '#fef08a' },

  // ── Red ────────────────────────────────────────────────────────────────────
  inactive:    { bg: '#fee2e2', text: '#991b1b', ring: '#fecaca' },
  cancelled:   { bg: '#fee2e2', text: '#991b1b', ring: '#fecaca' },
  suspended:   { bg: '#fee2e2', text: '#991b1b', ring: '#fecaca' },
  failed:      { bg: '#fee2e2', text: '#991b1b', ring: '#fecaca' },

  // ── Red + icon ─────────────────────────────────────────────────────────────
  overdue:     { bg: '#fee2e2', text: '#991b1b', ring: '#fecaca', showIcon: true },

  // ── Blue ───────────────────────────────────────────────────────────────────
  scheduled:   { bg: '#dbeafe', text: '#1e40af', ring: '#bfdbfe' },

  // ── Purple ─────────────────────────────────────────────────────────────────
  refunded:    { bg: '#ede9fe', text: '#5b21b6', ring: '#ddd6fe' },

  // ── Gray ───────────────────────────────────────────────────────────────────
  off_duty:    { bg: '#f3f4f6', text: '#374151', ring: '#e5e7eb' },
};

/** Fallback style for unknown statuses */
const FALLBACK_STYLE: BadgeStyle = {
  bg: '#f3f4f6',
  text: '#374151',
  ring: '#e5e7eb',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * StatusBadge – renders a pill badge whose colour is determined by the
 * status value. The optional `type` prop is reserved for future per-domain
 * overrides but the colour lookup is status-driven today.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type: _type }) => {
  // Normalise: lowercase + replace spaces/hyphens with underscores
  const normalised = status.toLowerCase().replace(/[\s-]+/g, '_');
  const style = STATUS_STYLES[normalised] ?? FALLBACK_STYLE;

  return (
    <span
      className="
        inline-flex items-center gap-1
        px-2.5 py-0.5
        rounded-full
        text-xs font-medium uppercase tracking-wide
        ring-1 ring-inset
      "
      style={{
        backgroundColor: style.bg,
        color:           style.text,
        // Tailwind ring-1 ring-inset colours need to be set inline because
        // we are using arbitrary hex values.
        boxShadow: `inset 0 0 0 1px ${style.ring}`,
      }}
    >
      {style.showIcon && (
        <AlertCircle size={11} className="shrink-0" />
      )}
      {/* Display original status with underscores swapped for spaces */}
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
