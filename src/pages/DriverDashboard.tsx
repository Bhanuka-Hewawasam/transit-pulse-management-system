// File: d:\Projects\DM-Project\transit-pulse-management-system\src\pages\DriverDashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Star,
  Users,
  X,
  Play,
  AlertTriangle,
  Sparkles,
  LockKeyhole,
  Upload,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import SearchableSelect from '../components/SearchableSelect';
import { ApiError, API_BASE_URL, apiGet } from '../services/api';
import type { Driver } from '../types';

export type DriverTab = 'trips' | 'vehicle' | 'feedback' | 'profile';
type TripFilter = 'upcoming' | 'in_progress' | 'completed';

interface DriverDashboardProps {
  inSharedLayout?: boolean;
  activeTab?: DriverTab;
  onTabChange?: (tab: DriverTab) => void;
  driverId?: string;
  onDriverIdChange?: (id: string) => void;
  onSelectPropsChange?: (props: {
    value: string;
    onChange: (val: string) => void;
    options: Array<{ value: string; label: string; secondaryLabel?: string; initials?: string }>;
    placeholder: string;
    ariaLabel: string;
    selectedName?: string;
  }) => void;
  onModeChange?: (mode: 'oracle' | 'demo') => void;
}

type DriverSummary = {
  driverId: number;
  firstName: string;
  lastName: string;
  status: string;
  licenseExpiry: string;
  todayTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  averageRating: number | null;
  ratingCount: number;
};

type DriverTrip = {
  tripId: number;
  routeCode: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  availableSeats: number;
  totalSeats: number;
  vehicleRegistration: string;
  seatsBooked: number;
  canStart: boolean;
  canComplete: boolean;
};

type ManifestPassenger = {
  bookingId: number;
  passengerId: number;
  passengerName: string;
  phone: string | null;
  seatNumber: string;
  bookingStatus: string;
  paymentStatus: string;
};

type DriverVehicle = {
  vehicleId: number;
  registrationNumber: string;
  make: string;
  model: string;
  vehicleType: string;
  seatingCapacity: number;
  fuelType: string;
  status: string;
  nextMaintenanceDate: string | null;
};

type DriverFeedback = {
  averageRating: number | null;
  ratingCount: number;
  recentComments: Array<{
    feedbackId: number;
    tripId: number;
    rating: number;
    comment: string | null;
    feedbackDate: string | null;
  }>;
};

type DriverProfile = {
  driverId: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string;
  licenseExpiry: string;
  status: string;
  rating: number;
  totalTrips: number;
};

type Toast = { kind: 'success' | 'error'; message: string };
type ConfirmAction = { kind: 'start' | 'complete'; trip: DriverTrip };

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const formatDay = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const routeTitle = (trip: Pick<DriverTrip, 'origin' | 'destination' | 'routeCode'>) => `${trip.routeCode} · ${trip.origin} to ${trip.destination}`;
const moneylessRating = (rating: number | null) => rating === null ? 'No ratings' : `${rating.toFixed(2)}/5`;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

async function driverApi<T>(driverId: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Driver-Id', driverId);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  } catch (error) {
    throw new ApiError('The backend could not be reached. Check the connection and try again.', 0, error instanceof Error ? error.message : 'Network request failed');
  }
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, message);
  }
  return body as T;
}

const FocusTrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(container.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement as HTMLElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, []);
  return <div ref={container}>{children}</div>;
};

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 shadow-2xs">
    <span className="text-blue-700">{icon}</span>
    <p className="text-sm font-medium text-slate-600">{message}</p>
  </div>
);

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all duration-200 hover:shadow-xs">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="rounded-lg bg-blue-50 p-2 text-blue-700">{icon}</span>
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
  </article>
);

