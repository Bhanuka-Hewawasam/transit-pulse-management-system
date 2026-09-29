// ============================================================
// SmartMove Transport Solutions
// File: src/pages/Dashboard.tsx
//
// Full dashboard page showing:
//  - Welcome banner with today's date
//  - 6 summary StatCards
//  - Recent Bookings table (last 5)
//  - Maintenance Alerts section
//  - Route Usage bar chart (CSS-only, no chart library)
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
} from 'lucide-react';

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
      <span className="font-mono text-xs text-gray-500">#{row.id}</span>
    ),
  },
  {
    key: 'passengerName',
    label: 'Passenger',
    render: (row) => (
      <span className="font-medium text-gray-800">{row.passengerName ?? '—'}</span>
    ),
  },
  {
    key: 'routeCode',
    label: 'Route',
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-semibold text-blue-700 text-xs">{row.routeCode}</span>
        <span className="text-gray-500 text-xs">
          {row.origin} → {row.destination}
        </span>
      </div>
    ),
  },
  {
    key: 'departureTime',
    label: 'Departure',
    render: (row) => (
      <span className="text-xs text-gray-600">
        {row.departureTime ? formatDate(row.departureTime) : '—'}
      </span>
    ),
  },
  {
    key: 'amount',
    label: 'Amount',
    render: (row) => (
      <span className="font-semibold text-green-700">
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

  // ── Route usage: count bookings per routeCode ──────────────────────────────
  const routeUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    joinedBookings.forEach((b) => {
      if (b.routeCode) {
        counts[b.routeCode] = (counts[b.routeCode] ?? 0) + 1;
      }
    });

    // Sort descending by count
    return Object.entries(counts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [joinedBookings]);

  // Find max count for bar width normalisation
  const maxRouteCount = routeUsage.length > 0 ? routeUsage[0].count : 1;

  // ── Maintenance alert colour helper ────────────────────────────────────────
  function alertBgStyle(status: MaintenanceRecord['status']): string {
    if (status === 'overdue') return 'bg-red-50 border-red-200';
    if (status === 'in_progress') return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-200';
  }

  function alertIconColor(status: MaintenanceRecord['status']): string {
    if (status === 'overdue') return 'text-red-500';
    if (status === 'in_progress') return 'text-yellow-500';
    return 'text-gray-400';
  }

  // ── Bar colour (cycling through a palette) ─────────────────────────────────
  const barColors = [
    '#1d4ed8', // blue-700
    '#15803d', // green-700
    '#b45309', // amber-700
    '#7c3aed', // purple-700
    '#be123c', // rose-700
    '#0f766e', // teal-700
    '#c2410c', // orange-700
    '#1e40af', // blue-800
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-xl space-y-7 px-4 py-6 sm:px-6">
        {loading && <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">Loading dashboard data…</div>}
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><p>Unable to load dashboard data: {error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600" role="status">Application mode: <strong>{applicationMode === 'oracle' ? 'Oracle' : applicationMode === 'demo' ? 'Demo' : 'Checking'}</strong></p>
          <button type="button" onClick={() => { setError(null); setLoading(true); setReload((current) => current + 1); }} disabled={loading} className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"><RefreshCw size={15} />Refresh</button>
        </div>
        <DatabaseStatusCard />

        {/* ── Welcome Banner ── */}
        <div
          className="flex items-center justify-between gap-4 rounded-2xl border border-blue-900/20 px-5 py-5 shadow-sm sm:px-7"
          style={{
            background: 'linear-gradient(135deg, #0f2044 0%, #1a3a6e 60%, #1e4d8c 100%)',
          }}
        >
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome to SmartMove TMS 🚌
            </h1>
            <p className="text-blue-200 text-sm mt-1">{todayLabel()}</p>
            <p className="text-blue-300 text-xs mt-0.5">
              Transport Management System — Operations Dashboard
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-white/60 text-xs uppercase tracking-wider">Fleet Status</span>
            <span className="text-2xl font-bold text-white">
              {vehicles.filter((v) => v.status === 'active').length}
              <span className="text-base font-normal text-blue-200">
                /{vehicles.length} Active
              </span>
            </span>
          </div>
        </div>

        {/* ── Summary StatCards ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
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
              color="blue"
              subtitle={`${bookings.filter((b) => b.status === 'confirmed').length} confirmed overall`}
            />
            <StatCard
              title="Total Revenue"
              value={stats.totalRevenue === null ? 'Unavailable' : formatCurrency(stats.totalRevenue)}
              icon={<BadgeDollarSign size={22} />}
              color="green"
              subtitle={stats.totalRevenue === null ? 'Revenue report is unavailable in Oracle mode' : 'From backend revenue report'}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Passengers', value: stats.totalPassengers },
              { label: 'All trips', value: stats.totalTrips },
              { label: 'All bookings', value: stats.totalBookings },
              { label: 'Maintenance alerts', value: stats.maintenanceAlerts },
            ].map((item) => <div key={item.label} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"><p className="text-xs font-medium text-gray-500">{item.label}</p><p className="mt-1 text-lg font-semibold text-gray-900">{item.value}</p></div>)}
          </div>
        </section>

        {/* ── Main content grid: Bookings + Maintenance + Route Usage ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Recent Bookings (spans 2 cols on xl) ── */}
          <section className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Recent Bookings</h2>
              <span className="text-xs text-gray-400">Last 5 bookings</span>
            </div>
            <div className="p-0">
              <DataTable<Booking>
                columns={bookingColumns}
                data={recentBookings}
                emptyMessage="No bookings found."
              />
            </div>
          </section>

          {/* ── Right column: Maintenance Alerts + Route Usage ── */}
          <div className="flex flex-col gap-6">

            {/* Maintenance Alerts */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800">
                  Maintenance Alerts
                </h2>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                >
                  {alertRecords.length} issue{alertRecords.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {alertRecords.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    ✅ No active alerts
                  </div>
                ) : (
                  alertRecords.map((record) => (
                    <div
                      key={record.id}
                      className={`mx-3 my-2 px-3 py-3 rounded-xl border ${alertBgStyle(record.status)}`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          size={15}
                          className={`mt-0.5 shrink-0 ${alertIconColor(record.status)}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {record.vehicleReg ?? vehicles.find((vehicle) => vehicle.id === record.vehicleId)?.registrationNumber ?? `Vehicle #${record.vehicleId}`}
                            <span className="text-gray-400 font-normal ml-1 text-xs">
                              — {record.vehicleMake ?? (() => { const vehicle = vehicles.find((item) => item.id === record.vehicleId); return vehicle ? `${vehicle.make} ${vehicle.model}` : ''; })()}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {record.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <StatusBadge status={record.status} type="maintenance" />
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={11} />
                              {formatDate(record.scheduledDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Route Usage Bar Chart */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800">Route Usage</h2>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={11} /> Bookings per route
                </span>
              </div>

              <div className="px-5 py-4 space-y-3">
                {routeUsage.map(({ code, count }, idx) => {
                  const barWidthPct = Math.round((count / maxRouteCount) * 100);
                  const color = barColors[idx % barColors.length];
                  // Find route description from bookings
                  const routeBooking = bookings.find((b) => b.routeCode === code);
                  const routeDesc = routeBooking
                    ? `${routeBooking.origin} → ${routeBooking.destination}`
                    : '';

                  return (
                    <div key={code}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span
                            className="text-xs font-bold"
                            style={{ color }}
                          >
                            {code}
                          </span>
                          {routeDesc && (
                            <span className="text-xs text-gray-400 ml-1.5">
                              {routeDesc}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {count}
                        </span>
                      </div>
                      {/* CSS bar — no chart library */}
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        </div>

        {/* ── Quick Stats footer row ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Vehicles Active',
              value: vehicles.filter((v) => v.status === 'active').length,
              of: vehicles.length,
              color: '#1d4ed8',
              bg: '#eff6ff',
            },
            {
              label: 'Trips In Progress',
              value: trips.filter((t) => t.status === 'in_progress').length,
              of: trips.length,
              color: '#b45309',
              bg: '#fffbeb',
            },
            {
              label: 'Paid Payments',
              value: payments.filter((p) => p.status === 'paid').length,
              of: payments.length,
              color: '#15803d',
              bg: '#f0fdf4',
            },
            {
              label: 'Confirmed Bookings',
              value: bookings.filter((b) => b.status === 'confirmed').length,
              of: bookings.length,
              color: '#7c3aed',
              bg: '#faf5ff',
            },
          ].map((item) => {
            const pct = item.of > 0 ? Math.round((item.value / item.of) * 100) : 0;
            return (
              <div
                key={item.label}
                className="rounded-xl p-4 border"
                style={{ backgroundColor: item.bg, borderColor: `${item.color}30` }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: item.color }}>
                  {item.label}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.value}
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    / {item.of}
                  </span>
                </p>
                {/* Mini progress bar */}
                <div className="h-1.5 rounded-full bg-white mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{pct}% of total</p>
              </div>
            );
          })}
        </section>

      </div>
    </div>
  );
};

export default Dashboard;
