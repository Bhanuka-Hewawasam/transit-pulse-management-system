// File: src/pages/Routes.tsx
// SmartMove Transport Solutions — Routes Management Page
// Displays all transport routes with search, status filter, add/edit modal,
// stop-count badges with tooltip, and an inline toggle-status button.

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, MapPin, X, Pencil, ArrowRight, Inbox } from 'lucide-react';

import type { Route } from '../types';
import { ApiError, apiGet, apiPatch, apiPost } from '../services/api';

import StatusBadge   from '../components/StatusBadge';
import SearchBar     from '../components/SearchBar';
import DataTable     from '../components/DataTable';
import Modal         from '../components/Modal';
import type { Column } from '../components/DataTable';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveFilter = 'all' | 'active' | 'inactive';

/** Shape of the Add / Edit form fields */
interface RouteFormData {
  routeCode:         string;
  origin:            string;
  destination:       string;
  stops:             string[];
  distanceKm:        string;
  estimatedMinutes:  string;
  fareAmount:        string;
  isActive:          boolean;
}

const EMPTY_FORM: RouteFormData = {
  routeCode:        '',
  origin:           '',
  destination:      '',
  stops:            [],
  distanceKm:       '',
  estimatedMinutes: '',
  fareAmount:       '',
  isActive:         true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a number as 'LKR X.00' */
const formatFare = (amount: number) =>
  `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Parse RouteFormData into the backend request shape. */
const parseForm = (f: RouteFormData) => ({
  routeCode:        f.routeCode.trim(),
  origin:           f.origin.trim(),
  destination:      f.destination.trim(),
  stops:            f.stops.map((stop) => stop.trim()).filter(Boolean),
  distanceKm:       Number(f.distanceKm),
  estimatedMinutes: Number(f.estimatedMinutes),
  fareAmount:       Number(f.fareAmount),
  isActive:         f.isActive,
});

// ─── Stop-count Badge with Tooltip ────────────────────────────────────────────

/**
 * Renders a badge showing the number of stops.
 * On hover, a tooltip lists all stop names.
 */
const StopsBadge: React.FC<{ stops: string[] }> = ({ stops }) => {
  if (stops.length === 0) {
    return <span className="text-gray-400 text-xs italic">No stops</span>;
  }

  return (
    <div className="relative inline-block group">
      {/* Badge */}
      <span
        className="
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full
          text-xs font-medium cursor-default
          bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200
        "
      >
        <MapPin size={10} />
        {stops.length} stop{stops.length !== 1 ? 's' : ''}
      </span>

      {/* Tooltip — appears above the badge on hover */}
      <div
        className="
          absolute z-20 bottom-full left-0 mb-1.5
          hidden group-hover:block
          bg-gray-900 text-white text-xs rounded-lg shadow-xl
          px-3 py-2 whitespace-nowrap
          pointer-events-none
        "
      >
        <p className="font-semibold mb-1 text-gray-300">Stops via:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          {stops.map((stop, i) => (
            <li key={i}>{stop}</li>
          ))}
        </ol>
        {/* Tooltip arrow */}
        <span
          className="absolute top-full left-4 border-4 border-transparent"
          style={{ borderTopColor: '#111827' }}
        />
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const Routes: React.FC<{ searchValue?: string; onSearchValueChange?: (value: string) => void }> = ({ searchValue, onSearchValueChange }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [localRoutes,   setLocalRoutes]   = useState<Route[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<Error | null>(null);
  const [success,       setSuccess]       = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [activeFilter,  setActiveFilter]  = useState<ActiveFilter>('all');
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData,      setFormData]      = useState<RouteFormData>(EMPTY_FORM);
  const [formErrors,    setFormErrors]    = useState<Partial<RouteFormData>>({});
  const searchTerm = searchValue ?? localSearchTerm;
  const setSearchTerm = onSearchValueChange ?? setLocalSearchTerm;

  useEffect(() => {
    apiGet<Route[]>('/routes').then(setLocalRoutes).catch((requestError: Error) => setError(requestError)).finally(() => setLoading(false));
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const activeCount   = useMemo(() => localRoutes.filter((r) => r.isActive).length, [localRoutes]);
  const inactiveCount = useMemo(() => localRoutes.filter((r) => !r.isActive).length, [localRoutes]);

  const filteredRoutes = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return localRoutes.filter((r) => {
      const matchesSearch =
        !q ||
        r.routeCode.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.stops.some((s) => s.toLowerCase().includes(q));

      const matchesFilter =
        activeFilter === 'all'      ? true :
        activeFilter === 'active'   ? r.isActive :
        /* inactive */               !r.isActive;

      return matchesSearch && matchesFilter;
    });
  }, [localRoutes, searchTerm, activeFilter]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingRoute(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setError(null);
    setSuccess('');
    setShowAddModal(true);
  };

  const openEditModal = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      routeCode: route.routeCode,
      origin: route.origin,
      destination: route.destination,
      stops: [...route.stops],
      distanceKm: String(route.distanceKm),
      estimatedMinutes: String(route.estimatedMinutes),
      fareAmount: String(route.fareAmount),
      isActive: route.isActive,
    });
    setFormErrors({});
    setError(null);
    setSuccess('');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingRoute(null);
    setFormErrors({});
  };

  /** Update a single form field */
  const handleField = <K extends keyof RouteFormData>(key: K, value: RouteFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error for that field when user edits it
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Basic validation — returns true if the form is valid */
  const validate = (): boolean => {
    const errors: Partial<RouteFormData> = {};
    if (!formData.routeCode.trim())        errors.routeCode        = 'Required';
    if (!formData.origin.trim())           errors.origin           = 'Required';
    if (!formData.destination.trim())      errors.destination      = 'Required';
    if (!formData.distanceKm ||
      !Number.isFinite(Number(formData.distanceKm)) || Number(formData.distanceKm) <= 0)
                                           errors.distanceKm       = 'Enter a valid number';
    if (!formData.estimatedMinutes ||
      !Number.isInteger(Number(formData.estimatedMinutes)) || Number(formData.estimatedMinutes) < 1)
                                           errors.estimatedMinutes = 'Enter a valid integer';
    if (!formData.fareAmount ||
      !Number.isFinite(Number(formData.fareAmount)) || Number(formData.fareAmount) <= 0)
                                           errors.fareAmount       = 'Enter a valid amount';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Save a route through the backend API. */
  const handleSave = async () => {
    if (!validate()) return;

    const parsed = parseForm(formData);
    setSaving(true);
    setError(null);
    try {
      if (editingRoute) await apiPatch<Route>(`/routes/${editingRoute.id}`, parsed);
      else await apiPost<Route>('/routes', parsed);
      setLocalRoutes(await apiGet<Route[]>('/routes'));
      setSuccess(`Route ${editingRoute ? 'updated' : 'saved'} to the backend and list refreshed.`);
      closeModal();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('Unable to save route'));
    } finally {
      setSaving(false);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<Route>[] = [
    {
      key:    'routeCode',
      label:  'Route Code',
      render: (r) => (
            <span className="font-mono font-bold text-blue-800">{r.routeCode}</span>
      ),
    },
    { key: 'origin',      label: 'Origin' },
    { key: 'destination', label: 'Destination' },
    {
      key:    'stops',
      label:  'Stops',
      render: (r) => <StopsBadge stops={r.stops} />,
    },
    {
      key:    'distanceKm',
      label:  'Distance',
      render: (r) => `${r.distanceKm} km`,
    },
    {
      key:    'estimatedMinutes',
      label:  'Duration',
      render: (r) => `${r.estimatedMinutes} mins`,
    },
    {
      key:    'fareAmount',
      label:  'Fare',
      render: (r) => (
        <span className="font-semibold text-green-700">{formatFare(r.fareAmount)}</span>
      ),
    },
    {
      key:    'isActive',
      label:  'Status',
      render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (route) => <button type="button" aria-label={`Edit Route ${route.routeCode}`} title="Edit route" onClick={() => openEditModal(route)} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-700"><Pencil size={13} />Edit</button>,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} active route{activeCount !== 1 ? 's' : ''} &nbsp;·&nbsp;
            {inactiveCount} inactive
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          style={{ backgroundColor: '#0f2044' }}
        >
          <Plus size={16} />
          Add Route
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{error.message}</p>
          {error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}
        </div>
      )}
      {success && <p role="status" className="fixed right-4 top-20 z-40 max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg sm:right-6">{success}</p>}

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        {/* Standalone page fallback; the App shell supplies the shared search field. */}
        {onSearchValueChange === undefined && <div className="flex-1">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by code, origin, destination or stop…"
          />
        </div>}

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 shrink-0">
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => {
            const count =
              f === 'all'      ? localRoutes.length :
              f === 'active'   ? activeCount        :
                                 inactiveCount;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`
                  px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-100
                  ${activeFilter === f
                    ? 'bg-blue-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'}
                `}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Data table ───────────────────────────────────────────────────── */}
      <div className="hidden max-h-[70vh] overflow-auto md:block"><DataTable<Route> columns={columns} data={filteredRoutes} loading={loading} emptyMessage="No routes match your search or filter." /></div>
      <div className="grid max-h-[70vh] gap-3 overflow-y-auto md:hidden" aria-label="Route cards">
        {loading ? [0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-lg bg-gray-100" />)
          : filteredRoutes.length === 0 ? <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500"><Inbox size={28} strokeWidth={1.5} /><p>No routes match your search or filter on this screen.</p></div>
            : filteredRoutes.map((route) => <article key={route.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-bold text-blue-800">{route.routeCode}</p><h3 className="mt-1 flex flex-wrap items-center gap-1 font-semibold text-gray-900"><span>{route.origin}</span><ArrowRight size={15} className="text-blue-800" /><span>{route.destination}</span></h3></div><StatusBadge status={route.isActive ? 'active' : 'inactive'} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600"><span>{route.distanceKm} km</span><span>{route.estimatedMinutes} mins</span><span>{formatFare(route.fareAmount)}</span><span>{route.stops.length} stop(s)</span></div><div className="mt-4 flex justify-end"><button type="button" onClick={() => openEditModal(route)} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-blue-50"><Pencil size={14} />Edit</button></div></article>)}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={closeModal}
        title={editingRoute ? `Edit Route ${editingRoute.routeCode}` : 'Add New Route'}
        size="lg"
      >
        <div className="space-y-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error.message}</div>}
          {/* Row 1: Route Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Route Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.routeCode}
              onChange={(e) => handleField('routeCode', e.target.value)}
              placeholder="e.g. R009"
              className={`
                w-full rounded-lg border px-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                ${formErrors.routeCode ? 'border-red-400' : 'border-gray-200'}
              `}
            />
            {formErrors.routeCode && (
              <p className="text-red-500 text-xs mt-0.5">{formErrors.routeCode}</p>
            )}
          </div>

          {/* Row 2: Origin + Destination */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Origin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => handleField('origin', e.target.value)}
                placeholder="e.g. Colombo Fort"
                className={`
                  w-full rounded-lg border px-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                  ${formErrors.origin ? 'border-red-400' : 'border-gray-200'}
                `}
              />
              {formErrors.origin && (
                <p className="text-red-500 text-xs mt-0.5">{formErrors.origin}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => handleField('destination', e.target.value)}
                placeholder="e.g. Kandy"
                className={`
                  w-full rounded-lg border px-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                  ${formErrors.destination ? 'border-red-400' : 'border-gray-200'}
                `}
              />
              {formErrors.destination && (
                <p className="text-red-500 text-xs mt-0.5">{formErrors.destination}</p>
              )}
            </div>
          </div>

          {/* Ordered optional stops */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-gray-700">Route stops (optional)</legend>
            {formData.stops.map((stop, index) => (
              <div key={index} className="flex gap-2">
                <label className="sr-only" htmlFor={`route-stop-${index}`}>Stop {index + 1}</label>
                <input
                  id={`route-stop-${index}`}
                  type="text"
                  value={stop}
                  onChange={(event) => setFormData((previous) => ({ ...previous, stops: previous.stops.map((value, stopIndex) => stopIndex === index ? event.target.value : value) }))}
                  placeholder={`Stop ${index + 1}`}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button type="button" onClick={() => setFormData((previous) => ({ ...previous, stops: previous.stops.filter((_, stopIndex) => stopIndex !== index) }))} aria-label={`Remove stop ${index + 1}`} title="Remove stop" className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-700"><X size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setFormData((previous) => ({ ...previous, stops: [...previous.stops, ''] }))} className="text-sm font-medium text-blue-700 hover:text-blue-900">Add stop</button>
          </fieldset>

          {/* Row 4: Distance + Duration */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Distance (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.distanceKm}
                onChange={(e) => handleField('distanceKm', e.target.value)}
                placeholder="e.g. 115"
                className={`
                  w-full rounded-lg border px-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                  ${formErrors.distanceKm ? 'border-red-400' : 'border-gray-200'}
                `}
              />
              {formErrors.distanceKm && (
                <p className="text-red-500 text-xs mt-0.5">{formErrors.distanceKm}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Duration (mins) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.estimatedMinutes}
                onChange={(e) => handleField('estimatedMinutes', e.target.value)}
                placeholder="e.g. 165"
                className={`
                  w-full rounded-lg border px-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                  ${formErrors.estimatedMinutes ? 'border-red-400' : 'border-gray-200'}
                `}
              />
              {formErrors.estimatedMinutes && (
                <p className="text-red-500 text-xs mt-0.5">{formErrors.estimatedMinutes}</p>
              )}
            </div>
          </div>

          {/* Row 5: Fare + Active checkbox */}
          <div className="grid grid-cols-1 gap-3 items-end sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Fare Amount (LKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.fareAmount}
                onChange={(e) => handleField('fareAmount', e.target.value)}
                placeholder="e.g. 350"
                className={`
                  w-full rounded-lg border px-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                  ${formErrors.fareAmount ? 'border-red-400' : 'border-gray-200'}
                `}
              />
              {formErrors.fareAmount && (
                <p className="text-red-500 text-xs mt-0.5">{formErrors.fareAmount}</p>
              )}
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleField('isActive', e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                Active route
              </label>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="
                px-4 py-2 rounded-lg text-sm font-medium
                text-gray-600 bg-gray-100 hover:bg-gray-200
                transition-colors duration-100
              "
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="
                px-4 py-2 rounded-lg text-sm font-semibold text-white
                transition-opacity duration-150 hover:opacity-90
              "
              style={{ backgroundColor: '#0f2044' }}
            >
              {saving ? 'Saving…' : editingRoute ? 'Save Route' : 'Add Route'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Routes;
