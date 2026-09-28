import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, CreditCard, LockKeyhole, MapPin, Ticket, X, Star } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { ApiError, API_BASE_URL, apiGet } from '../services/api';
import type { Passenger } from '../types';

type PassengerTrip = {
  tripId: number;
  routeId: number;
  routeCode: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  totalSeats: number;
  fareAmount: number;
};

type PassengerBooking = {
  bookingId: number;
  tripId: number;
  seatNumber: string;
  bookingDate: string | null;
  bookingStatus: string;
  amount: number;
  tripStatus: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  routeId: number;
  routeCode: string;
  origin: string;
  destination: string;
  paymentStatus: string;
  canCancel: boolean;
};

type PassengerProfile = {
  passengerId: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  email: string;
  passportOrNic: string;
};

type ProfileDraft = Pick<PassengerProfile, 'firstName' | 'lastName' | 'phone' | 'address'>;
type Toast = { kind: 'success' | 'error'; text: string };
type ContentItem = { title: string; detail: string };
type PassengerTab = 'find' | 'bookings' | 'feedback' | 'profile';
type FeedbackDraft = { rating: string; category: string; comment: string; error?: string };

const paymentMethods = ['card', 'cash', 'online', 'bank_transfer'];
const feedbackCategories = ['service', 'driver', 'vehicle', 'punctuality', 'general'];
const money = (amount: number) => `LKR ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (value?: string | null) => value
  ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';
const routeTitle = (item: { routeCode?: string; origin?: string; destination?: string }) => `${item.routeCode ?? 'Route'} · ${item.origin ?? ''} to ${item.destination ?? ''}`;
const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100';
const fieldErrorClass = 'mt-1 text-xs text-red-700';

const dialogFocusableElements = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FocusTrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = Array.from(container.current?.querySelectorAll<HTMLElement>(dialogFocusableElements) ?? []);
    focusable[0]?.focus();
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = Array.from(container.current?.querySelectorAll<HTMLElement>(dialogFocusableElements) ?? []);
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapTab);
    return () => {
      document.removeEventListener('keydown', trapTab);
      previous?.focus();
    };
  }, []);
  return <div ref={container}>{children}</div>;
};

const tripDuration = (departure: string, arrival: string) => {
  const minutes = Math.round((new Date(arrival).getTime() - new Date(departure).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [hours ? `${hours}h` : '', remainingMinutes ? `${remainingMinutes}m` : ''].filter(Boolean).join(' ');
};

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-5 text-center text-gray-500">
    <span className="text-blue-800">{icon}</span><p className="text-sm">{message}</p>
  </div>
);

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-gray-600">{label}</span><span className="rounded-md bg-blue-50 p-2 text-blue-800">{icon}</span></div>
    <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
  </article>
);

async function passengerApi<T>(passengerId: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Passenger-Id', passengerId);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Network request failed';
    throw new ApiError('The backend could not be reached. Check the connection and try again.', 0, detail);
  }

  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, message);
  }
  return body as T;
}

const PassengerDashboard: React.FC = () => {
  const [applicationMode, setApplicationMode] = useState<'oracle' | 'demo' | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [passengerId, setPassengerId] = useState('');
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ firstName: '', lastName: '', phone: '', address: '' });
  const [bookings, setBookings] = useState<PassengerBooking[]>([]);
  const [trips, setTrips] = useState<PassengerTrip[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [activeTab, setActiveTab] = useState<PassengerTab>('find');
  const [tripRefresh, setTripRefresh] = useState(0);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<'booking' | 'payment' | 'cancel' | 'feedback' | 'profile' | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [bookingDialogTrip, setBookingDialogTrip] = useState<PassengerTrip | null>(null);
  const [paymentDialogBooking, setPaymentDialogBooking] = useState<PassengerBooking | null>(null);
  const [cancelDialogBooking, setCancelDialogBooking] = useState<PassengerBooking | null>(null);
  const [seatNumber, setSeatNumber] = useState('');
  const [seatError, setSeatError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentError, setPaymentError] = useState('');
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, FeedbackDraft>>({});
  const [submittedFeedbackTrips, setSubmittedFeedbackTrips] = useState<number[]>([]);
  const [contentSource, setContentSource] = useState<'mongodb' | 'demo' | 'unavailable'>('unavailable');
  const [announcements, setAnnouncements] = useState<ContentItem[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [paymentConfirmation, setPaymentConfirmation] = useState<{ bookingId: number } | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases').then(async (health) => {
      if (!active) return;
      setApplicationMode(health.mode);
      if (health.mode === 'demo') setPassengers(await apiGet<Passenger[]>('/passengers'));
    }).catch((error: Error) => {
      if (active) setPageError(error.message);
    }).finally(() => {
      if (active) setBootstrapLoading(false);
    });

    apiGet<{ demo: boolean; announcements: Array<Record<string, unknown>>; reviews: Array<Record<string, unknown>> }>('/mongodb/content')
      .then((content) => {
        if (!active) return;
        setContentSource(content.demo ? 'demo' : 'mongodb');
        setAnnouncements(content.announcements.map((item) => ({ title: String(item.title ?? 'Announcement'), detail: String(item.body ?? item.detail ?? '') })));
        setReviewCount(content.reviews.length);
      })
      .catch(() => { if (active) setContentSource('unavailable'); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!passengerId || !applicationMode) {
      setProfile(null);
      setBookings([]);
      return;
    }
    let active = true;
    setProfileLoading(true);
    setBookingsLoading(true);
    setPageError(null);
    Promise.all([
      passengerApi<PassengerProfile>(passengerId, '/passenger/profile'),
      passengerApi<PassengerBooking[]>(passengerId, '/passenger/bookings'),
    ]).then(([profileResult, bookingRows]) => {
      if (!active) return;
      setProfile(profileResult);
      setBookings(bookingRows);
    }).catch((error: Error) => {
      if (!active) return;
      setProfile(null);
      setBookings([]);
      setPageError(error.message);
    }).finally(() => {
      if (active) { setProfileLoading(false); setBookingsLoading(false); }
    });
    return () => { active = false; };
  }, [passengerId, applicationMode]);

  useEffect(() => {
    if (!passengerId || !applicationMode) {
      setTrips([]);
      return;
    }
    let active = true;
    setTripsLoading(true);
    const query = new URLSearchParams();
    if (origin.trim()) query.set('origin', origin.trim());
    if (destination.trim()) query.set('destination', destination.trim());
    if (travelDate) query.set('date', travelDate);
    const suffix = query.size ? `?${query.toString()}` : '';
    passengerApi<PassengerTrip[]>(passengerId, `/passenger/trips${suffix}`).then((rows) => {
      if (active) setTrips(rows);
    }).catch((error: Error) => {
      if (active) { setTrips([]); setToast({ kind: 'error', text: error.message }); }
    }).finally(() => { if (active) setTripsLoading(false); });
    return () => { active = false; };
  }, [passengerId, applicationMode, origin, destination, travelDate, tripRefresh]);

  useEffect(() => {
    if (!profile) return;
    setProfileDraft({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? '', address: profile.address ?? '' });
  }, [profile]);

  const upcomingBookings = useMemo(() => bookings.filter((booking) => new Date(booking.departureTime).getTime() > Date.now()), [bookings]);
  const pastBookings = useMemo(() => bookings.filter((booking) => new Date(booking.departureTime).getTime() <= Date.now()), [bookings]);
  const completedBookings = bookings.filter((booking) => booking.tripStatus === 'completed' && booking.bookingStatus !== 'cancelled');
  const upcomingCount = upcomingBookings.filter((booking) => booking.bookingStatus !== 'cancelled').length;
  const pendingPaymentCount = bookings.filter((booking) => booking.bookingStatus === 'pending' && ['unpaid', 'pending'].includes(booking.paymentStatus)).length;
  const completedCount = bookings.filter((booking) => booking.tripStatus === 'completed').length;

  const refreshBookings = async () => setBookings(await passengerApi<PassengerBooking[]>(passengerId, '/passenger/bookings'));
  const refreshTrips = () => setTripRefresh((value) => value + 1);
  const refreshPassengerData = async () => {
    await Promise.all([refreshBookings(), passengerApi<PassengerProfile>(passengerId, '/passenger/profile').then(setProfile)]);
    refreshTrips();
  };

  const selectPassenger = (value: string) => {
    setPassengerId(value);
    setProfile(null);
    setBookings([]);
    setTrips([]);
    setToast(null);
    setPageError(null);
    setSubmittedFeedbackTrips([]);
    setPaymentConfirmation(null);
  };

  const openBooking = (trip: PassengerTrip) => {
    if (!passengerId) { setToast({ kind: 'error', text: 'Select or enter your passenger profile first.' }); return; }
    setSeatNumber('');
    setSeatError('');
    setBookingDialogTrip(trip);
  };

  const bookTrip = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookingDialogTrip) return;
    const seat = Number(seatNumber);
    if (!/^\d+$/.test(seatNumber) || !Number.isInteger(seat) || seat < 1 || seat > bookingDialogTrip.totalSeats) {
      setSeatError(`Enter a whole seat number from 1 to ${bookingDialogTrip.totalSeats}.`);
      return;
    }
    setSeatError('');
    setBusyAction('booking');
    try {
      await passengerApi(passengerId, '/passenger/bookings', { method: 'POST', body: JSON.stringify({ tripId: bookingDialogTrip.tripId, seatNumber: String(seat) }) });
      setToast({ kind: 'success', text: 'Booking created. Complete payment to confirm your seat.' });
      setBookingDialogTrip(null);
      await refreshPassengerData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking could not be completed.';
      setSeatError(message);
      setToast({ kind: 'error', text: message });
    } finally { setBusyAction(null); }
  };

  const payBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentDialogBooking) return;
    setPaymentError('');
    setBusyAction('payment');
    try {
      await passengerApi<{ bookingId: number; paymentStatus: string; bookingStatus: string }>(passengerId, '/passenger/payments', { method: 'POST', body: JSON.stringify({ bookingId: paymentDialogBooking.bookingId, amount: paymentDialogBooking.amount, method: paymentMethod }) });
      setPaymentConfirmation({ bookingId: paymentDialogBooking.bookingId });
      setPaymentDialogBooking(null);
      setToast({ kind: 'success', text: 'Payment accepted and booking confirmed.' });
      await refreshPassengerData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment could not be completed.';
      setPaymentError(message);
      setToast({ kind: 'error', text: message });
    } finally { setBusyAction(null); }
  };

  const cancelBooking = async () => {
    if (!cancelDialogBooking) return;
    setBusyAction('cancel');
    try {
      await passengerApi(passengerId, `/passenger/bookings/${cancelDialogBooking.bookingId}/cancel`, { method: 'POST' });
      setCancelDialogBooking(null);
      setToast({ kind: 'success', text: 'Booking cancelled. Any paid amount has been refunded.' });
      await refreshPassengerData();
    } catch (error) {
      setToast({ kind: 'error', text: error instanceof Error ? error.message : 'Booking could not be cancelled.' });
    } finally { setBusyAction(null); }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof ProfileDraft, string>> = {};
    if (!profileDraft.firstName.trim()) errors.firstName = 'First name is required.';
    if (!profileDraft.lastName.trim()) errors.lastName = 'Last name is required.';
    if (profileDraft.phone && profileDraft.phone.length > 20) errors.phone = 'Phone must be 20 characters or fewer.';
    if (profileDraft.address && profileDraft.address.length > 255) errors.address = 'Address must be 255 characters or fewer.';
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;
    setBusyAction('profile');
    try {
      const saved = await passengerApi<PassengerProfile>(passengerId, '/passenger/profile', { method: 'PUT', body: JSON.stringify({
        firstName: profileDraft.firstName.trim(), lastName: profileDraft.lastName.trim(),
        phone: profileDraft.phone?.trim() || null, address: profileDraft.address?.trim() || null,
      }) });
      setProfile(saved);
      setToast({ kind: 'success', text: 'Profile saved.' });
    } catch (error) {
      setToast({ kind: 'error', text: error instanceof Error ? error.message : 'Profile could not be saved.' });
    } finally { setBusyAction(null); }
  };

  const updateFeedbackDraft = (tripId: number, patch: Partial<FeedbackDraft>) => {
    setFeedbackDrafts((current) => {
      const draft = current[tripId] ?? { rating: '5', category: 'general', comment: '' };
      return { ...current, [tripId]: { ...draft, ...patch } };
    });
  };

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>, booking: PassengerBooking) => {
    event.preventDefault();
    const draft = feedbackDrafts[booking.tripId] ?? { rating: '5', category: 'general', comment: '' };
    const message = draft.comment.trim() ? '' : 'Comment is required.';
    updateFeedbackDraft(booking.tripId, { error: message || undefined });
    if (message) return;
    setBusyAction('feedback');
    try {
      await passengerApi(passengerId, '/passenger/feedback', { method: 'POST', body: JSON.stringify({
        tripId: booking.tripId, rating: Number(draft.rating), category: draft.category, comment: draft.comment.trim(),
      }) });
      setSubmittedFeedbackTrips((current) => [...new Set([...current, booking.tripId])]);
      updateFeedbackDraft(booking.tripId, { error: undefined });
      setToast({ kind: 'success', text: 'Feedback submitted.' });
      await refreshBookings();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Feedback could not be submitted.';
      if (/already submitted/i.test(messageText)) {
        setSubmittedFeedbackTrips((current) => [...new Set([...current, booking.tripId])]);
      }
      updateFeedbackDraft(booking.tripId, { error: messageText });
      setToast({ kind: 'error', text: messageText });
    } finally { setBusyAction(null); }
  };

  const bookingCard = (booking: PassengerBooking) => {
    return (
      <article key={booking.bookingId} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{routeTitle(booking)}</h3>
            <p className="mt-1 text-sm text-gray-600">Departure {dateTime(booking.departureTime)}</p>
            <p className="text-sm text-gray-600">Seat {booking.seatNumber} · {money(booking.amount)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.bookingStatus} type="booking" />
            <StatusBadge status={booking.paymentStatus} type="payment" />
            {booking.tripStatus === 'completed' && <StatusBadge status="completed" type="trip" />}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {booking.bookingStatus === 'pending' && booking.paymentStatus !== 'paid' && <button type="button" onClick={() => { setPaymentError(''); setPaymentDialogBooking(booking); }} className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900">Pay</button>}
          {booking.canCancel && <button type="button" onClick={() => setCancelDialogBooking(booking)} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">Cancel</button>}
        </div>
      </article>
    );
  };

  const tabs: Array<{ id: PassengerTab; label: string }> = [
    { id: 'find', label: 'Find a trip' }, { id: 'bookings', label: 'My bookings' },
    { id: 'feedback', label: 'Feedback' }, { id: 'profile', label: 'Profile' },
  ];
  const feedbackCard = (booking: PassengerBooking) => {
    const draft = feedbackDrafts[booking.tripId] ?? { rating: '5', category: 'general', comment: '' };
    const submitted = submittedFeedbackTrips.includes(booking.tripId);
    return <article key={booking.bookingId} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold text-gray-900">{routeTitle(booking)}</h3><p className="mt-1 text-sm text-gray-600">{dateTime(booking.departureTime)} · Seat {booking.seatNumber}</p></div>
        {submitted ? <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><CheckCircle2 size={16} />Feedback submitted</span> : <StatusBadge status="completed" type="trip" />}
      </div>
      {!submitted && <form onSubmit={(event) => submitFeedback(event, booking)} noValidate className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <fieldset><legend className="mb-1 text-sm font-medium text-gray-700">Your rating</legend><div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`} aria-pressed={Number(draft.rating) === value} onClick={() => updateFeedbackDraft(booking.tripId, { rating: String(value) })} className="rounded p-1 text-amber-500 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-blue-700"><Star size={22} fill={Number(draft.rating) >= value ? 'currentColor' : 'none'} /></button>)}</div></fieldset>
          <label className="min-w-48 flex-1 space-y-1 text-sm font-medium text-gray-700"><span>Category</span><select value={draft.category} onChange={(event) => updateFeedbackDraft(booking.tripId, { category: event.target.value })} className={inputClass} aria-label={`Feedback category for trip ${booking.tripId}`}>{feedbackCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <label className="block space-y-1 text-sm font-medium text-gray-700"><span>Comment</span><textarea rows={3} value={draft.comment} onChange={(event) => updateFeedbackDraft(booking.tripId, { comment: event.target.value, error: undefined })} className={inputClass} aria-label={`Feedback comment for trip ${booking.tripId}`} aria-invalid={Boolean(draft.error)} />{draft.error && <span className={fieldErrorClass}>{draft.error}</span>}</label>
        <button type="submit" disabled={busyAction === 'feedback'} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">{busyAction === 'feedback' ? 'Submitting…' : 'Submit feedback'}</button>
      </form>}
    </article>;
  };

  const renderProfile = () => (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5"><h2 className="text-lg font-semibold text-gray-900">Profile details</h2><p className="mt-1 text-sm text-gray-600">Update your name and contact information.</p></div>
      {profileLoading && !profile ? <div className="grid gap-3 sm:grid-cols-2"><div className="h-16 animate-pulse rounded bg-gray-100" /><div className="h-16 animate-pulse rounded bg-gray-100" /><div className="h-16 animate-pulse rounded bg-gray-100" /></div>
        : !profile ? <EmptyState icon={<LockKeyhole size={20} />} message="Select a passenger to view profile details." />
          : <form onSubmit={saveProfile} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>First name</span><input value={profileDraft.firstName} onChange={(event) => { setProfileDraft((current) => ({ ...current, firstName: event.target.value })); setProfileErrors((current) => ({ ...current, firstName: undefined })); }} className={inputClass} aria-label="First name" aria-invalid={Boolean(profileErrors.firstName)} />{profileErrors.firstName && <span className={fieldErrorClass}>{profileErrors.firstName}</span>}</label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>Last name</span><input value={profileDraft.lastName} onChange={(event) => { setProfileDraft((current) => ({ ...current, lastName: event.target.value })); setProfileErrors((current) => ({ ...current, lastName: undefined })); }} className={inputClass} aria-label="Last name" aria-invalid={Boolean(profileErrors.lastName)} />{profileErrors.lastName && <span className={fieldErrorClass}>{profileErrors.lastName}</span>}</label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>Phone</span><input value={profileDraft.phone ?? ''} onChange={(event) => { setProfileDraft((current) => ({ ...current, phone: event.target.value })); setProfileErrors((current) => ({ ...current, phone: undefined })); }} className={inputClass} aria-label="Phone" aria-invalid={Boolean(profileErrors.phone)} />{profileErrors.phone && <span className={fieldErrorClass}>{profileErrors.phone}</span>}</label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span>Address</span><input value={profileDraft.address ?? ''} onChange={(event) => { setProfileDraft((current) => ({ ...current, address: event.target.value })); setProfileErrors((current) => ({ ...current, address: undefined })); }} className={inputClass} aria-label="Address" aria-invalid={Boolean(profileErrors.address)} />{profileErrors.address && <span className={fieldErrorClass}>{profileErrors.address}</span>}</label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span className="flex items-center gap-1">Email <LockKeyhole size={13} /></span><input value={profile.email} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} aria-label="Email" /></label>
              <label className="space-y-1 text-sm font-medium text-gray-700"><span className="flex items-center gap-1">NIC / Passport <LockKeyhole size={13} /></span><input value={profile.passportOrNic} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} aria-label="NIC / Passport" /></label>
            </div>
            <button type="submit" disabled={busyAction === 'profile'} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">{busyAction === 'profile' ? 'Saving…' : 'Save profile'}</button>
          </form>}
    </section>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-800">SmartMove passenger portal</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{profile ? `Welcome, ${profile.firstName}` : 'Passenger Dashboard'}</h1>
          <p className="mt-1 text-sm text-gray-600">{profile ? 'Your journeys, bookings, and profile in one place.' : 'Welcome to SmartMove. Your journeys and bookings start here.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500" role="status">{applicationMode === 'oracle' ? 'Oracle records' : applicationMode === 'demo' ? 'Demo records' : 'Connecting'}</span>
          {applicationMode === 'demo' ? (
            <label className="sr-only" htmlFor="passenger-profile-select">Passenger profile</label>
          ) : <label className="sr-only" htmlFor="acting-passenger-id">Acting passenger ID</label>}
          {applicationMode === 'demo' ? (
            <select id="passenger-profile-select" value={passengerId} onChange={(event) => selectPassenger(event.target.value)} className={`${inputClass} w-64`} aria-label="Passenger profile"><option value="">Select passenger</option>{passengers.map((passenger) => <option key={passenger.id} value={passenger.id}>{passenger.firstName} {passenger.lastName} · #{passenger.id}</option>)}</select>
          ) : <input id="acting-passenger-id" type="number" min="1" step="1" value={passengerId} onChange={(event) => selectPassenger(event.target.value)} className={`${inputClass} w-44`} aria-label="Acting passenger ID" placeholder="Passenger ID" />}
        </div>
      </header>

      <section aria-label="Passenger summary" className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<CalendarDays size={18} />} label="Upcoming trips" value={upcomingCount} />
        <SummaryCard icon={<CreditCard size={18} />} label="Pending payments" value={pendingPaymentCount} />
        <SummaryCard icon={<CheckCircle2 size={18} />} label="Completed trips" value={completedCount} />
        <SummaryCard icon={<Ticket size={18} />} label="Total bookings" value={bookings.length} />
      </section>

      {bootstrapLoading && <div className="h-12 animate-pulse rounded-lg bg-gray-200" aria-label="Loading passenger dashboard" />}
      {pageError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{pageError}</div>}
      {toast && <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${toast.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><span>{toast.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setToast(null)} className="rounded p-1 hover:bg-black/5"><X size={16} /></button></div>}
      {paymentConfirmation && <div role="status" className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mt-0.5 shrink-0" size={20} /><div><p className="font-semibold">Payment confirmed</p><p className="text-sm">Booking #{paymentConfirmation.bookingId} is confirmed.</p></div></div>}

      <div className="overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Passenger dashboard sections">
        <div className="flex min-w-max gap-1">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`passenger-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-blue-800 text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>)}</div>
      </div>

      <div id={`passenger-panel-${activeTab}`} role="tabpanel" className="min-h-64">
        {activeTab === 'find' && <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-900">Find a trip</h2><p className="text-sm text-gray-600">Filter upcoming services by route and date.</p></div><button type="button" onClick={() => { setOrigin(''); setDestination(''); setTravelDate(''); }} className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Clear filters</button></div>
          <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-gray-700"><span>Origin</span><input value={origin} onChange={(event) => setOrigin(event.target.value)} className={inputClass} aria-label="Origin" /></label>
            <label className="space-y-1 text-sm font-medium text-gray-700"><span>Destination</span><input value={destination} onChange={(event) => setDestination(event.target.value)} className={inputClass} aria-label="Destination" /></label>
            <label className="space-y-1 text-sm font-medium text-gray-700"><span>Date</span><input type="date" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} className={inputClass} aria-label="Trip date" /></label>
          </div>
          {tripsLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading trips">{[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-lg bg-gray-100" />)}</div>
            : !passengerId ? <EmptyState icon={<MapPin size={20} />} message="Select a passenger to search for upcoming trips." />
              : trips.length === 0 ? <EmptyState icon={<MapPin size={20} />} message="No upcoming trips match your search." />
                : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{trips.map((trip) => {
                  const capacity = Math.max(1, Number(trip.totalSeats));
                  const seatRatio = Math.max(0, Math.min(100, Number(trip.availableSeats) / capacity * 100));
                  const lowSeats = Number(trip.availableSeats) <= 3;
                  const duration = tripDuration(trip.departureTime, trip.arrivalTime);
                  return <article key={trip.tripId} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900"><span>{trip.origin}</span><ArrowRight size={18} className="shrink-0 text-blue-800" /><span>{trip.destination}</span></div>
                    <p className="mt-1 text-xs font-medium text-gray-500">{trip.routeCode}</p>
                    <div className="mt-4 flex items-start gap-2 text-sm text-gray-700"><CalendarDays size={16} className="mt-0.5 shrink-0 text-blue-800" /><span>{dateTime(trip.departureTime)}{duration ? ` · ${duration}` : ''}</span></div>
                    <div className="mt-4 flex items-center justify-between text-sm"><span className="text-gray-600">Seats left</span><span className={`font-semibold ${lowSeats ? 'text-red-700' : 'text-gray-900'}`}>{trip.availableSeats} / {trip.totalSeats}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${lowSeats ? 'bg-red-600' : 'bg-blue-800'}`} style={{ width: `${seatRatio}%` }} /></div>
                    <div className="mt-4 flex items-center justify-between gap-3"><span className="text-lg font-bold text-gray-900">{money(trip.fareAmount)}</span><button type="button" onClick={() => openBooking(trip)} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Book</button></div>
                  </article>;
                })}</div>}
        </section>}

        {activeTab === 'bookings' && <section className="space-y-5">
          <div><h2 className="text-lg font-semibold text-gray-900">My bookings</h2><p className="text-sm text-gray-600">Review travel and payment status.</p></div>
          {bookingsLoading ? <div className="grid gap-3 md:grid-cols-2" aria-label="Loading bookings">{[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-lg bg-gray-100" />)}</div>
            : !passengerId ? <EmptyState icon={<Ticket size={20} />} message="Select a passenger to view bookings." />
              : bookings.length === 0 ? <EmptyState icon={<Ticket size={20} />} message="You do not have any bookings yet." />
                : <div className="space-y-6">
                  <section className="space-y-3"><h3 className="font-semibold text-gray-800">Upcoming</h3>{upcomingBookings.length ? <div className="grid gap-3 md:grid-cols-2">{upcomingBookings.map(bookingCard)}</div> : <EmptyState icon={<CalendarDays size={20} />} message="No upcoming trips." />}</section>
                  <section className="space-y-3"><h3 className="font-semibold text-gray-800">Past</h3>{pastBookings.length ? <div className="grid gap-3 md:grid-cols-2">{pastBookings.map(bookingCard)}</div> : <EmptyState icon={<CheckCircle2 size={20} />} message="No past trips." />}</section>
                </div>}
        </section>}

        {activeTab === 'feedback' && <section className="space-y-5">
          <div><h2 className="text-lg font-semibold text-gray-900">Trip feedback</h2><p className="text-sm text-gray-600">Rate a completed trip you booked.</p></div>
          {bookingsLoading ? <div className="h-36 animate-pulse rounded-lg bg-gray-100" aria-label="Loading feedback trips" />
            : !passengerId ? <EmptyState icon={<Star size={20} />} message="Select a passenger to view completed trips." />
              : completedBookings.length ? <div className="grid gap-3 xl:grid-cols-2">{completedBookings.map(feedbackCard)}</div>
                : <EmptyState icon={<Star size={20} />} message="No completed booked trips are ready for feedback." />}
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">Travel announcements and reviews</h3><span className="text-xs text-gray-500">{contentSource === 'mongodb' ? 'Live MongoDB' : contentSource === 'demo' ? 'Demo fallback' : 'Unavailable'}</span></div>
            {announcements.length ? announcements.map((item, index) => <p key={`${item.title}-${index}`} className="mt-2 text-sm text-gray-700"><strong>{item.title}:</strong> {item.detail}</p>) : <p className="mt-2 text-sm text-gray-600">No current announcements.</p>}
            <p className="mt-3 text-xs text-gray-600">{reviewCount} review(s) returned by the content endpoint.</p>
          </section>
        </section>}

        {activeTab === 'profile' && renderProfile()}
      </div>

      <Modal isOpen={Boolean(bookingDialogTrip)} onClose={() => { if (busyAction !== 'booking') setBookingDialogTrip(null); }} title="Book trip" size="md">
        {bookingDialogTrip && <FocusTrap><form onSubmit={bookTrip} noValidate className="space-y-4">
          <div><h3 className="font-semibold text-gray-900">{bookingDialogTrip.origin} <ArrowRight className="inline" size={15} /> {bookingDialogTrip.destination}</h3><p className="mt-1 text-sm text-gray-600">{dateTime(bookingDialogTrip.departureTime)} · {bookingDialogTrip.availableSeats} seats left</p></div>
          <label className="block space-y-1 text-sm font-medium text-gray-700"><span>Seat number</span><input type="number" min="1" max={bookingDialogTrip.totalSeats} step="1" value={seatNumber} onChange={(event) => { setSeatNumber(event.target.value); setSeatError(''); }} className={inputClass} aria-label="Seat number" aria-invalid={Boolean(seatError)} />{seatError && <span className={fieldErrorClass}>{seatError}</span>}<span className="text-xs text-gray-500">Choose a seat from 1 to {bookingDialogTrip.totalSeats}. Availability is verified when booking.</span></label>
          <label className="block space-y-1 text-sm font-medium text-gray-700"><span>Fare</span><input value={money(bookingDialogTrip.fareAmount)} readOnly className={`${inputClass} bg-gray-50 text-gray-600`} aria-label="Fare" /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setBookingDialogTrip(null)} disabled={busyAction === 'booking'} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button><button type="submit" disabled={busyAction === 'booking'} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">{busyAction === 'booking' ? 'Booking…' : 'Confirm booking'}</button></div>
        </form></FocusTrap>}
      </Modal>

      <Modal isOpen={Boolean(paymentDialogBooking)} onClose={() => { if (busyAction !== 'payment') setPaymentDialogBooking(null); }} title="Pay for booking" size="md">
        {paymentDialogBooking && <FocusTrap><form onSubmit={payBooking} noValidate className="space-y-4">
          <p className="text-sm text-gray-700">{routeTitle(paymentDialogBooking)}</p>
          <label className="block space-y-1 text-sm font-medium text-gray-700"><span>Amount</span><input value={money(paymentDialogBooking.amount)} readOnly className={`${inputClass} bg-gray-50 text-gray-600`} aria-label="Payment amount" /></label>
          <label className="block space-y-1 text-sm font-medium text-gray-700"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass} aria-label="Payment method">{paymentMethods.map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}</select>{paymentError && <span className={fieldErrorClass}>{paymentError}</span>}</label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setPaymentDialogBooking(null)} disabled={busyAction === 'payment'} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button><button type="submit" disabled={busyAction === 'payment'} className="inline-flex items-center gap-2 rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">{busyAction === 'payment' ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Paying…</> : 'Confirm payment'}</button></div>
        </form></FocusTrap>}
      </Modal>

      <Modal isOpen={Boolean(cancelDialogBooking)} onClose={() => { if (busyAction !== 'cancel') setCancelDialogBooking(null); }} title="Cancel booking" size="sm">
        {cancelDialogBooking && <FocusTrap><div className="space-y-4">
          <p className="text-sm text-gray-700">You can cancel only more than two hours before departure. Any paid booking will be refunded.</p>
          <p className="text-sm font-medium text-gray-900">{routeTitle(cancelDialogBooking)} · {dateTime(cancelDialogBooking.departureTime)}</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setCancelDialogBooking(null)} disabled={busyAction === 'cancel'} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Keep booking</button><button type="button" onClick={cancelBooking} disabled={busyAction === 'cancel'} className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60">{busyAction === 'cancel' ? 'Cancelling…' : 'Confirm cancellation'}</button></div>
        </div></FocusTrap>}
      </Modal>
    </div>
  );
};

export default PassengerDashboard;
