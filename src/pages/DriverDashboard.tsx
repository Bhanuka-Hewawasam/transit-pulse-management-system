import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, CarFront, CheckCircle2, Clock3, MessageSquareText, Star, Users, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import SearchableSelect from '../components/SearchableSelect';
import { ApiError, API_BASE_URL, apiGet } from '../services/api';
import type { Driver } from '../types';

type DriverTab = 'trips' | 'vehicle' | 'feedback' | 'profile';
type TripFilter = 'upcoming' | 'in_progress' | 'completed';
type DriverSummary = {
  driverId: number; firstName: string; lastName: string; status: string; licenseExpiry: string;
  todayTrips: number; upcomingTrips: number; completedTrips: number; averageRating: number | null; ratingCount: number;
};
type DriverTrip = {
  tripId: number; routeCode: string; origin: string; destination: string; departureTime: string; arrivalTime: string;
  status: string; availableSeats: number; totalSeats: number; vehicleRegistration: string;
  seatsBooked: number; canStart: boolean; canComplete: boolean;
};
type ManifestPassenger = { bookingId: number; passengerId: number; passengerName: string; phone: string | null; seatNumber: string; bookingStatus: string; paymentStatus: string };
type DriverVehicle = { vehicleId: number; registrationNumber: string; make: string; model: string; vehicleType: string; seatingCapacity: number; fuelType: string; status: string; nextMaintenanceDate: string | null };
type DriverFeedback = { averageRating: number | null; ratingCount: number; recentComments: Array<{ feedbackId: number; tripId: number; rating: number; comment: string | null; feedbackDate: string | null }> };
type DriverProfile = { driverId: number; firstName: string; lastName: string; phone: string | null; email: string | null; licenseNumber: string; licenseExpiry: string; status: string; rating: number; totalTrips: number };
type Toast = { kind: 'success' | 'error'; message: string };
type ConfirmAction = { kind: 'start' | 'complete'; trip: DriverTrip };

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100';
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

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-5 text-center text-gray-500"><span className="text-blue-800">{icon}</span><p className="text-sm">{message}</p></div>;
const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-gray-600">{label}</span><span className="rounded-md bg-blue-50 p-2 text-blue-800">{icon}</span></div><p className="mt-3 text-2xl font-bold text-gray-900">{value}</p></article>;
const RatingStars: React.FC<{ rating: number | null; label: string }> = ({ rating, label }) => <span className="inline-flex items-center gap-1" aria-label={label}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={15} className={rating !== null && rating >= value ? 'text-amber-500' : 'text-gray-300'} fill={rating !== null && rating >= value ? 'currentColor' : 'none'} />)}</span>;

