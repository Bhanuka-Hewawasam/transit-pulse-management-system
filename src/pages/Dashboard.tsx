// ============================================================
// SmartMove Transport Solutions
// File: src/pages/Dashboard.tsx
//
// Operations Dashboard showing:
//  - Welcome banner with today's date & fleet summary
//  - 5 primary summary StatCards (Vehicles, Drivers, Active Trips, Today's Bookings, Revenue)
//  - Quick stats metrics bar
//  - Interactive Recharts analytics (Route Usage & Fleet Status)
//  - Recent Bookings table (last 5)
//  - Maintenance Alerts section
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bus,
  Users,
  CalendarClock,
  BookOpen,
  BadgeDollarSign,
  AlertTriangle,
  MapPin,
  Clock,
  RefreshCw,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
  Calendar,
  Wrench,
  CheckCircle2,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { ApiError, apiGet } from '../services/api';

// Components
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import DatabaseStatusCard from '../components/DatabaseStatusCard';
import type { Column } from '../components/DataTable';

// Types
import type { Booking, Driver, MaintenanceRecord, Passenger, Payment, Route, Trip, Vehicle } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format an ISO date-time string into a readable local date. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Format a number as Sri Lankan Rupees (LKR). */
function formatCurrency(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK')}`;
}

/** Return a nice label for today's date. */
function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Column definitions ───────────────────────────────────────────────────────

const bookingColumns: Column<Booking>[] = [
  {
    key: 'id',
    label: '#',
    render: (row) => (
      <span className="font-mono text-xs font-semibold text-gray-500">#{row.id}</span>
    ),
  },
  {
    key: 'passengerName',
    label: 'Passenger',
    render: (row) => (
      <span className="font-semibold text-gray-900">{row.passengerName ?? '—'}</span>
    ),
  },
  {
    key: 'routeCode',
    label: 'Route',
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-bold text-blue-700 text-xs">{row.routeCode}</span>
        <span className="text-gray-500 text-xs font-medium">
          {row.origin} → {row.destination}
        </span>
      </div>
    ),
  },
  {
    key: 'departureTime',
    label: 'Departure',
    render: (row) => (
      <span className="text-xs font-medium text-gray-600">
        {row.departureTime ? formatDate(row.departureTime) : '—'}
      </span>
    ),
  },
  {
    key: 'amount',
    label: 'Amount',
    render: (row) => (
      <span className="font-semibold text-emerald-700">
        {formatCurrency(row.amount)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.status} type="booking" />,
  },
];

