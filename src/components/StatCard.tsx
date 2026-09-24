// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\StatCard.tsx

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type CardColor = 'blue' | 'green' | 'orange' | 'red' | 'purple';

interface StatCardProps {
  /** Card heading label */
  title: string;
  /** Primary metric — the large number or text displayed front-and-centre */
  value: string | number;
  /** lucide-react icon element rendered in the coloured circle */
  icon: React.ReactNode;
  /** Accent colour theme for the card */
  color: CardColor;
  /** Optional secondary text beneath the value */
  subtitle?: string;
  /**
   * Optional trend percentage (positive = improvement, negative = decline).
   * An arrow icon and coloured text are rendered automatically.
   */
  trend?: number;
}

// ─── Colour palette ───────────────────────────────────────────────────────────

interface PaletteEntry {
  /** Card gradient (subtle, used as background) */
  gradient: string;
  /** Accent background for the icon circle */
  iconBg: string;
  /** Icon foreground colour */
  iconColor: string;
  /** Heading text colour */
  titleColor: string;
}

const COLOR_PALETTE: Record<CardColor, PaletteEntry> = {
  blue: {
    gradient:  'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    iconBg:    '#1a5fb4',
    iconColor: '#ffffff',
    titleColor:'#1e40af',
  },
  green: {
    gradient:  'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    iconBg:    '#16a34a',
    iconColor: '#ffffff',
    titleColor:'#166534',
  },
  orange: {
    gradient:  'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    iconBg:    '#e66000',
    iconColor: '#ffffff',
    titleColor:'#9a3412',
  },
  red: {
    gradient:  'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
    iconBg:    '#dc2626',
    iconColor: '#ffffff',
    titleColor:'#991b1b',
  },
  purple: {
    gradient:  'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
    iconBg:    '#7c3aed',
    iconColor: '#ffffff',
    titleColor:'#5b21b6',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * StatCard – dashboard summary card.
 *
 * Displays a metric value, an icon, a title, an optional subtitle, and an
 * optional trend indicator. The gradient background and accent colour are
 * driven by the `color` prop.
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
  trend,
}) => {
  const palette = COLOR_PALETTE[color];

  // Determine trend display
  const hasTrend   = trend !== undefined && trend !== null;
  const trendUp    = hasTrend && (trend as number) >= 0;
  const trendColor = trendUp ? '#16a34a' : '#dc2626';
  const TrendIcon  = trendUp ? TrendingUp : TrendingDown;

  return (
    <div
      className="
        relative rounded-2xl p-5
        flex items-center justify-between gap-4
        shadow-sm
        transition-shadow duration-200 hover:shadow-md
        overflow-hidden
      "
      style={{ background: palette.gradient }}
    >
      {/* ── Text block ── */}
      <div className="flex flex-col gap-0.5 min-w-0">
        {/* Title */}
        <p
          className="text-xs font-semibold uppercase tracking-wider truncate"
          style={{ color: palette.titleColor }}
        >
          {title}
        </p>

        {/* Value */}
        <p className="text-3xl font-bold text-gray-900 leading-tight">
          {value}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}

        {/* Trend */}
        {hasTrend && (
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon size={13} style={{ color: trendColor }} />
            <span className="text-xs font-medium" style={{ color: trendColor }}>
              {Math.abs(trend as number).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400">vs last period</span>
          </div>
        )}
      </div>

      {/* ── Icon circle ── */}
      <div
        className="
          flex items-center justify-center
          w-12 h-12 rounded-full shrink-0
          shadow-sm
        "
        style={{ backgroundColor: palette.iconBg }}
      >
        <span style={{ color: palette.iconColor }}>{icon}</span>
      </div>

      {/* Decorative background circle for depth */}
      <div
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: palette.iconBg }}
      />
    </div>
  );
};

export default StatCard;
