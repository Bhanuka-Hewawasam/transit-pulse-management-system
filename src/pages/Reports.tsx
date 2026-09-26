import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { ApiError, apiGet } from '../services/api';
import type { Booking, Driver, Feedback, MaintenanceRecord, Passenger, Payment, Route, Trip, Vehicle } from '../types';

type ReportKey = 'routes' | 'revenue' | 'history' | 'maintenance' | 'performance';
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
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const routeName = (route?: Route) => route ? `${route.routeCode} · ${route.origin} to ${route.destination}` : 'Unknown route';
const passengerName = (passenger?: Passenger) => passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Unknown passenger';

const tabOptions: Array<{ id: ReportKey; label: string }> = [
  { id: 'routes', label: 'Most used routes' }, { id: 'revenue', label: 'Revenue by period' },
  { id: 'history', label: 'Passenger history' }, { id: 'maintenance', label: 'Maintenance due' },
  { id: 'performance', label: 'Driver and vehicle performance' },
];

const Reports: React.FC = () => {
  const [report, setReport] = useState<ReportKey>('routes');
  const [passengerId, setPassengerId] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
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

  const reportRows = useMemo((): { columns: Column<ReportRow>[]; rows: ReportRow[] } => {
    if (!data) return { columns: [], rows: [] };

    if (report === 'routes') {
      const counts = new Map<number, number>();
      data.bookings.filter((booking) => booking.status !== 'cancelled').forEach((booking) => {
        const trip = data.trips.find((item) => item.id === booking.tripId);
        if (trip) counts.set(trip.routeId, (counts.get(trip.routeId) ?? 0) + 1);
      });
      return {
        columns: [{ key: 'route', label: 'Route' }, { key: 'bookings', label: 'Bookings' }],
        rows: [...counts].map(([routeId, bookings]) => ({ route: routeName(data.routes.find((item) => item.id === routeId)), bookings })).sort((a, b) => Number(b.bookings) - Number(a.bookings)),
      };
    }

    if (report === 'revenue') {
      const totals = new Map<string, number>();
      data.payments.filter((payment) => payment.status === 'paid').forEach((payment) => {
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
      const dueVehicles = data.vehicles.filter((vehicle) => vehicle.status === 'maintenance' || Boolean(vehicle.nextMaintenanceDate && new Date(vehicle.nextMaintenanceDate) <= new Date()));
      return {
        columns: [{ key: 'vehicle', label: 'Vehicle' }, { key: 'due', label: 'Next maintenance' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} type="vehicle" /> }],
        rows: dueVehicles.map((vehicle) => ({ vehicle: `${vehicle.registrationNumber} · ${vehicle.make} ${vehicle.model}`, due: formatDate(vehicle.nextMaintenanceDate), status: vehicle.status })),
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
  }, [data, report, passengerId]);

  const selectedPassenger = data?.passengers.find((passenger) => passenger.id === Number(passengerId));
  const emptyMessage = report === 'history' && !passengerId ? 'Select a passenger to view travel history.' : 'No records match this report.';

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
      {report === 'history' && <label className="block max-w-md space-y-1 text-sm font-medium text-gray-700"><span>Passenger</span><select value={passengerId} onChange={(event) => setPassengerId(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" aria-label="Select passenger"><option value="">Select a passenger</option>{data?.passengers.map((passenger) => <option key={passenger.id} value={passenger.id}>{passengerName(passenger)}</option>)}</select>{selectedPassenger && <span className="text-xs text-gray-500">Travel history for {passengerName(selectedPassenger)}</span>}</label>}
      {loading && <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">Loading records from the backend…</p>}
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>Unable to load report data: {error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
      <DataTable<ReportRow> columns={reportRows.columns} data={reportRows.rows} loading={loading} emptyMessage={emptyMessage} />
      {mode === 'oracle' && <p className="text-xs text-gray-500">Values are derived from Oracle-backed entity endpoints; legacy aggregate report endpoints are not used in Oracle mode.</p>}
    </div>
  );
};
export default Reports;