// ─── Custom Recharts Tooltip ─────────────────────────────────────────

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-900/95 px-3.5 py-2.5 shadow-xl text-white text-xs backdrop-blur-md">
        <p className="font-bold text-gray-200 mb-1">{label || payload[0].name}</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color || payload[0].fill || '#3584e4' }} />
          <span className="text-gray-300">{payload[0].name || 'Bookings'}:</span>
          <span className="font-bold text-white">{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

// ─── Component ───────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [applicationMode, setApplicationMode] = useState<'oracle' | 'demo' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<Vehicle[]>('/vehicles'), apiGet<Driver[]>('/drivers'), apiGet<Passenger[]>('/passengers'),
      apiGet<Route[]>('/routes'), apiGet<Trip[]>('/trips'), apiGet<Booking[]>('/bookings'),
      apiGet<Payment[]>('/payments'), apiGet<MaintenanceRecord[]>('/maintenance'),
      apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases'),
    ]).then(async ([vehicleRows, driverRows, passengerRows, routeRows, tripRows, bookingRows, paymentRows, maintenanceRows, health]) => {
      let revenueTotal: number | null = null;
      if (health.mode === 'demo') {
        revenueTotal = await apiGet<{ revenue: number }[]>('/reports/revenue')
          .then((rows) => rows.reduce((sum, row) => sum + Number(row.revenue), 0))
          .catch(() => null);
      }
      if (!active) return;
      setVehicles(vehicleRows); setDrivers(driverRows); setPassengers(passengerRows); setRoutes(routeRows);
      setTrips(tripRows); setBookings(bookingRows); setPayments(paymentRows); setMaintenanceRecords(maintenanceRows);
      setApplicationMode(health.mode); setRevenue(revenueTotal);
    }).catch((requestError: Error) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);

  // ── Computed summary stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const upcomingTrips = trips.filter((trip) => trip.status === 'scheduled').length;
    const maintenanceAlerts = maintenanceRecords.filter(
      (m) => m.status === 'overdue' || m.status === 'in_progress',
    ).length;

    return {
      totalVehicles,
      totalDrivers: drivers.length,
      totalPassengers: passengers.length,
      totalTrips: trips.length,
      totalBookings: bookings.length,
      todayBookings: bookings.filter((booking) => new Date(booking.bookingDate ?? '').toDateString() === new Date().toDateString()).length,
      activeTrips: trips.filter((trip) => trip.status === 'in_progress').length,
      upcomingTrips,
      totalRevenue: revenue,
      maintenanceAlerts,
    };
  }, [vehicles, drivers, passengers, trips, bookings, revenue, maintenanceRecords]);

  const joinedBookings = useMemo(() => bookings.map((booking) => {
    const passenger = passengers.find((item) => item.id === booking.passengerId);
    const trip = trips.find((item) => item.id === booking.tripId);
    const route = routes.find((item) => item.id === trip?.routeId);
    return {
      ...booking,
      passengerName: passenger ? `${passenger.firstName} ${passenger.lastName}` : `Passenger #${booking.passengerId}`,
      routeCode: route?.routeCode ?? `Route #${trip?.routeId ?? '—'}`,
      origin: route?.origin,
      destination: route?.destination,
      departureTime: trip?.departureTime ?? booking.departureTime,
    };
  }), [bookings, passengers, routes, trips]);

  // ── Recent bookings: last 5 by id desc ─────────────────────────────────────
  const recentBookings = useMemo(
    () => [...joinedBookings].sort((a, b) => b.id - a.id).slice(0, 5),
    [joinedBookings],
  );

  // ── Maintenance alerts (overdue / in_progress) ─────────────────────────────
  const alertRecords = useMemo(
    () =>
      maintenanceRecords.filter(
        (m) => m.status === 'overdue' || m.status === 'in_progress',
      ),
    [maintenanceRecords],
  );

  // ── Route usage chart data ─────────────────────────────────────────────────
  const routeUsageChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    joinedBookings.forEach((b) => {
      if (b.routeCode) {
        counts[b.routeCode] = (counts[b.routeCode] ?? 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([code, count]) => ({ route: code, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6);
  }, [joinedBookings]);

  // ── Vehicle Status Donut Chart data ────────────────────────────────────────
  const fleetStatusChartData = useMemo(() => {
    const activeCount = vehicles.filter((v) => v.status === 'active').length;
    const maintenanceCount = vehicles.filter((v) => v.status === 'maintenance').length;
    const inactiveCount = vehicles.filter((v) => v.status === 'inactive').length;

    return [
      { name: 'Active', value: activeCount, color: '#16a34a' },
      { name: 'Maintenance', value: maintenanceCount, color: '#e66000' },
      { name: 'Inactive', value: inactiveCount, color: '#dc2626' },
    ].filter((item) => item.value > 0);
  }, [vehicles]);

  // ── Maintenance alert colour helper ────────────────────────────────────────
  function alertBgStyle(status: MaintenanceRecord['status']): string {
    if (status === 'overdue') return 'bg-rose-50/70 border-rose-200';
    if (status === 'in_progress') return 'bg-amber-50/70 border-amber-200';
    return 'bg-gray-50 border-gray-200';
  }

  function alertIconColor(status: MaintenanceRecord['status']): string {
    if (status === 'overdue') return 'text-rose-600';
    if (status === 'in_progress') return 'text-amber-600';
    return 'text-gray-400';
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Top Bar: Database Mode & Manual Refresh ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: applicationMode === 'oracle' ? '#16a34a' : applicationMode === 'demo' ? '#3584e4' : '#e66000' }} />
          <p className="text-xs font-semibold text-gray-700" role="status">
            Mode: <span className="uppercase text-gray-900 font-bold">{applicationMode === 'oracle' ? 'Oracle Connected' : applicationMode === 'demo' ? 'Demo Mode' : 'Checking'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setError(null); setLoading(true); setReload((current) => current + 1); }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs transition-all hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-blue-700' : 'text-gray-500'} />
          Refresh Data
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm font-medium text-blue-800 flex items-center gap-3">
          <RefreshCw size={16} className="animate-spin text-blue-600 shrink-0" />
          Updating dashboard metrics and fleet data…
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-xs">
          <p className="font-semibold">Unable to load dashboard data: {error.message}</p>
          {error instanceof ApiError && (
            <details className="mt-1.5 text-xs font-mono text-rose-700">
              <summary className="cursor-pointer font-sans font-medium hover:underline">Technical details</summary>
              <code className="block mt-1 p-2 rounded bg-rose-100/60">{error.technicalMessage}</code>
            </details>
          )}
        </div>
      )}

      <DatabaseStatusCard />

      {/* ── Welcome Hero Banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-blue-900/20 px-6 py-6 text-white shadow-md sm:px-8"
        style={{
          background: 'linear-gradient(135deg, #0f2044 0%, #1a3a6e 55%, #1e4d8c 100%)',
        }}
      >
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-200 backdrop-blur-md">
              <Activity size={12} className="text-orange-400" /> SmartMove Operations Centre
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, Admin 👋
            </h1>
            <p className="mt-1 text-sm font-medium text-blue-200">
              {todayLabel()} — System status operational
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: '#e66000' }}>
              <Bus size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Active Fleet</p>
              <p className="text-xl font-bold text-white">
                {vehicles.filter((v) => v.status === 'active').length}
                <span className="text-sm font-normal text-blue-200"> / {vehicles.length} vehicles</span>
              </p>
            </div>
          </div>
        </div>
        {/* Subtle decorative SVG circles */}
        <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-32 -top-12 h-36 w-36 rounded-full bg-blue-400/10 pointer-events-none" />
      </div>

      {/* ── Requirement 1: Primary Summary StatCards (5 Cards in Row) ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Key Performance Metrics
          </h2>
          <span className="text-xs text-gray-400">Real-time database state</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Total Vehicles"
            value={stats.totalVehicles}
            icon={<Bus size={22} />}
            color="blue"
            subtitle={`${vehicles.filter((v) => v.status === 'active').length} currently active`}
          />
          <StatCard
            title="Total Drivers"
            value={stats.totalDrivers}
            icon={<Users size={22} />}
            color="green"
            subtitle={`${drivers.filter((driver) => driver.status === 'available').length} available`}
          />
          <StatCard
            title="Active Trips"
            value={stats.activeTrips}
            icon={<CalendarClock size={22} />}
            color="orange"
            subtitle="Currently in progress"
          />
          <StatCard
            title="Today's Bookings"
            value={stats.todayBookings}
            icon={<BookOpen size={22} />}
            color="purple"
            subtitle={`${bookings.filter((b) => b.status === 'confirmed').length} confirmed overall`}
          />
          <StatCard
            title="Total Revenue"
            value={stats.totalRevenue === null ? 'Unavailable' : formatCurrency(stats.totalRevenue)}
            icon={<BadgeDollarSign size={22} />}
            color="green"
            subtitle={stats.totalRevenue === null ? 'Oracle mode report pending' : 'Total paid bookings'}
          />
        </div>

        {/* Mini stats row */}
        <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Registered Passengers', value: stats.totalPassengers, icon: <Users size={14} className="text-blue-600" /> },
            { label: 'Scheduled & Past Trips', value: stats.totalTrips, icon: <Calendar size={14} className="text-emerald-600" /> },
            { label: 'All Booking Orders', value: stats.totalBookings, icon: <BookOpen size={14} className="text-purple-600" /> },
            { label: 'Active Maintenance Alerts', value: stats.maintenanceAlerts, icon: <Wrench size={14} className="text-amber-600" /> },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs hover:border-gray-300 transition-all">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 truncate">{item.label}</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Requirement 1: Recharts Analytics Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Bookings Bar Chart (2 cols) */}
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" /> Route Usage Analytics
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Top routes ranked by total passenger bookings</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {routeUsageChartData.length} active routes
            </span>
          </div>
          <div className="h-64 w-full">
            {routeUsageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeUsageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="route" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="bookings" radius={[6, 6, 0, 0]} fill="#1a5fb4">
                    {routeUsageChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#1a5fb4' : index === 1 ? '#3584e4' : '#e66000'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-gray-400">
                <MapPin size={32} strokeWidth={1.5} />
                <p className="mt-2 text-xs">No route usage data available.</p>
              </div>
            )}
          </div>
        </section>

        {/* Fleet Distribution Donut Chart (1 col) */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-2 border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PieChartIcon size={18} className="text-orange-500" /> Fleet Distribution
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Vehicle operational status breakdown</p>
          </div>
          <div className="relative h-52 w-full flex items-center justify-center">
            {fleetStatusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {fleetStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400">No fleet records found.</p>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">{vehicles.length}</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Vehicles</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
            <div>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Active</p>
              <p className="text-sm font-bold text-gray-900">{vehicles.filter((v) => v.status === 'active').length}</p>
            </div>
            <div>
              <span className="inline-block h-2 w-2 rounded-full bg-amber-600" />
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Maint.</p>
              <p className="text-sm font-bold text-gray-900">{vehicles.filter((v) => v.status === 'maintenance').length}</p>
            </div>
            <div>
              <span className="inline-block h-2 w-2 rounded-full bg-rose-600" />
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Inactive</p>
              <p className="text-sm font-bold text-gray-900">{vehicles.filter((v) => v.status === 'inactive').length}</p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Main Operations Grid: Recent Bookings & Maintenance ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Bookings (2 cols on xl) */}
        <section className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Passenger Bookings</h2>
              <p className="text-xs text-gray-500">Latest 5 reservations created in the system</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
              {bookings.length} total bookings
            </span>
          </div>
          <div className="p-0">
            <DataTable<Booking>
              columns={bookingColumns}
              data={recentBookings}
              loading={loading}
              emptyMessage="No recent bookings found."
            />
          </div>
        </section>

        {/* Maintenance Alerts (1 col on xl) */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-base font-bold text-gray-900">Maintenance Alerts</h2>
              <p className="text-xs text-gray-500">Overdue or active service jobs</p>
            </div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
            >
              {alertRecords.length} issue{alertRecords.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-96">
            {alertRecords.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                <CheckCircle2 size={32} className="text-emerald-500 stroke-[1.5]" />
                <p className="font-semibold text-gray-700">All fleet maintenance up to date!</p>
                <p className="text-xs text-gray-400">No overdue or in-progress alerts.</p>
              </div>
            ) : (
              alertRecords.map((record) => (
                <div
                  key={record.id}
                  className={`mx-3 my-2.5 px-3.5 py-3 rounded-xl border transition-all ${alertBgStyle(record.status)}`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      size={16}
                      className={`mt-0.5 shrink-0 ${alertIconColor(record.status)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {record.vehicleReg ?? vehicles.find((vehicle) => vehicle.id === record.vehicleId)?.registrationNumber ?? `Vehicle #${record.vehicleId}`}
                        </p>
                        <StatusBadge status={record.status} type="maintenance" />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                        {record.description}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-black/5 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={12} className="text-gray-400" />
                          Due: {formatDate(record.scheduledDate)}
                        </span>
                        {record.cost && <span className="font-semibold text-gray-700">{formatCurrency(record.cost)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
