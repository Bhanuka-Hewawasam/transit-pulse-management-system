import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { ApiError, apiGet, apiPatch } from '../services/api';
import type { Booking, Driver, Feedback, Passenger, Route, Trip, Vehicle } from '../types';

type TripRow = { id: number; route: string; departure: string; vehicle: string; passengers: number; seats: string; status: string };
const displayDate = (value: string) => new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

const DriverDashboard: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [driverId, setDriverId] = useState('');
  const [mode, setMode] = useState<'oracle' | 'demo' | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTrip, setUpdatingTrip] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<Driver[]>('/drivers'), apiGet<Trip[]>('/trips'), apiGet<Vehicle[]>('/vehicles'),
      apiGet<Route[]>('/routes'), apiGet<Passenger[]>('/passengers'), apiGet<Booking[]>('/bookings'),
      apiGet<Feedback[]>('/feedback'), apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases'),
    ]).then(([driverRows, tripRows, vehicleRows, routeRows, passengerRows, bookingRows, feedbackRows, health]) => {
      if (!active) return;
      setDrivers(driverRows); setTrips(tripRows); setVehicles(vehicleRows); setRoutes(routeRows);
      setPassengers(passengerRows); setBookings(bookingRows); setFeedback(feedbackRows); setMode(health.mode);
    }).catch((requestError: Error) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);

  const assignedTrips = useMemo(() => trips.filter((trip) => driverId && trip.driverId === Number(driverId)), [trips, driverId]);
  const selectedDriver = drivers.find((driver) => driver.id === Number(driverId));
  const assignedVehicle = vehicles.find((vehicle) => vehicle.id === assignedTrips[0]?.vehicleId);
  const driverFeedback = feedback.filter((item) => driverId && item.driverId === Number(driverId));
  const tripRows: TripRow[] = assignedTrips.map((trip) => {
    const route = routes.find((item) => item.id === trip.routeId);
    const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
    return {
      id: trip.id,
      route: route ? `${route.routeCode} · ${route.origin} to ${route.destination}` : `Route #${trip.routeId}`,
      departure: displayDate(trip.departureTime), vehicle: vehicle?.registrationNumber ?? `Vehicle #${trip.vehicleId}`,
      passengers: bookings.filter((booking) => booking.tripId === trip.id && booking.status !== 'cancelled').length,
      seats: `${trip.availableSeats}/${trip.totalSeats}`, status: trip.status,
    };
  });

  const updateStatus = async (tripIdToUpdate: number, status: Trip['status']) => {
    setError(null); setUpdatingTrip(tripIdToUpdate);
    try {
      await apiPatch<Trip>(`/trips/${tripIdToUpdate}/status`, { status });
      setTrips(await apiGet<Trip[]>('/trips'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('Unable to update trip status.'));
    } finally {
      setUpdatingTrip(null);
    }
  };

  const columns: Column<TripRow>[] = [
    { key: 'route', label: 'Route' }, { key: 'departure', label: 'Departure' }, { key: 'vehicle', label: 'Assigned vehicle' },
    { key: 'passengers', label: 'Passengers' }, { key: 'seats', label: 'Available / total seats' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} type="trip" /> },
    { key: 'update', label: 'Update status', render: (row) => <select value={row.status} disabled={updatingTrip === row.id} onChange={(event) => updateStatus(row.id, event.target.value as Trip['status'])} className="rounded border border-gray-300 bg-white px-2 py-1 text-xs" aria-label={`Update trip ${row.id}`}><option value="scheduled">Scheduled</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select> },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Choose a driver record to view assigned trips, passengers, and feedback.</p>
        <p className="mt-2 text-xs text-gray-500" role="status">Application mode: {mode === 'oracle' ? 'Oracle' : mode === 'demo' ? 'Demo' : 'Checking'}</p>
      </header>
      <label className="block max-w-md space-y-1 text-sm font-medium text-gray-700"><span>Driver profile</span><select value={driverId} onChange={(event) => setDriverId(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" aria-label="Driver profile"><option value="">Select a driver</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.firstName} {driver.lastName} · #{driver.id}</option>)}</select></label>
      {loading && <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">Loading driver and trip records…</p>}
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-gray-900">Assigned trips and passenger counts</h2><button type="button" onClick={() => { setError(null); setLoading(true); setReload((current) => current + 1); }} disabled={loading} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-60">Refresh</button></div>
        <DataTable<TripRow> columns={columns} data={tripRows} loading={loading} emptyMessage={driverId ? 'No trips are assigned to this driver.' : 'Select a driver to view assigned trips.'} />
      </section>
      {selectedDriver && <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded border border-gray-200 bg-white p-4"><h2 className="font-semibold text-gray-900">Assigned vehicle</h2><p className="mt-2 text-sm text-gray-700">{assignedVehicle ? `${assignedVehicle.registrationNumber} · ${assignedVehicle.make} ${assignedVehicle.model}` : 'No vehicle is currently assigned.'}</p><p className="mt-2 text-xs text-gray-500">Maintenance records are managed from the Maintenance page.</p></section>
        <section className="rounded border border-gray-200 bg-white p-4"><h2 className="font-semibold text-gray-900">Driver feedback</h2><p className="mt-2 text-sm text-gray-700">{driverFeedback.length ? `${driverFeedback.length} feedback record(s), average ${ (driverFeedback.reduce((sum, item) => sum + Number(item.rating), 0) / driverFeedback.length).toFixed(2)}/5.` : 'No feedback records yet.'}</p></section>
      </div>}
      {selectedDriver && assignedTrips.map((trip) => {
        const tripPassengers = bookings.filter((booking) => booking.tripId === trip.id && booking.status !== 'cancelled').map((booking) => passengers.find((passenger) => passenger.id === booking.passengerId));
        return <section key={trip.id} className="rounded border border-gray-200 bg-white p-4"><h3 className="font-semibold text-gray-900">Passengers for trip #{trip.id}</h3><p className="mt-2 text-sm text-gray-700">{tripPassengers.length ? tripPassengers.map((passenger) => passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Passenger record unavailable').join(', ') : 'No passengers booked.'}</p></section>;
      })}
    </div>
  );
};
export default DriverDashboard;
