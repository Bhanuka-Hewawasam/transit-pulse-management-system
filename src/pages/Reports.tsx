import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { ApiError, apiGet } from '../services/api';
import type { Booking, Driver, Feedback, MaintenanceRecord, Passenger, Payment, Route, Trip, Vehicle } from '../types';

type ReportKey = 'routes' | 'revenue' | 'history' | 'maintenance' | 'performance' | 'route-revenue-ratings';
type ReportRow = Record<string, string | number>;
type ReportData = {
  routes: Route[];
  trips: Trip[];
  bookings: Booking[];
  payments: Payment[];
  passengers: Passenger[];
  vehicles: Vehicle[];
  drivers: Driver[];
  feedback: Feedback[];
  maintenance: MaintenanceRecord[];
};

const money = (amount: number) => `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const routeName = (route?: Route) => route ? `${route.routeCode} · ${route.origin} to ${route.destination}` : 'Unknown route';
const passengerName = (passenger?: Passenger) => passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Unknown passenger';
const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function downloadCsv(report: ReportKey, columns: Column<ReportRow>[], rows: ReportRow[]) {
  const csv = [
    columns.map((column) => csvCell(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[String(column.key)])).join(',')),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `smartmove-${report}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const tabOptions: Array<{ id: ReportKey; label: string }> = [
  { id: 'routes', label: 'Most used routes' }, { id: 'revenue', label: 'Revenue by period' },
  { id: 'history', label: 'Passenger history' }, { id: 'maintenance', label: 'Maintenance due' },
  { id: 'performance', label: 'Driver and vehicle performance' }, { id: 'route-revenue-ratings', label: 'Route revenue and reviews' },
];

