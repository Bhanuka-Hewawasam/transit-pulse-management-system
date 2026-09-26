// File: src/pages/Routes.tsx
// SmartMove Transport Solutions — Routes Management Page
// Displays all transport routes with search, status filter, add/edit modal,
// stop-count badges with tooltip, and an inline toggle-status button.

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, MapPin, X } from 'lucide-react';

import type { Route } from '../types';
import { ApiError, apiGet, apiPost } from '../services/api';

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

const Routes: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [localRoutes,   setLocalRoutes]   = useState<Route[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<Error | null>(null);
  const [success,       setSuccess]       = useState('');
  const [searchTerm,    setSearchTerm]    = useState('');
  const [activeFilter,  setActiveFilter]  = useState<ActiveFilter>('all');
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [formData,      setFormData]      = useState<RouteFormData>(EMPTY_FORM);
  const [formErrors,    setFormErrors]    = useState<Partial<RouteFormData>>({});

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
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setError(null);
    setSuccess('');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
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

  /** Save a new route through the backend API. */
  const handleSave = async () => {
    if (!validate()) return;

    const parsed = parseForm(formData);
    try {
      await apiPost<Route>('/routes', parsed);
      setLocalRoutes(await apiGet<Route[]>('/routes'));
      setSuccess('Route saved to the backend and list refreshed.');
      closeModal();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('Unable to create route'));
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<Route>[] = [
    {
      key:    'routeCode',
      label:  'Route Code',
      render: (r) => (
        <span className="font-mono font-bold text-blue-700">{r.routeCode}</span>
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
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg
            text-sm font-semibold text-white shadow-sm
            transition-opacity duration-150 hover:opacity-90
          "
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
      {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex-1">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by code, origin, destination or stop…"
          />
        </div>

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
                    ? 'bg-blue-600 text-white'
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
      <DataTable<Route>
        columns={columns}
        data={filteredRoutes}
        loading={loading}
        emptyMessage="No routes match your search or filter."
      />

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={closeModal}
        title="Add New Route"
        size="lg"
      >
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3 items-end">
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
              className="
                px-4 py-2 rounded-lg text-sm font-semibold text-white
                transition-opacity duration-150 hover:opacity-90
              "
              style={{ backgroundColor: '#0f2044' }}
            >
              Add Route
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Routes;
