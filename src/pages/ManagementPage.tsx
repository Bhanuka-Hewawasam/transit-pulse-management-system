import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { apiEndpoints, apiGet, apiPost } from '../services/api';

type Row = Record<string, string | number | undefined>;

const text = (value: unknown) => String(value ?? '—');
const money = (value: unknown) => `LKR ${Number(value ?? 0).toLocaleString('en-LK')}`;

const configs: Record<string, { description: string; rows: Row[]; columns: Column<Row>[] }> = {
  vehicles: {
    description: 'Fleet register and operational status (demo data).',
    rows: [] as Row[],
    columns: [
      { key: 'registration', label: 'Registration' }, { key: 'vehicle', label: 'Vehicle' },
      { key: 'type', label: 'Type' }, { key: 'capacity', label: 'Seats' },
      { key: 'fuel', label: 'Fuel' }, { key: 'nextMaintenance', label: 'Next maintenance' },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={text(r.status)} /> },
    ],
  },
  drivers: {
    description: 'Driver register, licence details, and performance summary (demo data).',
    rows: [] as Row[],
    columns: [
      { key: 'name', label: 'Driver' }, { key: 'license', label: 'Licence' }, { key: 'expiry', label: 'Licence expiry' },
      { key: 'phone', label: 'Phone' }, { key: 'trips', label: 'Trips' }, { key: 'rating', label: 'Rating' },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={text(r.status)} /> },
    ],
  },
  passengers: {
    description: 'Registered passenger accounts and booking totals (demo data).',
    rows: [] as Row[],
    columns: [{ key: 'name', label: 'Passenger' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'registered', label: 'Registered' }, { key: 'bookings', label: 'Bookings' }, { key: 'identity', label: 'NIC / Passport' }],
  },
  trips: {
    description: 'Scheduled and completed journeys with assigned resources (demo data).',
    rows: [] as Row[],
    columns: [{ key: 'route', label: 'Route' }, { key: 'departure', label: 'Departure' }, { key: 'vehicle', label: 'Vehicle' }, { key: 'driver', label: 'Driver' }, { key: 'seats', label: 'Seats available' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge status={text(r.status)} /> }],
  },
  bookings: {
    description: 'Ticket reservations and passenger travel details (demo data).',
    rows: [] as Row[],
    columns: [{ key: 'id', label: 'Booking' }, { key: 'passenger', label: 'Passenger' }, { key: 'route', label: 'Route' }, { key: 'seat', label: 'Seat' }, { key: 'date', label: 'Date' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge status={text(r.status)} /> }],
  },
  payments: {
    description: 'Payment transactions linked to ticket bookings (demo data).',
    rows: [] as Row[],
    columns: [{ key: 'reference', label: 'Transaction' }, { key: 'passenger', label: 'Passenger' }, { key: 'route', label: 'Route' }, { key: 'date', label: 'Date' }, { key: 'method', label: 'Method' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge status={text(r.status)} /> }],
  },
  maintenance: {
    description: 'Vehicle service, repair, and inspection schedule (demo data).',
    rows: [] as Row[],
    columns: [{ key: 'vehicle', label: 'Vehicle' }, { key: 'type', label: 'Type' }, { key: 'description', label: 'Description' }, { key: 'scheduled', label: 'Scheduled' }, { key: 'cost', label: 'Cost' }, { key: 'technician', label: 'Technician' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge status={text(r.status)} /> }],
  },
  feedback: {
    description: 'Passenger ratings and service comments (demo data).',
    rows: [] as Row[],
    columns: [{ key: 'passenger', label: 'Passenger' }, { key: 'route', label: 'Route' }, { key: 'driver', label: 'Driver' }, { key: 'rating', label: 'Rating' }, { key: 'category', label: 'Category' }, { key: 'comment', label: 'Comment' }, { key: 'date', label: 'Date' }],
  },
};