const Reports: React.FC = () => {
  const [report, setReport] = useState<ReportKey>('routes');
  const [passengerId, setPassengerId] = useState('');
  const [topN, setTopN] = useState('5');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [daysAhead, setDaysAhead] = useState('30');
  const [data, setData] = useState<ReportData | null>(null);
  const [serverRows, setServerRows] = useState<Record<string, unknown>[] | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<Error | null>(null);
  const [mode, setMode] = useState<'oracle' | 'demo' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<Route[]>('/routes'), apiGet<Trip[]>('/trips'), apiGet<Booking[]>('/bookings'),
      apiGet<Payment[]>('/payments'), apiGet<Passenger[]>('/passengers'), apiGet<Vehicle[]>('/vehicles'),
      apiGet<Driver[]>('/drivers'), apiGet<Feedback[]>('/feedback'), apiGet<MaintenanceRecord[]>('/maintenance'),
      apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases'),
    ]).then(([routes, trips, bookings, payments, passengers, vehicles, drivers, feedback, maintenance, health]) => {
      if (!active) return;
      setData({ routes, trips, bookings, payments, passengers, vehicles, drivers, feedback, maintenance });
      setMode(health.mode);
    }).catch((requestError: Error) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode !== 'oracle') return;
    let active = true;
    setServerRows(null);
    setServerError(null);
    setServerLoading(false);

    const query = new URLSearchParams();
    let endpoint = '';
    if (report === 'routes') {
      if (topN.trim() === '') { setServerRows([]); return; }
      query.set('topN', topN);
      endpoint = '/reports/most-used-routes';
    } else if (report === 'revenue') {
      if (!fromDate || !toDate) { setServerRows([]); return; }
      query.set('fromDate', fromDate);
      query.set('toDate', toDate);
      endpoint = '/reports/revenue';
    } else if (report === 'history') {
      if (!passengerId) { setServerRows([]); return; }
      query.set('passengerId', passengerId);
      endpoint = '/reports/passenger-history';
    } else if (report === 'maintenance') {
      if (daysAhead.trim() === '') { setServerRows([]); return; }
      query.set('daysAhead', daysAhead);
      endpoint = '/reports/maintenance-due';
    } else if (report === 'performance') {
      endpoint = '/reports/performance';
    } else {
      endpoint = '/reports/route-revenue-ratings';
    }

    setServerLoading(true);
    apiGet<Record<string, unknown>[]>(`${endpoint}${query.size ? `?${query}` : ''}`).then((rows) => {
      if (active) setServerRows(rows);
    }).catch((requestError: Error) => {
      if (active) setServerError(requestError);
    }).finally(() => {
      if (active) setServerLoading(false);
    });
    return () => { active = false; };
  }, [mode, report, topN, fromDate, toDate, passengerId, daysAhead]);

  const reportRows = useMemo((): { columns: Column<ReportRow>[]; rows: ReportRow[] } => {
    if (mode === 'oracle') {
      const rows = serverRows ?? [];
      if (report === 'routes') return {
        columns: [{ key: 'route', label: 'Route' }, { key: 'bookings', label: 'Bookings' }],
        rows: rows.map((row) => ({ route: routeName({ routeCode: String(row.routeCode ?? ''), origin: String(row.origin ?? ''), destination: String(row.destination ?? '') } as Route), bookings: Number(row.bookingCount ?? 0) })),
      };
      if (report === 'revenue') return {
        columns: [{ key: 'payments', label: 'Paid payments' }, { key: 'revenue', label: 'Revenue' }],
        rows: rows.map((row) => ({ payments: Number(row.paidPaymentCount ?? 0), revenue: money(Number(row.totalRevenue ?? 0)) })),
      };
      if (report === 'history') return {
        columns: [
          { key: 'date', label: 'Travel date' }, { key: 'route', label: 'Route' }, { key: 'seat', label: 'Seat' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} type="booking" /> }, { key: 'amount', label: 'Amount' },
        ],
        rows: rows.map((row) => ({ date: formatDate(String(row.departureTime ?? '')), route: routeName({ routeCode: String(row.routeCode ?? ''), origin: String(row.origin ?? ''), destination: String(row.destination ?? '') } as Route), seat: String(row.seatNumber ?? ''), status: String(row.bookingStatus ?? ''), amount: money(Number(row.bookingAmount ?? 0)) })),
      };
      if (report === 'maintenance') return {
        columns: [
          { key: 'vehicle', label: 'Vehicle' }, { key: 'due', label: 'Next maintenance' },
          { key: 'days', label: 'Days until due' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} type="vehicle" /> },
        ],
        rows: rows.map((row) => ({ vehicle: `${String(row.registrationNumber ?? '')} · ${String(row.make ?? '')} ${String(row.model ?? '')}`, due: formatDate(String(row.nextMaintenanceDate ?? '')), days: Number(row.daysUntilDue ?? 0), status: String(row.status ?? '') })),
      };
      if (report === 'performance') {
        const driverRows = rows.map((row) => ({ kind: 'Driver', name: `${String(row.firstName ?? '')} ${String(row.lastName ?? '')}`.trim(), trips: Number(row.completedTripCount ?? 0), rating: row.averageRating === null || row.averageRating === undefined ? 'No ratings' : `${Number(row.averageRating).toFixed(2)}/5`, feedback: Number(row.feedbackCount ?? 0) }));
        const vehicleRows = (data?.vehicles ?? []).map((vehicle) => {
          const vehicleFeedback = (data?.feedback ?? []).filter((item) => item.vehicleId === vehicle.id);
          const average = vehicleFeedback.length ? vehicleFeedback.reduce((total, item) => total + Number(item.rating), 0) / vehicleFeedback.length : 0;
          return { kind: 'Vehicle', name: `${vehicle.registrationNumber} · ${vehicle.make} ${vehicle.model}`, trips: (data?.trips ?? []).filter((trip) => trip.vehicleId === vehicle.id).length, rating: vehicleFeedback.length ? `${average.toFixed(2)}/5` : 'No ratings', feedback: vehicleFeedback.length };
        });
        return { columns: [{ key: 'kind', label: 'Resource' }, { key: 'name', label: 'Driver / vehicle' }, { key: 'trips', label: 'Trips' }, { key: 'rating', label: 'Rating' }, { key: 'feedback', label: 'Feedback count' }], rows: [...driverRows, ...vehicleRows] };
      }
      return {
        columns: [{ key: 'route', label: 'Route' }, { key: 'revenue', label: 'Paid revenue' }, { key: 'rating', label: 'MongoDB average rating' }, { key: 'reviews', label: 'Reviews' }],
        rows: rows.map((row) => ({ route: routeName({ routeCode: String(row.routeCode ?? ''), origin: String(row.origin ?? ''), destination: String(row.destination ?? '') } as Route), revenue: money(Number(row.paidRevenue ?? 0)), rating: row.averageReviewRating === null || row.averageReviewRating === undefined ? 'No reviews' : `${Number(row.averageReviewRating).toFixed(2)}/5`, reviews: Number(row.reviewCount ?? 0) })),
      };
    }
    if (!data) return { columns: [], rows: [] };

    if (report === 'routes') {
      const counts = new Map<number, number>();
      data.bookings.filter((booking) => booking.status !== 'cancelled').forEach((booking) => {
        const trip = data.trips.find((item) => item.id === booking.tripId);
        if (trip) counts.set(trip.routeId, (counts.get(trip.routeId) ?? 0) + 1);
      });
      return {
        columns: [{ key: 'route', label: 'Route' }, { key: 'bookings', label: 'Bookings' }],
        rows: [...counts].map(([routeId, bookings]) => ({ route: routeName(data.routes.find((item) => item.id === routeId)), bookings })).sort((a, b) => Number(b.bookings) - Number(a.bookings)).slice(0, Math.max(0, Number(topN) || 0)),
      };
    }

    if (report === 'revenue') {
      const totals = new Map<string, number>();
      data.payments.filter((payment) => payment.status === 'paid' && (!fromDate || String(payment.paymentDate ?? '').slice(0, 10) >= fromDate) && (!toDate || String(payment.paymentDate ?? '').slice(0, 10) <= toDate)).forEach((payment) => {
        const period = String(payment.paymentDate ?? '').slice(0, 7);
        if (period) totals.set(period, (totals.get(period) ?? 0) + Number(payment.amount));
      });
      return { columns: [{ key: 'period', label: 'Period' }, { key: 'revenue', label: 'Revenue' }], rows: [...totals].sort(([left], [right]) => left.localeCompare(right)).map(([period, revenue]) => ({ period, revenue: money(revenue) })) };
    }

    if (report === 'history') {
      const passengerBookings = data.bookings.filter((booking) => passengerId && booking.passengerId === Number(passengerId));
      return {
        columns: [{ key: 'date', label: 'Travel date' }, { key: 'route', label: 'Route' }, { key: 'seat', label: 'Seat' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} type="booking" /> }, { key: 'amount', label: 'Amount' }],
        rows: passengerBookings.map((booking) => {
          const trip = data.trips.find((item) => item.id === booking.tripId);
          return { date: formatDate(trip?.departureTime ?? booking.bookingDate), route: routeName(data.routes.find((item) => item.id === trip?.routeId)), seat: booking.seatNumber, status: booking.status, amount: money(Number(booking.amount)) };
        }).sort((left, right) => String(right.date).localeCompare(String(left.date))),
      };
    }

    if (report === 'maintenance') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + Math.max(0, Number(daysAhead) || 0));
      const dueVehicles = data.vehicles.filter((vehicle) => vehicle.status === 'maintenance' || Boolean(vehicle.nextMaintenanceDate && new Date(vehicle.nextMaintenanceDate) <= cutoff));
      return {
        columns: [{ key: 'vehicle', label: 'Vehicle' }, { key: 'due', label: 'Next maintenance' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} type="vehicle" /> }],
        rows: dueVehicles.map((vehicle) => ({ vehicle: `${vehicle.registrationNumber} · ${vehicle.make} ${vehicle.model}`, due: formatDate(vehicle.nextMaintenanceDate), status: vehicle.status })),
      };
    }

    if (report === 'route-revenue-ratings') {
      return {
        columns: [{ key: 'route', label: 'Route' }, { key: 'revenue', label: 'Paid revenue' }, { key: 'rating', label: 'Review rating' }, { key: 'reviews', label: 'Reviews' }],
        rows: data.routes.map((route) => {
          const routeTrips = data.trips.filter((trip) => trip.routeId === route.id);
          const routeTripIds = new Set(routeTrips.map((trip) => trip.id));
          const routeReviews = data.feedback.filter((item) => routeTripIds.has(item.tripId));
          const paidRevenue = data.payments.filter((payment) => payment.status === 'paid').reduce((total, payment) => {
            const booking = data.bookings.find((item) => item.id === payment.bookingId);
            return booking && routeTripIds.has(booking.tripId) ? total + payment.amount : total;
          }, 0);
          const average = routeReviews.length ? routeReviews.reduce((total, item) => total + Number(item.rating), 0) / routeReviews.length : null;
          return { route: routeName(route), revenue: money(paidRevenue), rating: average === null ? 'No reviews' : `${average.toFixed(2)}/5`, reviews: routeReviews.length };
        }),
      };
    }

    const driverRows = data.drivers.map((driver) => ({
      kind: 'Driver', name: `${driver.firstName} ${driver.lastName}`, trips: Number(driver.totalTrips ?? 0),
      rating: `${Number(driver.rating ?? 0).toFixed(2)}/5`, feedback: data.feedback.filter((item) => item.driverId === driver.id).length,
    }));
    const vehicleRows = data.vehicles.map((vehicle) => {
      const vehicleFeedback = data.feedback.filter((item) => item.vehicleId === vehicle.id);
      const average = vehicleFeedback.length ? vehicleFeedback.reduce((total, item) => total + Number(item.rating), 0) / vehicleFeedback.length : 0;
      return { kind: 'Vehicle', name: `${vehicle.registrationNumber} · ${vehicle.make} ${vehicle.model}`, trips: data.trips.filter((trip) => trip.vehicleId === vehicle.id).length, rating: vehicleFeedback.length ? `${average.toFixed(2)}/5` : 'No ratings', feedback: vehicleFeedback.length };
    });
    return { columns: [{ key: 'kind', label: 'Resource' }, { key: 'name', label: 'Driver / vehicle' }, { key: 'trips', label: 'Trips' }, { key: 'rating', label: 'Rating' }, { key: 'feedback', label: 'Feedback count' }], rows: [...driverRows, ...vehicleRows] };
  }, [data, mode, report, passengerId, serverRows, topN, fromDate, toDate, daysAhead]);

  const selectedPassenger = data?.passengers.find((passenger) => passenger.id === Number(passengerId));
  const emptyMessage = report === 'history' && !passengerId ? 'Select a passenger to view travel history.'
    : report === 'revenue' && mode === 'oracle' && (!fromDate || !toDate) ? 'Select a date range to view paid revenue.'
      : 'No records match this report.';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Business Reports</h2>
        <p className="mt-1 text-sm text-gray-600">Calculated from records returned by the backend API.</p>
        <p className="mt-1 text-xs text-gray-500" role="status">Application mode: {mode === 'oracle' ? 'Oracle records' : mode === 'demo' ? 'Demo records' : 'Checking'}</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-gray-200" role="tablist" aria-label="Business reports">
        {tabOptions.map((option) => <button key={option.id} type="button" role="tab" aria-selected={report === option.id} onClick={() => setReport(option.id)} className={`border-b-2 px-3 py-2 text-sm font-medium ${report === option.id ? 'border-blue-800 text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>{option.label}</button>)}
      </div>
      {report === 'routes' && <label className="block max-w-xs space-y-1 text-sm font-medium text-gray-700"><span>Top N routes</span><input aria-label="Top N routes" type="number" min="0" step="1" value={topN} onChange={(event) => setTopN(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" /></label>}
      {report === 'revenue' && <div className="grid max-w-xl gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium text-gray-700"><span>From date</span><input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" /></label><label className="space-y-1 text-sm font-medium text-gray-700"><span>To date</span><input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" /></label></div>}
      {report === 'history' && <label className="block max-w-md space-y-1 text-sm font-medium text-gray-700"><span>Passenger</span><select value={passengerId} onChange={(event) => setPassengerId(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" aria-label="Select passenger"><option value="">Select a passenger</option>{data?.passengers.map((passenger) => <option key={passenger.id} value={passenger.id}>{passengerName(passenger)}</option>)}</select>{selectedPassenger && <span className="text-xs text-gray-500">Travel history for {passengerName(selectedPassenger)}</span>}</label>}
      {report === 'maintenance' && <label className="block max-w-xs space-y-1 text-sm font-medium text-gray-700"><span>Days ahead</span><input aria-label="Days ahead" type="number" min="0" step="1" value={daysAhead} onChange={(event) => setDaysAhead(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" /></label>}
      {(loading || serverLoading) && <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">Loading report…</p>}
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>Unable to load report data: {error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
      {serverError && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>Unable to load this report: {serverError.message}</p>{serverError instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{serverError.technicalMessage}</code></details>}</div>}
      <div className="flex justify-end">
        <button type="button" onClick={() => downloadCsv(report, reportRows.columns, reportRows.rows)} disabled={reportRows.rows.length === 0} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">Export CSV</button>
      </div>
      <DataTable<ReportRow> columns={reportRows.columns} data={reportRows.rows} loading={loading || serverLoading} emptyMessage={emptyMessage} />
      {mode === 'oracle' && report === 'route-revenue-ratings' && serverRows?.some((row) => row.reviewSourceAvailable === false) && <p className="text-xs text-amber-700">MongoDB reviews are unavailable; revenue is shown without ratings.</p>}
      {mode === 'demo' && <p className="text-xs text-gray-500">Demo reports are calculated from the existing entity-list data.</p>}
    </div>
  );
};
export default Reports;