const RatingStars: React.FC<{ rating: number | null; label: string }> = ({ rating, label }) => (
  <span className="inline-flex items-center gap-1" aria-label={label}>
    {[1, 2, 3, 4, 5].map((value) => (
      <Star
        key={value}
        size={15}
        className={rating !== null && rating >= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
      />
    ))}
  </span>
);

const DriverDashboard: React.FC<DriverDashboardProps> = ({
  inSharedLayout = false,
  activeTab: externalActiveTab,
  onTabChange,
  driverId: externalDriverId,
  onDriverIdChange,
  onSelectPropsChange,
  onModeChange,
}) => {
  const [mode, setMode] = useState<'oracle' | 'demo' | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [internalDriverId, setInternalDriverId] = useState('');
  const driverId = externalDriverId ?? internalDriverId;

  const setDriverId = (id: string) => {
    if (onDriverIdChange) onDriverIdChange(id);
    else setInternalDriverId(id);
  };

  const [summary, setSummary] = useState<DriverSummary | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState({ phone: '', email: '' });
  const [trips, setTrips] = useState<Record<TripFilter, DriverTrip[]>>({ upcoming: [], in_progress: [], completed: [] });
  const [vehicle, setVehicle] = useState<DriverVehicle | null>(null);
  const [feedback, setFeedback] = useState<DriverFeedback>({ averageRating: null, ratingCount: 0, recentComments: [] });
  const [manifest, setManifest] = useState<ManifestPassenger[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTripId, setSavingTripId] = useState<number | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaTripId, setMediaTripId] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const mediaInput = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [internalActiveTab, setInternalActiveTab] = useState<DriverTab>('trips');
  const activeTab = externalActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: DriverTab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalActiveTab(tab);
  };

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [manifestTrip, setManifestTrip] = useState<DriverTrip | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases').then(async (health) => {
      if (!active) return;
      setMode(health.mode);
      if (onModeChange) onModeChange(health.mode);
      const list = await apiGet<Driver[]>('/drivers');
      if (active) setDrivers(list);
    }).catch((error: Error) => { if (active) setToast({ kind: 'error', message: error.message }); })
      .finally(() => { if (active) setBootstrapLoading(false); });
    return () => { active = false; };
  }, []);

  // Sync SearchableSelect props up to Top Bar Header
  useEffect(() => {
    if (!onSelectPropsChange) return;
    const selectedDriver = drivers.find(d => String(d.id) === String(driverId));
    const selectedName = selectedDriver ? `${selectedDriver.firstName} ${selectedDriver.lastName}` : undefined;

    onSelectPropsChange({
      value: driverId,
      onChange: (val: string) => selectDriver(val),
      options: drivers.map((d) => ({
        value: String(d.id),
        label: `${d.firstName} ${d.lastName}`,
        secondaryLabel: `#${d.id} · ${d.email || d.phone || 'No contact'}`,
        initials: `${d.firstName[0]}${d.lastName[0]}`,
      })),
      placeholder: 'Select driver',
      ariaLabel: 'Driver profile',
      selectedName,
    });
  }, [drivers, driverId, onSelectPropsChange]);

  useEffect(() => {
    if (!driverId || !mode) {
      setSummary(null); setProfile(null); setVehicle(null); setFeedback({ averageRating: null, ratingCount: 0, recentComments: [] });
      setTrips({ upcoming: [], in_progress: [], completed: [] });
      return;
    }
    let active = true;
    setLoading(true);
    setToast(null);
    Promise.all([
      driverApi<DriverSummary>(driverId, '/driver/summary'),
      driverApi<DriverTrip[]>(driverId, '/driver/trips?filter=upcoming'),
      driverApi<DriverTrip[]>(driverId, '/driver/trips?filter=in_progress'),
      driverApi<DriverTrip[]>(driverId, '/driver/trips?filter=completed'),
      driverApi<DriverVehicle | null>(driverId, '/driver/vehicle'),
      driverApi<DriverFeedback>(driverId, '/driver/feedback-summary'),
      driverApi<DriverProfile>(driverId, '/driver/profile'),
    ]).then(([summaryResult, upcoming, inProgress, completed, vehicleResult, feedbackResult, profileResult]) => {
      if (!active) return;
      setSummary(summaryResult);
      setTrips({ upcoming, in_progress: inProgress, completed });
      setVehicle(vehicleResult);
      setFeedback(feedbackResult);
      setProfile(profileResult);
      setProfileDraft({ phone: profileResult.phone ?? '', email: profileResult.email ?? '' });
    }).catch((error: Error) => {
      if (active) setToast({ kind: 'error', message: error.message });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [driverId, mode, reload]);

  const selectDriver = (value: string | number) => {
    setDriverId(String(value)); setSummary(null); setProfile(null); setVehicle(null); setManifest([]);
    setMediaTripId(''); setMediaFile(null); setMediaCaption('');
    setToast(null); setErrors({});
  };

  const refreshDriver = () => setReload((value) => value + 1);

  const openManifest = async (trip: DriverTrip) => {
    setManifestTrip(trip); setManifest([]); setManifestLoading(true);
    try { setManifest(await driverApi<ManifestPassenger[]>(driverId, `/driver/trips/${trip.tripId}/manifest`)); }
    catch (error) { setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Passenger manifest could not be loaded.' }); }
    finally { setManifestLoading(false); }
  };

  const confirmTripAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setSavingTripId(action.trip.tripId);
    try {
      await driverApi(driverId, `/driver/trips/${action.trip.tripId}/${action.kind}`, { method: 'POST' });
      setConfirmAction(null);
      setToast({ kind: 'success', message: action.kind === 'start' ? 'Trip started.' : 'Trip completed.' });
      refreshDriver();
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Trip could not be updated.' });
    } finally { setSavingTripId(null); }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (profileDraft.phone.length > 20) nextErrors.phone = 'Phone must be 20 characters or fewer.';
    if (profileDraft.email.length > 100) nextErrors.email = 'Email must be 100 characters or fewer.';
    if (profileDraft.email && !emailPattern.test(profileDraft.email)) nextErrors.email = 'Enter a valid email address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const saved = await driverApi<DriverProfile>(driverId, '/driver/profile', { method: 'PUT', body: JSON.stringify({ phone: profileDraft.phone.trim() || null, email: profileDraft.email.trim() || null }) });
      setProfile(saved);
      setToast({ kind: 'success', message: 'Driver profile saved.' });
    } catch (error) { setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Profile could not be saved.' }); }
    finally { setSaving(false); }
  };

  const assignedTrips = [...new Map(Object.values(trips).flat().map((trip) => [trip.tripId, trip])).values()];
  const selectedMediaTripId = assignedTrips.some((trip) => String(trip.tripId) === mediaTripId)
    ? mediaTripId
    : String(assignedTrips[0]?.tripId ?? '');

  const uploadTripMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mediaFile || !selectedMediaTripId) return;
    setUploadingMedia(true);
    try {
      await driverApi(driverId, `/driver/trips/${selectedMediaTripId}/media?caption=${encodeURIComponent(mediaCaption.trim())}`, {
        method: 'POST',
        headers: { 'Content-Type': mediaFile.type },
        body: mediaFile,
      });
      setMediaFile(null);
      setMediaCaption('');
      if (mediaInput.current) mediaInput.current.value = '';
      setToast({ kind: 'success', message: 'Trip image uploaded.' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Trip image could not be uploaded.' });
    } finally { setUploadingMedia(false); }
  };

  const tripsFor = (filter: TripFilter) => trips[filter];
  const todayTrips = summary?.todayTrips ?? 0;
  const upcomingTrips = summary?.upcomingTrips ?? tripsFor('upcoming').length;
  const completedTrips = summary?.completedTrips ?? tripsFor('completed').length;
  const averageRating = feedback.averageRating;
  const tabs: Array<{ id: DriverTab; label: string; icon: React.ReactNode }> = [
    { id: 'trips', label: 'My trips', icon: <CalendarDays size={16} /> },
    { id: 'vehicle', label: 'Vehicle', icon: <CarFront size={16} /> },
    { id: 'feedback', label: 'Feedback', icon: <Star size={16} /> },
    { id: 'profile', label: 'Profile', icon: <Users size={16} /> },
  ];

  const tripCard = (trip: DriverTrip) => (
    <article key={trip.tripId} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all duration-200 hover:shadow-xs">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span>{trip.origin}</span>
              <ArrowRight size={17} className="shrink-0 text-blue-700" />
              <span>{trip.destination}</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{trip.routeCode} · Trip #{trip.tripId}</p>
          </div>
          <StatusBadge status={trip.status} type="trip" />
        </div>

        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 pt-2 border-t border-slate-100">
          <p className="flex items-center gap-2 font-medium">
            <CalendarDays size={15} className="shrink-0 text-blue-700" />
            {formatDate(trip.departureTime)}
          </p>
          <p className="flex items-center gap-2 font-medium">
            <CarFront size={15} className="shrink-0 text-blue-700" />
            {trip.vehicleRegistration}
          </p>
          <p className="flex items-center gap-2 font-medium sm:col-span-2">
            <Users size={15} className="shrink-0 text-blue-700" />
            <span className="font-bold text-slate-900">{trip.seatsBooked} / {trip.totalSeats}</span> passengers booked
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {trip.canStart && (
          <button
            type="button"
            onClick={() => setConfirmAction({ kind: 'start', trip })}
            disabled={savingTripId === trip.tripId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {savingTripId === trip.tripId ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            Start trip
          </button>
        )}
        {trip.canComplete && (
          <button
            type="button"
            onClick={() => setConfirmAction({ kind: 'complete', trip })}
            disabled={savingTripId === trip.tripId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {savingTripId === trip.tripId ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Complete trip
          </button>
        )}
        <button
          type="button"
          onClick={() => void openManifest(trip)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <Users size={14} />
          View passengers
        </button>
      </div>
    </article>
  );

  const tripSection = (title: string, filter: TripFilter, icon: React.ReactNode) => (
    <section className="space-y-3" aria-labelledby={`driver-${filter}-heading`}>
      <div className="flex items-center gap-2">
        <span className="text-blue-700">{icon}</span>
        <h3 id={`driver-${filter}-heading`} className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{tripsFor(filter).length}</span>
      </div>
      {tripsFor(filter).length ? (
        <div className="grid gap-4 lg:grid-cols-2">{tripsFor(filter).map(tripCard)}</div>
      ) : (
        <EmptyState icon={icon} message={`No ${title.toLowerCase()} trips currently assigned.`} />
      )}
    </section>
  );

  const expiryDays = profile ? Math.ceil((new Date(profile.licenseExpiry).getTime() - Date.now()) / 86_400_000) : null;
  const maintenanceDays = vehicle?.nextMaintenanceDate ? Math.ceil((new Date(vehicle.nextMaintenanceDate).getTime() - Date.now()) / 86_400_000) : null;

  return (
    <div className="space-y-6">
      {/* ── Driver Header Banner ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
            <Sparkles size={13} /> Driver Portal
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {summary ? `Welcome, ${summary.firstName}` : 'Driver Dashboard'}
          </h1>
          <p className="mt-1 text-xs text-slate-600">Your assigned bus services, vehicle status, passenger manifest, and ratings.</p>
          {summary && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={summary.status} type="driver" />
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg">
                <RatingStars rating={averageRating} label={`Live average rating ${moneylessRating(averageRating)}`} />
                <span className="text-xs font-bold text-slate-900">{moneylessRating(averageRating)}</span>
                <span className="text-xs text-slate-500">({feedback.ratingCount})</span>
              </div>
            </div>
          )}
        </div>

        {!inSharedLayout && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500" role="status">
              {mode === 'oracle' ? 'Oracle mode' : mode === 'demo' ? 'Demo mode' : 'Connecting'}
            </span>
            <SearchableSelect
              value={driverId}
              onChange={selectDriver}
              options={drivers.map((d) => ({
                value: String(d.id),
                label: `${d.firstName} ${d.lastName}`,
                secondaryLabel: `#${d.id} · ${d.email || d.phone || 'No contact'}`,
                initials: `${d.firstName[0]}${d.lastName[0]}`,
              }))}
              placeholder="Select driver"
              className="w-64"
              ariaLabel="Driver profile"
            />
          </div>
        )}
      </header>

      {/* ── Summary Cards ── */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Driver summary">
        <SummaryCard icon={<CalendarDays size={18} />} label="Today's trips" value={todayTrips} />
        <SummaryCard icon={<Clock3 size={18} />} label="Upcoming trips" value={upcomingTrips} />
        <SummaryCard icon={<CheckCircle2 size={18} />} label="Completed trips" value={completedTrips} />
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all duration-200 hover:shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average rating</span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-600"><Star size={18} className="fill-amber-400" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{moneylessRating(averageRating)}</p>
          <div className="mt-1 flex items-center justify-between">
            <RatingStars rating={averageRating} label={`Average rating ${moneylessRating(averageRating)}`} />
            <span className="text-xs text-slate-500">{feedback.ratingCount} rating(s)</span>
          </div>
        </article>
      </section>

      {bootstrapLoading && <div className="h-12 animate-pulse rounded-xl bg-slate-200" aria-label="Loading driver dashboard" />}
      {toast && (
        <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-xs font-semibold ${toast.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setToast(null)} className="rounded-md p-1 hover:bg-black/5"><X size={15} /></button>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Driver dashboard sections">
        <div className="flex min-w-max gap-2 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`driver-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Panels ── */}
      <div id={`driver-panel-${activeTab}`} role="tabpanel" className="min-h-64">
        {activeTab === 'trips' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">My assigned trips</h2>
              <p className="text-xs text-slate-500">Start trips authorized by dispatch and manage active service status.</p>
            </div>
            {loading ? (
              <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading trips">
                {[0, 1].map((item) => <div key={item} className="h-44 animate-pulse rounded-xl bg-slate-200" />)}
              </div>
            ) : !driverId ? (
              <EmptyState icon={<CalendarDays size={24} />} message="Select a driver profile from the top bar to view assigned trips." />
            ) : (
              <>
                {tripSection('In progress', 'in_progress', <Clock3 size={18} />)}
                {tripSection('Upcoming', 'upcoming', <CalendarDays size={18} />)}
                {tripSection('Completed', 'completed', <CheckCircle2 size={18} />)}
              </>
            )}
            <section className="space-y-3 border-t border-slate-200 pt-5" aria-labelledby="driver-trip-media-heading">
              <div>
                <h2 id="driver-trip-media-heading" className="text-base font-bold text-slate-900">Trip Media Upload</h2>
                <p className="text-xs text-slate-500">Add an image to one of your assigned trips.</p>
              </div>
              {!driverId ? (
                <EmptyState icon={<Upload size={22} />} message="Select a driver profile to upload trip media." />
              ) : assignedTrips.length === 0 ? (
                <EmptyState icon={<Upload size={22} />} message="No assigned trips are available for media upload." />
              ) : (
                <form onSubmit={uploadTripMedia} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span>Assigned trip</span>
                    <select required value={mediaTripId || String(assignedTrips[0].tripId)} onChange={(event) => setMediaTripId(event.target.value)} className={inputClass}>
                      {assignedTrips.map((trip) => <option key={trip.tripId} value={trip.tripId}>{routeTitle(trip)} · Trip #{trip.tripId}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span>Image</span>
                    <input ref={mediaInput} required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-800`} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                    <span>Caption <span className="font-normal text-slate-500">(optional)</span></span>
                    <input value={mediaCaption} maxLength={300} onChange={(event) => setMediaCaption(event.target.value)} className={inputClass} />
                  </label>
                  <div className="flex items-center justify-between gap-3 sm:col-span-2">
                    <span className="truncate text-xs text-slate-500">{mediaFile ? mediaFile.name : 'JPEG, PNG, or WebP · 8 MB maximum'}</span>
                    <button type="submit" disabled={uploadingMedia || !mediaFile} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                      <Upload size={14} />{uploadingMedia ? 'Uploading…' : 'Upload image'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </section>
        )}

        {activeTab === 'vehicle' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assigned bus vehicle</h2>
              <p className="text-xs text-slate-500">Bus specs, seating capacity, and scheduled maintenance warning status.</p>
            </div>
            {loading ? (
              <div className="h-48 animate-pulse rounded-xl bg-slate-200" aria-label="Loading vehicle" />
            ) : !driverId ? (
              <EmptyState icon={<CarFront size={24} />} message="Select a driver profile to view assigned vehicle information." />
            ) : !vehicle ? (
              <EmptyState icon={<CarFront size={24} />} message="No active vehicle assignment registered for this driver." />
            ) : (
              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{vehicle.vehicleType}</span>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{vehicle.registrationNumber}</h3>
                    <p className="text-xs font-medium text-slate-600">{vehicle.make} {vehicle.model}</p>
                  </div>
                  <StatusBadge status={vehicle.status} type="vehicle" />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Seating Capacity</p>
                    <p className="mt-1 text-base font-bold text-slate-900">{vehicle.seatingCapacity} seats</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fuel Type</p>
                    <p className="mt-1 text-base font-bold capitalize text-slate-900">{vehicle.fuelType}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Maintenance</p>
                    <p className="mt-1 text-base font-bold text-slate-900">{formatDay(vehicle.nextMaintenanceDate)}</p>
                  </div>
                </div>

                {/* Prominent maintenance warning badge if due within 14 days */}
                {maintenanceDays !== null && maintenanceDays <= 14 && (
                  <div className={`flex items-center gap-3 rounded-xl p-4 border text-xs font-semibold ${
                    maintenanceDays < 0
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    <AlertTriangle size={20} className={`shrink-0 ${maintenanceDays < 0 ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div>
                      <p className="font-bold text-sm">
                        {maintenanceDays < 0 ? 'Maintenance Overdue!' : 'Upcoming Maintenance Notice'}
                      </p>
                      <p className="font-medium mt-0.5">
                        {maintenanceDays < 0
                          ? `Scheduled maintenance is ${Math.abs(maintenanceDays)} day(s) overdue.`
                          : maintenanceDays === 0
                          ? 'Vehicle maintenance is due today.'
                          : `Vehicle maintenance scheduled in ${maintenanceDays} day(s).`}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            )}
          </section>
        )}

        {activeTab === 'feedback' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Passenger feedback & rating</h2>
              <p className="text-xs text-slate-500">Live rating breakdown and verified passenger reviews.</p>
            </div>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-slate-200" aria-label="Loading feedback" />
            ) : !driverId ? (
              <EmptyState icon={<MessageSquareText size={24} />} message="Select a driver profile to view feedback." />
            ) : feedback.ratingCount === 0 ? (
              <EmptyState icon={<MessageSquareText size={24} />} message="No feedback ratings submitted yet for this driver." />
            ) : (
              <>
                <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Driver Rating</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">{moneylessRating(feedback.averageRating)}</p>
                  </div>
                  <div className="text-right">
                    <RatingStars rating={feedback.averageRating} label={`Average rating ${moneylessRating(feedback.averageRating)}`} />
                    <p className="mt-1 text-xs font-semibold text-slate-500">{feedback.ratingCount} rating(s) received</p>
                  </div>
                </article>

                <div className="grid gap-4 lg:grid-cols-2">
                  {feedback.recentComments.map((item) => (
                    <article key={item.feedbackId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                        <RatingStars rating={item.rating} label={`${item.rating} out of 5 stars`} />
                        <time className="text-xs font-medium text-slate-400">{formatDate(item.feedbackDate)}</time>
                      </div>
                      <p className="text-xs text-slate-700 italic">"{item.comment?.trim() || 'No comment provided.'}"</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-base font-bold text-slate-900">Driver profile</h2>
              <p className="text-xs text-slate-500">Update phone and email. License number, status, and rating are read-only.</p>
            </div>
            {loading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
            ) : !profile ? (
              <EmptyState icon={<Users size={24} />} message="Select a driver profile to view details." />
            ) : (
              <form onSubmit={saveProfile} noValidate className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white shadow-sm">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{profile.firstName} {profile.lastName}</h3>
                    <p className="text-xs font-medium text-slate-500">License #{profile.licenseNumber}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">First name <LockKeyhole size={12} className="text-slate-400" /></span>
                    <input value={profile.firstName} readOnly className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} aria-label="First name" />
                  </label>

                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">Last name <LockKeyhole size={12} className="text-slate-400" /></span>
                    <input value={profile.lastName} readOnly className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} aria-label="Last name" />
                  </label>

                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span>Phone number</span>
                    <input
                      value={profileDraft.phone}
                      onChange={(e) => { setProfileDraft(curr => ({ ...curr, phone: e.target.value })); setErrors(curr => ({ ...curr, phone: '' })); }}
                      className={inputClass}
                      aria-label="Phone"
                      aria-invalid={Boolean(errors.phone)}
                    />
                    {errors.phone && <span className="text-xs font-semibold text-rose-600">{errors.phone}</span>}
                  </label>

                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span>Email address</span>
                    <input
                      type="email"
                      value={profileDraft.email}
                      onChange={(e) => { setProfileDraft(curr => ({ ...curr, email: e.target.value })); setErrors(curr => ({ ...curr, email: '' })); }}
                      className={inputClass}
                      aria-label="Email"
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && <span className="text-xs font-semibold text-rose-600">{errors.email}</span>}
                  </label>

                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">License Number <LockKeyhole size={12} className="text-slate-400" /></span>
                    <input value={profile.licenseNumber} readOnly className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} aria-label="License number" />
                  </label>

                  <div className="space-y-1 text-xs font-semibold text-slate-700">
                    <span className="block">License Expiry</span>
                    <div className="flex items-center gap-2">
                      <input value={formatDay(profile.licenseExpiry)} readOnly className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} aria-label="License expiry" />
                      {expiryDays !== null && expiryDays <= 30 && <StatusBadge status={expiryDays < 0 ? 'overdue' : 'pending'} type="driver" />}
                    </div>
                  </div>

                  <label className="space-y-1 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">Driver Rating <LockKeyhole size={12} className="text-slate-400" /></span>
                    <input value={moneylessRating(feedback.averageRating)} readOnly className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} aria-label="Driver rating" />
                  </label>

                  <div className="space-y-1 text-xs font-semibold text-slate-700">
                    <span className="block">Current Duty Status</span>
                    <div className="pt-1"><StatusBadge status={profile.status} type="driver" /></div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-800 disabled:opacity-60"
                  >
                    {saving ? 'Saving profile…' : 'Save profile'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>

      {/* ── Dialog Modals ── */}
      <Modal isOpen={Boolean(confirmAction)} onClose={() => { if (!savingTripId) setConfirmAction(null); }} title={confirmAction?.kind === 'start' ? 'Start trip?' : 'Complete trip?'} size="sm">
        {confirmAction && (
          <FocusTrap>
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                {confirmAction.kind === 'start'
                  ? 'Confirm that you are beginning this scheduled bus service.'
                  : 'Confirm that this trip has completed. Passenger booking statuses will be finalized.'}
              </p>
              <p className="font-bold text-slate-900 text-sm">{routeTitle(confirmAction.trip)}</p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingTripId === confirmAction.trip.tripId}
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={savingTripId === confirmAction.trip.tripId}
                  onClick={() => void confirmTripAction()}
                  className={`rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-2xs ${
                    confirmAction.kind === 'start' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  {savingTripId === confirmAction.trip.tripId ? 'Saving…' : `Confirm ${confirmAction.kind}`}
                </button>
              </div>
            </div>
          </FocusTrap>
        )}
      </Modal>

      <Modal isOpen={Boolean(manifestTrip)} onClose={() => setManifestTrip(null)} title={manifestTrip ? `Passengers · ${manifestTrip.routeCode}` : 'Passengers'} size="lg">
        <FocusTrap>
          {manifestLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-200" aria-label="Loading passengers" />
          ) : manifest.length === 0 ? (
            <EmptyState icon={<Users size={24} />} message="No passengers are currently booked for this trip." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-xs font-bold text-blue-900">Total Booked Passengers</span>
                <span className="rounded-full bg-blue-700 px-3 py-0.5 text-xs font-bold text-white">{manifest.length}</span>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <DataTable<ManifestPassenger>
                  columns={[
                    {
                      key: 'passengerName',
                      label: 'Passenger',
                      render: (row) => (
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                            {row.passengerName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900">{row.passengerName}</span>
                        </div>
                      ),
                    },
                    { key: 'seatNumber', label: 'Seat', render: (row) => <span className="font-bold text-slate-900">#{row.seatNumber}</span> },
                    { key: 'phone', label: 'Phone', render: (row) => row.phone ?? '—' },
                    { key: 'bookingStatus', label: 'Booking', render: (row) => <StatusBadge status={row.bookingStatus} type="booking" /> },
                    { key: 'paymentStatus', label: 'Payment', render: (row) => <StatusBadge status={row.paymentStatus} type="payment" /> },
                  ]}
                  data={manifest}
                  emptyMessage="No passengers are booked for this trip."
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {manifest.map((person) => (
                  <article key={person.bookingId} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900">{person.passengerName}</p>
                      <span className="text-xs font-bold text-blue-700">Seat {person.seatNumber}</span>
                    </div>
                    <p className="text-xs text-slate-500">{person.phone ?? 'No phone listed'}</p>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <StatusBadge status={person.bookingStatus} type="booking" />
                      <StatusBadge status={person.paymentStatus} type="payment" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </FocusTrap>
      </Modal>
    </div>
  );
};

export default DriverDashboard;
