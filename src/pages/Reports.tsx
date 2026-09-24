import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { apiGet } from '../services/api';

type ReportRow = Record<string, string | number>;
const money = (n: number) => `LKR ${n.toLocaleString('en-LK')}`;

const Reports: React.FC = () => {
  const [report, setReport] = useState('routes');
  const [passengerId, setPassengerId] = useState('1');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column<ReportRow>[]>([]);
  const [passengers, setPassengers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);

  useEffect(() => {
    apiGet<{ id: number; firstName: string; lastName: string }[]>('/passengers').then(setPassengers).catch(() => setPassengers([]));
  }, []);

  useEffect(() => {
    const endpoint = report === 'routes' ? '/reports/most-used-routes' : report === 'revenue' ? '/reports/revenue' : report === 'history' ? `/reports/passenger-history?passengerId=${passengerId}` : report === 'maintenance' ? '/reports/maintenance-due' : '/reports/performance';
    setLoading(true); setError(null);
    apiGet<Record<string, unknown>[]>(endpoint).then((result) => {
      if (report === 'routes') { setColumns([{ key: 'route', label: 'Route' }, { key: 'trips', label: 'Bookings' }] as Column<ReportRow>[]); setRows(result.map((item) => ({ route: String((item.route as Record<string, unknown>)?.routeCode ?? 'Unknown'), trips: Number(item.bookingCount) }))); }
      else if (report === 'revenue') { setColumns([{ key: 'period', label: 'Period' }, { key: 'revenue', label: 'Revenue' }] as Column<ReportRow>[]); setRows(result.map((item) => ({ period: String(item.period), revenue: money(Number(item.revenue)) }))); }
      else if (report === 'history') { setColumns([{ key: 'date', label: 'Travel date' }, { key: 'route', label: 'Route' }, { key: 'status', label: 'Booking status' }, { key: 'amount', label: 'Amount' }] as Column<ReportRow>[]); setRows(result.map((item) => ({ date: String(item.departureTime ?? item.bookingDate), route: String(item.routeCode ?? '—'), status: String(item.status), amount: money(Number(item.amount)) }))); }
      else if (report === 'maintenance') { setColumns([{ key: 'vehicle', label: 'Vehicle' }, { key: 'due', label: 'Due date' }, { key: 'status', label: 'Status' }, { key: 'description', label: 'Work required' }] as Column<ReportRow>[]); setRows(result.map((item) => ({ vehicle: String(item.vehicleReg ?? '—'), due: String(item.scheduledDate), status: String(item.status), description: String(item.description) }))); }
      else { setColumns([{ key: 'name', label: 'Driver' }, { key: 'trips', label: 'Completed trips' }, { key: 'rating', label: 'Rating' }] as Column<ReportRow>[]); setRows(result.map((item) => { const driver = item.driver as Record<string, unknown>; return { name: `${String(driver.firstName)} ${String(driver.lastName)}`, trips: Number(driver.totalTrips), rating: `${String(driver.rating)}/5` }; })); }
    }).catch((requestError: Error) => setError(requestError.message)).finally(() => setLoading(false));
  }, [report, passengerId]);

  return <div className="space-y-5">
    <div><h2 className="text-2xl font-bold text-gray-900">Business Reports</h2><p className="mt-1 text-sm text-gray-500">Five coursework reports calculated from the current demo dataset.</p></div>
    <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
      {[['routes', 'Most Frequently Used Routes'], ['revenue', 'Total Revenue by Period'], ['history', 'Passenger Travel History'], ['maintenance', 'Vehicles Due for Maintenance'], ['performance', 'Driver Performance']].map(([value, label]) => <button key={value} type="button" onClick={() => setReport(value)} className={`rounded-lg px-3 py-2 text-sm ${report === value ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{label}</button>)}
      {report === 'history' && <select value={passengerId} onChange={(e) => setPassengerId(e.target.value)} className="rounded-lg border border-gray-300 px-3 text-sm" aria-label="Select passenger">{passengers.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select>}
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load report: {error}</div>}
    <DataTable<ReportRow> columns={columns} data={rows} loading={loading} emptyMessage="No report results for the selected filters." />
    <p className="text-xs text-amber-700">Demo data only. Oracle report SQL is provided separately in <code>database/oracle/plsql/reports.sql</code>.</p>
  </div>;
};
export default Reports;
