// File: d:\Projects\DM-Project\transit-pulse-management-system\src\components\StatusBadge.tsx

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  RotateCcw,
  Wrench,
  Moon,
  CreditCard,
} from 'lucide-react';

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

interface BadgeStyle {
  bg: string;
  text: string;
  ring: string;
  icon: React.ReactNode;
}

// ─── Color & Icon mapping ───────────────────────────────────────────────────

const STATUS_STYLES: Record<string, BadgeStyle> = {
  // ── Green / Success ────────────────────────────────────────────────────────
  active:      { bg: '#ecfdf5', text: '#047857', ring: '#a7f3d0', icon: <CheckCircle2 size={12} className="shrink-0" /> },
  confirmed:   { bg: '#ecfdf5', text: '#047857', ring: '#a7f3d0', icon: <CheckCircle2 size={12} className="shrink-0" /> },
  paid:        { bg: '#ecfdf5', text: '#047857', ring: '#a7f3d0', icon: <CreditCard size={12} className="shrink-0" /> },
  completed:   { bg: '#ecfdf5', text: '#047857', ring: '#a7f3d0', icon: <CheckCircle2 size={12} className="shrink-0" /> },
  available:   { bg: '#ecfdf5', text: '#047857', ring: '#a7f3d0', icon: <CheckCircle2 size={12} className="shrink-0" /> },

  // ── Amber / Warning / Pending ──────────────────────────────────────────────
  maintenance:  { bg: '#fffbeb', text: '#b45309', ring: '#fde68a', icon: <Wrench size={12} className="shrink-0" /> },
  in_progress:  { bg: '#fffbeb', text: '#b45309', ring: '#fde68a', icon: <Clock size={12} className="shrink-0" /> },
  on_trip:      { bg: '#fffbeb', text: '#b45309', ring: '#fde68a', icon: <Clock size={12} className="shrink-0" /> },
  pending:      { bg: '#fffbeb', text: '#b45309', ring: '#fde68a', icon: <Clock size={12} className="shrink-0" /> },
  unpaid:       { bg: '#fffbeb', text: '#b45309', ring: '#fde68a', icon: <AlertCircle size={12} className="shrink-0" /> },

  // ── Red / Danger ───────────────────────────────────────────────────────────
  inactive:    { bg: '#fef2f2', text: '#b91c1c', ring: '#fecaca', icon: <XCircle size={12} className="shrink-0" /> },
  cancelled:   { bg: '#fef2f2', text: '#b91c1c', ring: '#fecaca', icon: <XCircle size={12} className="shrink-0" /> },
  suspended:   { bg: '#fef2f2', text: '#b91c1c', ring: '#fecaca', icon: <XCircle size={12} className="shrink-0" /> },
  failed:      { bg: '#fef2f2', text: '#b91c1c', ring: '#fecaca', icon: <XCircle size={12} className="shrink-0" /> },
  overdue:     { bg: '#fef2f2', text: '#b91c1c', ring: '#fecaca', icon: <AlertCircle size={12} className="shrink-0" /> },

  // ── Blue / Info ────────────────────────────────────────────────────────────
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', ring: '#bfdbfe', icon: <Calendar size={12} className="shrink-0" /> },

  // ── Purple ─────────────────────────────────────────────────────────────────
  refunded:    { bg: '#f5f3ff', text: '#6d28d9', ring: '#ddd6fe', icon: <RotateCcw size={12} className="shrink-0" /> },

  // ── Gray / Neutral ─────────────────────────────────────────────────────────
  off_duty:    { bg: '#f3f4f6', text: '#374151', ring: '#e5e7eb', icon: <Moon size={12} className="shrink-0" /> },
};

const FALLBACK_STYLE: BadgeStyle = {
  bg: '#f3f4f6',
  text: '#374151',
  ring: '#e5e7eb',
  icon: <Clock size={12} className="shrink-0" />,
};

// ─── Component ───────────────────────────────────────────────────────────────

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type: _type }) => {
  const normalised = status.toLowerCase().replace(/[\s-]+/g, '_');
  const style = STATUS_STYLES[normalised] ?? FALLBACK_STYLE;

  return (
    <span
      className="
        inline-flex items-center gap-1.5
        px-2.5 py-1
        rounded-full
        text-xs font-semibold uppercase tracking-wider
        shadow-xs transition-colors
      "
      style={{
        backgroundColor: style.bg,
        color:           style.text,
        boxShadow: `inset 0 0 0 1px ${style.ring}`,
      }}
    >
      {style.icon}
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
};

export default StatusBadge;