const DriverDashboard: React.FC = () => {
  const [mode, setMode] = useState<'oracle' | 'demo' | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState('');
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
  const [toast, setToast] = useState<Toast | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<DriverTab>('trips');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [manifestTrip, setManifestTrip] = useState<DriverTrip | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases').then(async (health) => {
      if (!active) return;
      setMode(health.mode);
      if (health.mode === 'demo') setDrivers(await apiGet<Driver[]>('/drivers'));
    }).catch((error: Error) => { if (active) setToast({ kind: 'error', message: error.message }); })
      .finally(() => { if (active) setBootstrapLoading(false); });
    return () => { active = false; };
  }, []);

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

  const tripsFor = (filter: TripFilter) => trips[filter];
  const todayTrips = summary?.todayTrips ?? 0;
  const upcomingTrips = summary?.upcomingTrips ?? tripsFor('upcoming').length;
  const completedTrips = summary?.completedTrips ?? tripsFor('completed').length;
  const averageRating = feedback.averageRating;
  const tabs: Array<{ id: DriverTab; label: string }> = [
    { id: 'trips', label: 'My trips' }, { id: 'vehicle', label: 'Vehicle' },
    { id: 'feedback', label: 'Feedback' }, { id: 'profile', label: 'Profile' },
  ];

  const tripCard = (trip: DriverTrip) => <article key={trip.tripId} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-lg font-semibold text-gray-900"><span>{trip.origin}</span><ArrowRight size={17} className="shrink-0 text-blue-800" /><span>{trip.destination}</span></div><p className="mt-1 text-xs text-gray-500">{trip.routeCode}</p></div>
      <StatusBadge status={trip.status} type="trip" />
    </div>
    <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
      <p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-blue-800" />{formatDate(trip.departureTime)}</p>
      <p className="flex items-start gap-2"><CarFront size={16} className="mt-0.5 shrink-0 text-blue-800" />{trip.vehicleRegistration}</p>
      <p className="flex items-start gap-2"><Users size={16} className="mt-0.5 shrink-0 text-blue-800" />{trip.seatsBooked} / {trip.totalSeats} seats booked</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
      {trip.canStart && <button type="button" onClick={() => setConfirmAction({ kind: 'start', trip })} disabled={savingTripId === trip.tripId} className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{savingTripId === trip.tripId ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting...</> : 'Start trip'}</button>}
      {trip.canComplete && <button type="button" onClick={() => setConfirmAction({ kind: 'complete', trip })} disabled={savingTripId === trip.tripId} className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{savingTripId === trip.tripId ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Completing...</> : 'Complete trip'}</button>}
      <button type="button" onClick={() => void openManifest(trip)} className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">View passengers</button>
    </div>
  </article>;

  const tripSection = (title: string, filter: TripFilter, icon: React.ReactNode) => <section className="space-y-3" aria-labelledby={`driver-${filter}-heading`}>
    <div className="flex items-center gap-2"><span className="text-blue-800">{icon}</span><h3 id={`driver-${filter}-heading`} className="font-semibold text-gray-900">{title}</h3><span className="text-xs text-gray-500">{tripsFor(filter).length}</span></div>
    {tripsFor(filter).length ? <div className="grid gap-3 lg:grid-cols-2">{tripsFor(filter).map(tripCard)}</div> : <EmptyState icon={icon} message={`No ${title.toLowerCase()} trips.`} />}
  </section>;

  const expiryDays = profile ? Math.ceil((new Date(profile.licenseExpiry).getTime() - Date.now()) / 86_400_000) : null;
  const maintenanceDays = vehicle?.nextMaintenanceDate ? Math.ceil((new Date(vehicle.nextMaintenanceDate).getTime() - Date.now()) / 86_400_000) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-800">SmartMove driver portal</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{summary ? `Welcome, ${summary.firstName}` : 'Driver Dashboard'}</h1>
          <p className="mt-1 text-sm text-gray-600">Your trips, vehicle, feedback, and profile.</p>
          {summary && <div className="mt-3 flex flex-wrap items-center gap-3"><StatusBadge status={summary.status} type="driver" /><span className="text-sm font-medium text-gray-700">Live rating {moneylessRating(averageRating)}</span><RatingStars rating={averageRating} label={`Live average rating ${moneylessRating(averageRating)}`} /><span className="text-xs text-gray-500">{feedback.ratingCount} rating(s)</span></div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500" role="status">{mode === 'oracle' ? 'Oracle records' : mode === 'demo' ? 'Demo records' : 'Connecting'}</span>
          {mode === 'demo' ? (
            <SearchableSelect
              value={driverId}
              onChange={selectDriver}
              options={drivers.map((driver) => ({
                value: String(driver.id),
                label: `${driver.firstName} ${driver.lastName}`,
                secondaryLabel: `#${driver.id} · ${driver.email || driver.phone || 'No contact'}`,
                initials: `${driver.firstName[0]}${driver.lastName[0]}`,
              }))}
              placeholder="Select driver"
              className="w-64"
              ariaLabel="Driver profile"
            />
          ) : <input type="number" min="1" step="1" value={driverId} onChange={(event) => selectDriver(event.target.value)} className={`${inputClass} w-44`} aria-label="Acting driver ID" placeholder="Driver ID" />}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Driver summary">
        <SummaryCard icon={<CalendarDays size={18} />} label="Today's trips" value={todayTrips} />
        <SummaryCard icon={<Clock3 size={18} />} label="Upcoming trips" value={upcomingTrips} />
        <SummaryCard icon={<CheckCircle2 size={18} />} label="Completed trips" value={completedTrips} />
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-gray-600">Average rating</span><span className="rounded-md bg-amber-50 p-2 text-amber-700"><Star size={18} /></span></div><p className="mt-3 text-2xl font-bold text-gray-900">{moneylessRating(averageRating)}</p><div className="mt-1 flex items-center justify-between"><RatingStars rating={averageRating} label={`Average rating ${moneylessRating(averageRating)}`} /><span className="text-xs text-gray-500">{feedback.ratingCount} rating(s)</span></div></article>
      </section>

      {bootstrapLoading && <div className="h-12 animate-pulse rounded-lg bg-gray-200" aria-label="Loading driver dashboard" />}
      {toast && <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${toast.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><span>{toast.message}</span><button type="button" aria-label="Dismiss message" onClick={() => setToast(null)} className="rounded p-1 hover:bg-black/5"><X size={16} /></button></div>}

      <div className="overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Driver dashboard sections"><div className="flex min-w-max gap-1">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`driver-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-blue-800 text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>)}</div></div>

      <div id={`driver-panel-${activeTab}`} role="tabpanel" className="min-h-64">
        {activeTab === 'trips' && <section className="space-y-6">
          <div><h2 className="text-lg font-semibold text-gray-900">My trips</h2><p className="text-sm text-gray-600">Start only when the server marks a trip ready, and complete active trips here.</p></div>
          {loading ? <div className="grid gap-3 lg:grid-cols-2" aria-label="Loading trips">{[0, 1].map((item) => <div key={item} className="h-44 animate-pulse rounded-lg bg-gray-100" />)}</div>
            : !driverId ? <EmptyState icon={<CalendarDays size={20} />} message="Select a driver to see assigned trips." />
              : <>{tripSection('In progress', 'in_progress', <Clock3 size={18} />)}{tripSection('Upcoming', 'upcoming', <CalendarDays size={18} />)}{tripSection('Completed', 'completed', <CheckCircle2 size={18} />)}</>}
        </section>}

        {activeTab === 'vehicle' && <section className="space-y-4">
          <div><h2 className="text-lg font-semibold text-gray-900">Assigned vehicle</h2><p className="text-sm text-gray-600">Vehicle linked to your active or upcoming work.</p></div>
          {loading ? <div className="h-48 animate-pulse rounded-lg bg-gray-100" aria-label="Loading vehicle" /> : !driverId ? <EmptyState icon={<CarFront size={20} />} message="Select a driver to view the assigned vehicle." /> : !vehicle ? <EmptyState icon={<CarFront size={20} />} message="No vehicle is currently assigned." /> : <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase text-gray-500">{vehicle.vehicleType}</p><h3 className="mt-1 text-xl font-semibold text-gray-900">{vehicle.registrationNumber}</h3><p className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</p></div><StatusBadge status={vehicle.status} type="vehicle" /></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-gray-500">Capacity</p><p className="mt-1 font-semibold text-gray-900">{vehicle.seatingCapacity} seats</p></div><div><p className="text-xs text-gray-500">Fuel type</p><p className="mt-1 font-semibold capitalize text-gray-900">{vehicle.fuelType}</p></div><div><p className="text-xs text-gray-500">Next maintenance</p><p className="mt-1 font-semibold text-gray-900">{formatDay(vehicle.nextMaintenanceDate)}</p></div></div>
            {maintenanceDays !== null && maintenanceDays <= 14 && <div className={`mt-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${maintenanceDays < 0 ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}><StatusBadge status={maintenanceDays < 0 ? 'overdue' : 'maintenance'} type="maintenance" />{maintenanceDays < 0 ? `${Math.abs(maintenanceDays)} day(s) overdue` : maintenanceDays === 0 ? 'Maintenance due today' : `Maintenance due in ${maintenanceDays} day(s)`}</div>}
          </article>}
        </section>}

        {activeTab === 'feedback' && <section className="space-y-4">
          <div><h2 className="text-lg font-semibold text-gray-900">Driver feedback</h2><p className="text-sm text-gray-600">Ratings and recent passenger comments.</p></div>
          {loading ? <div className="h-40 animate-pulse rounded-lg bg-gray-100" aria-label="Loading feedback" /> : !driverId ? <EmptyState icon={<MessageSquareText size={20} />} message="Select a driver to view feedback." /> : feedback.ratingCount === 0 ? <EmptyState icon={<MessageSquareText size={20} />} message="No feedback has been submitted yet." /> : <>
            <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"><div><p className="text-sm text-gray-600">Average rating</p><p className="mt-1 text-3xl font-bold text-gray-900">{moneylessRating(feedback.averageRating)}</p></div><div className="text-right"><RatingStars rating={feedback.averageRating} label={`Average rating ${moneylessRating(feedback.averageRating)}`} /><p className="mt-1 text-sm text-gray-600">{feedback.ratingCount} rating(s)</p></div></article>
            <div className="grid gap-3 lg:grid-cols-2">{feedback.recentComments.map((item) => <article key={item.feedbackId} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center justify-between gap-3"><RatingStars rating={item.rating} label={`${item.rating} out of 5 stars`} /><time className="text-xs text-gray-500">{formatDate(item.feedbackDate)}</time></div><p className="mt-3 text-sm text-gray-700">{item.comment?.trim() || 'No comment provided.'}</p></article>)}</div>
          </>}
        </section>}

        {activeTab === 'profile' && <section className="space-y-4">
          <div><h2 className="text-lg font-semibold text-gray-900">Driver profile</h2><p className="text-sm text-gray-600">Phone and email can be updated. License, rating, and status are read-only.</p></div>
          {loading ? <div className="grid gap-3 sm:grid-cols-2"><div className="h-16 animate-pulse rounded bg-gray-100" /><div className="h-16 animate-pulse rounded bg-gray-100" /><div className="h-16 animate-pulse rounded bg-gray-100" /></div> : !profile ? <EmptyState icon={<Users size={20} />} message="Select a driver to view profile details." /> : <form onSubmit={saveProfile} noValidate className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>First name</span><input value={profile.firstName} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} aria-label="First name" /></label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>Last name</span><input value={profile.lastName} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} aria-label="Last name" /></label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>Phone</span><input value={profileDraft.phone} onChange={(event) => { setProfileDraft((current) => ({ ...current, phone: event.target.value })); setErrors((current) => ({ ...current, phone: '' })); }} className={inputClass} aria-label="Phone" aria-invalid={Boolean(errors.phone)} />{errors.phone && <span className="text-xs text-red-700">{errors.phone}</span>}</label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>Email</span><input type="email" value={profileDraft.email} onChange={(event) => { setProfileDraft((current) => ({ ...current, email: event.target.value })); setErrors((current) => ({ ...current, email: '' })); }} className={inputClass} aria-label="Email" aria-invalid={Boolean(errors.email)} />{errors.email && <span className="text-xs text-red-700">{errors.email}</span>}</label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>License number</span><input value={profile.licenseNumber} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} aria-label="License number" /></label>
              <div className="space-y-1 text-sm font-medium text-gray-700"><span className="block">License expiry</span><div className="flex flex-wrap items-center gap-2"><input value={formatDay(profile.licenseExpiry)} readOnly className={`${inputClass} flex-1 bg-gray-50 text-gray-500`} aria-label="License expiry" />{expiryDays !== null && expiryDays <= 30 && <StatusBadge status={expiryDays < 0 ? 'overdue' : 'pending'} type="driver" />}</div>{expiryDays !== null && expiryDays <= 30 && <span className={`text-xs ${expiryDays < 0 ? 'text-red-700' : 'text-amber-800'}`}>{expiryDays < 0 ? `License expired ${Math.abs(expiryDays)} day(s) ago.` : `License expires in ${expiryDays} day(s).`}</span>}</div>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>Rating</span><input value={moneylessRating(feedback.averageRating)} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} aria-label="Driver rating" /></label>
              <div className="space-y-1 text-sm font-medium text-gray-700"><span className="block">Status</span><div className="pt-2"><StatusBadge status={profile.status} type="driver" /></div></div>
            </div>
            <button type="submit" disabled={saving} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{saving ? 'Saving…' : 'Save profile'}</button>
          </form>}
        </section>}
      </div>

      <Modal isOpen={Boolean(confirmAction)} onClose={() => { if (!savingTripId) setConfirmAction(null); }} title={confirmAction?.kind === 'start' ? 'Start trip?' : 'Complete trip?'} size="sm">
        {confirmAction && <FocusTrap><div className="space-y-4"><p className="text-sm text-gray-700">{confirmAction.kind === 'start' ? 'Confirm that you are beginning this scheduled trip.' : 'Confirm that this trip has finished. The arrival time and confirmed passenger bookings will be updated.'}</p><p className="font-semibold text-gray-900">{routeTitle(confirmAction.trip)}</p><div className="flex justify-end gap-2"><button type="button" disabled={savingTripId === confirmAction.trip.tripId} onClick={() => setConfirmAction(null)} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60">Back</button><button type="button" disabled={savingTripId === confirmAction.trip.tripId} onClick={() => void confirmTripAction()} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{savingTripId === confirmAction.trip.tripId ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving...</> : `Confirm ${confirmAction.kind}`}</button></div></div></FocusTrap>}
      </Modal>

      <Modal isOpen={Boolean(manifestTrip)} onClose={() => setManifestTrip(null)} title={manifestTrip ? `Passengers · ${manifestTrip.routeCode}` : 'Passengers'} size="lg">
        <FocusTrap>
          {manifestLoading ? <div className="h-32 animate-pulse rounded bg-gray-100" aria-label="Loading passengers" /> : manifest.length === 0 ? <EmptyState icon={<Users size={20} />} message="No passengers are booked for this trip." /> : <>
            <div className="hidden overflow-x-auto md:block"><DataTable<ManifestPassenger> columns={[
              { key: 'passengerName', label: 'Passenger' }, { key: 'seatNumber', label: 'Seat' }, { key: 'phone', label: 'Phone' },
              { key: 'bookingStatus', label: 'Booking', render: (row) => <StatusBadge status={row.bookingStatus} type="booking" /> },
              { key: 'paymentStatus', label: 'Payment', render: (row) => <StatusBadge status={row.paymentStatus} type="payment" /> },
            ]} data={manifest} emptyMessage="No passengers are booked for this trip." /></div>
            <div className="grid gap-3 md:hidden">{manifest.map((person) => <article key={person.bookingId} className="rounded-lg border border-gray-200 bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="font-semibold text-gray-900">{person.passengerName}</p><span className="text-sm text-gray-600">Seat {person.seatNumber}</span></div><p className="mt-1 text-sm text-gray-600">{person.phone ?? 'No phone listed'}</p><div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={person.bookingStatus} type="booking" /><StatusBadge status={person.paymentStatus} type="payment" /></div></article>)}</div>
          </>}
        </FocusTrap>
      </Modal>
    </div>
  );
};

export default DriverDashboard;