const toRows = (page: string, records: Record<string, unknown>[]): Row[] => records.map((record) => {
  if (page === 'vehicles') return { id: Number(record.id), registration: text(record.registrationNumber), vehicle: `${text(record.make)} ${text(record.model)}`, type: text(record.type), capacity: Number(record.capacity), fuel: text(record.fuelType), status: text(record.status), nextMaintenance: text(record.nextMaintenanceDate) };
  if (page === 'drivers') return { id: Number(record.id), name: `${text(record.firstName)} ${text(record.lastName)}`, license: text(record.licenseNumber), expiry: text(record.licenseExpiry), phone: text(record.phone), trips: Number(record.totalTrips), rating: Number(record.rating), status: text(record.status) };
  if (page === 'passengers') return { id: Number(record.id), name: `${text(record.firstName)} ${text(record.lastName)}`, email: text(record.email), phone: text(record.phone), registered: text(record.registeredDate), bookings: Number(record.totalBookings), identity: text(record.passportOrNic) };
  if (page === 'trips') return { id: Number(record.id), route: `${text(record.routeCode)} · ${text(record.origin)} → ${text(record.destination)}`, departure: text(record.departureTime).replace('T', ' '), vehicle: text(record.vehicleReg), driver: text(record.driverName), seats: `${text(record.availableSeats)}/${text(record.totalSeats)}`, status: text(record.status) };
  if (page === 'bookings') return { id: Number(record.id), passenger: text(record.passengerName), route: `${text(record.routeCode)} · ${text(record.origin)} → ${text(record.destination)}`, seat: text(record.seatNumber), date: text(record.bookingDate), amount: money(record.amount), status: text(record.status) };
  if (page === 'payments') return { id: Number(record.id), reference: text(record.transactionRef), passenger: text(record.passengerName), route: text(record.routeCode), date: text(record.paymentDate), method: text(record.method), amount: money(record.amount), status: text(record.status) };
  if (page === 'maintenance') return { id: Number(record.id), vehicle: text(record.vehicleReg), type: text(record.maintenanceType), description: text(record.description), scheduled: text(record.scheduledDate), cost: money(record.cost), technician: text(record.technicianName), status: text(record.status) };
  return { id: Number(record.id), passenger: text(record.passengerName), route: text(record.routeCode), driver: text(record.driverName), rating: `${text(record.rating)}/5`, category: text(record.category), comment: text(record.comment), date: text(record.feedbackDate) };
});

const createFields: Record<string, string[]> = {
  vehicles: ['registrationNumber', 'make', 'model'],
  drivers: ['firstName', 'lastName', 'licenseNumber'],
  passengers: ['firstName', 'lastName', 'email'],
  bookings: ['tripId', 'passengerId', 'seatNumber'],
  payments: ['bookingId', 'amount', 'method'],
  feedback: ['passengerId', 'tripId', 'rating', 'comment'],
};

const ManagementPage: React.FC<{ page: string }> = ({ page }) => {
  const config = configs[page];
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const fields = createFields[page] ?? [];

  const createRecord = async () => {
    try {
      const created = await apiPost<Record<string, unknown>>(apiEndpoints[page as keyof typeof apiEndpoints], form);
      setRecords((previous) => [...previous, ...toRows(page, [created])]);
      setForm({});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create record');
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet<Record<string, unknown>[]>(apiEndpoints[page as keyof typeof apiEndpoints])
      .then((result) => setRecords(toRows(page, result)))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [page]);

  const rows = useMemo(() => {
    if (!config) return [];
    const query = search.trim().toLowerCase();
    return records.filter((row) => !query || Object.values(row).some((value) => text(value).toLowerCase().includes(query)));
  }, [config, records, search]);

  if (!config) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Unable to load this module.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold capitalize text-gray-900">{page}</h2><p className="mt-1 text-sm text-gray-500">{config.description}</p></div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Demo data · Oracle connection not configured</span>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder={`Search ${page}…`} className="max-w-md" />
      {fields.length > 0 && <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-800">Add {page.slice(0, -1)}</h3><span className="text-xs text-gray-400">Saved through backend API</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{fields.map((field) => <input key={field} value={form[field] ?? ''} onChange={(event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))} placeholder={field} aria-label={field} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />)}</div><button type="button" onClick={createRecord} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Add record</button></div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load {page}: {error}</div>}
      <DataTable<Row> columns={config.columns} data={rows} loading={loading} emptyMessage={`No ${page} records match the current search.`} />
    </div>
  );
};

export default ManagementPage;
