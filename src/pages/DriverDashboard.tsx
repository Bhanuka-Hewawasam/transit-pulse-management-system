import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { apiGet, apiPatch } from '../services/api';
import type { Feedback, Trip, Vehicle } from '../types';

const DriverDashboard: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [error, setError] = useState('');
  const [source, setSource] = useState('Demo Data');
  const assignedTrips = useMemo(() => trips.filter((trip) => trip.driverId === 1), [trips]);
  useEffect(() => { Promise.all([apiGet<Trip[]>('/trips'), apiGet<Vehicle[]>('/vehicles'), apiGet<Feedback[]>('/feedback'), apiGet<{ oracle: { mode: string } }>('/health/databases')]).then(([tripRows, vehicleRows, feedbackRows, status]) => { setTrips(tripRows); setVehicles(vehicleRows); setFeedback(feedbackRows.filter((item) => item.driverId === 1)); setSource(status.oracle.mode === 'oracle' ? 'Oracle Database' : 'Demo Data'); }).catch((requestError: Error) => setError(requestError.message)); }, []);
  const updateStatus = async (trip: Trip, status: Trip['status']) => { try { const updated = await apiPatch<Trip>(`/trips/${trip.id}/status`, { status }); setTrips((previous) => previous.map((item) => item.id === updated.id ? updated : item)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update trip'); } };
  const columns: Column<Trip>[] = [{ key: 'routeCode', label: 'Route' }, { key: 'departureTime', label: 'Departure' }, { key: 'vehicleReg', label: 'Assigned vehicle' }, { key: 'availableSeats', label: 'Passenger seats' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }, { key: 'action', label: 'Update', render: (row) => <select value={row.status} onChange={(event) => updateStatus(row, event.target.value as Trip['status'])} className="rounded border border-gray-200 px-2 py-1 text-xs" aria-label={`Update trip ${row.id}`}><option value="scheduled">Scheduled</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select> }];
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1><p className="mt-1 text-sm text-gray-500">Assigned schedule, vehicle alerts, passenger counts, and feedback.</p><span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Data source: {source}</span></div>{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<section><h2 className="mb-3 text-lg font-semibold text-gray-900">Assigned trips and passenger list</h2><DataTable<Trip> columns={columns} data={assignedTrips} emptyMessage="No assigned trips." /></section><section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Assigned vehicle and maintenance alerts</h2><p className="mt-2 text-sm text-gray-600">{vehicles.find((vehicle) => vehicle.id === assignedTrips[0]?.vehicleId)?.registrationNumber ?? 'No vehicle assigned'} · Check the Maintenance page for service details.</p></section><section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Driver feedback</h2><p className="mt-2 text-sm text-gray-600">{feedback.length ? `${feedback.length} feedback record(s) available.` : 'No feedback records yet.'}</p></section></div>;
};
export default DriverDashboard;
