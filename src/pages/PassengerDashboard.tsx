// File: d:\Projects\DM-Project\transit-pulse-management-system\src\pages\PassengerDashboard.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  MapPin,
  Ticket,
  X,
  Star,
  Search,
  MessageSquare,
  UserCheck,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import SearchableSelect from '../components/SearchableSelect';
import SearchableDropdown from '../components/SearchableDropdown';
import { ApiError, API_BASE_URL, apiGet } from '../services/api';
import type { Passenger } from '../types';

export type PassengerTab = 'find' | 'bookings' | 'feedback' | 'profile';

interface PassengerDashboardProps {
  inSharedLayout?: boolean;
  activeTab?: PassengerTab;
  onTabChange?: (tab: PassengerTab) => void;
  passengerId?: string;
  onPassengerIdChange?: (id: string) => void;
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

type Route = {
  id: number;
  routeCode: string;
  origin: string;
  destination: string;
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
type FeedbackDraft = { rating: string; category: string; comment: string; error?: string };

const paymentMethods = ['card', 'cash', 'online', 'bank_transfer'];
const feedbackCategories = ['service', 'driver', 'vehicle', 'punctuality', 'general'];
const money = (amount: number) => `LKR ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (value?: string | null) => value
  ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';
const dateKey = (value: string) => {
  const datePrefix = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);
  if (datePrefix) return datePrefix[1];
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : '';
};
const isValidDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const routeTitle = (item: { routeCode?: string; origin?: string; destination?: string }) => `${item.routeCode ?? 'Route'} · ${item.origin ?? ''} to ${item.destination ?? ''}`;
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';
const fieldErrorClass = 'mt-1 text-xs font-semibold text-rose-600';

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

const EmptyState: React.FC<{ icon: React.ReactNode; title?: string; message: string; action?: React.ReactNode }> = ({ icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-2xs">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shadow-2xs">
      {icon}
    </div>
    <div className="max-w-md space-y-1">
      {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
      <p className="text-sm text-slate-600">{message}</p>
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

const SkeletonCard: React.FC = () => (
  <div className="animate-pulse space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
    <div className="flex items-center justify-between">
      <div className="h-5 w-36 rounded-md bg-slate-200" />
      <div className="h-4 w-16 rounded-full bg-slate-200" />
    </div>
    <div className="h-4 w-48 rounded-md bg-slate-100" />
    <div className="h-2.5 w-full rounded-full bg-slate-100" />
    <div className="flex items-center justify-between pt-2">
      <div className="h-6 w-24 rounded-md bg-slate-200" />
      <div className="h-9 w-20 rounded-lg bg-slate-200" />
    </div>
  </div>
);

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all duration-200 hover:shadow-xs">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="rounded-lg bg-blue-50 p-2 text-blue-700">{icon}</span>
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
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

const PassengerDashboard: React.FC<PassengerDashboardProps> = ({
  inSharedLayout = false,
  activeTab: externalActiveTab,
  onTabChange,
  passengerId: externalPassengerId,
  onPassengerIdChange,
  onSelectPropsChange,
  onModeChange,
}) => {
  const [applicationMode, setApplicationMode] = useState<'oracle' | 'demo' | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [internalPassengerId, setInternalPassengerId] = useState('');
  const passengerId = externalPassengerId ?? internalPassengerId;

  const setPassengerId = (id: string) => {
    if (onPassengerIdChange) onPassengerIdChange(id);
    else setInternalPassengerId(id);
  };

  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ firstName: '', lastName: '', phone: '', address: '' });
  const [bookings, setBookings] = useState<PassengerBooking[]>([]);
  const [trips, setTrips] = useState<PassengerTrip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [tripsError, setTripsError] = useState<string | null>(null);

  const [internalActiveTab, setInternalActiveTab] = useState<PassengerTab>('find');
  const activeTab = externalActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: PassengerTab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalActiveTab(tab);
  };

  const [tripRefresh, setTripRefresh] = useState(0);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<'booking' | 'payment' | 'cancel' | 'feedback' | 'profile' | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [bookingDialogTrip, setBookingDialogTrip] = useState<PassengerTrip | null>(null);
  const [paymentDialogBookings, setPaymentDialogBookings] = useState<PassengerBooking[] | null>(null);
  const [cancelDialogBooking, setCancelDialogBooking] = useState<PassengerBooking | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [seatError, setSeatError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentError, setPaymentError] = useState('');
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, FeedbackDraft>>({});
  const [submittedFeedbackTrips, setSubmittedFeedbackTrips] = useState<number[]>([]);
  const [contentSource, setContentSource] = useState<'mongodb' | 'demo' | 'unavailable'>('unavailable');
  const [announcements, setAnnouncements] = useState<ContentItem[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [paymentConfirmation, setPaymentConfirmation] = useState<{ bookingIds: number[]; amount: number } | null>(null);

  const selectedSeatCount = Math.max(1, Math.floor(Number(seatCount) || 1));
  const baseFare = Number(bookingDialogTrip?.fareAmount ?? 0);
  const totalAmount = baseFare * selectedSeatCount;

  useEffect(() => {
    let active = true;
    apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases').then(async (health) => {
      if (!active) return;
      setApplicationMode(health.mode);
      if (onModeChange) onModeChange(health.mode);
      const list = await apiGet<Passenger[]>('/passengers');
      if (active) setPassengers(list);
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

  // Sync SearchableSelect props up to Header Top Bar
  useEffect(() => {
    if (!onSelectPropsChange) return;
    const selectedPassenger = passengers.find(p => String(p.id) === String(passengerId));
    const selectedName = selectedPassenger ? `${selectedPassenger.firstName} ${selectedPassenger.lastName}` : undefined;

    onSelectPropsChange({
      value: passengerId,
      onChange: (val: string) => selectPassenger(val),
      options: passengers.map((p) => ({
        value: String(p.id),
        label: `${p.firstName} ${p.lastName}`,
        secondaryLabel: `#${p.id} · ${p.email}`,
        initials: `${p.firstName[0]}${p.lastName[0]}`,
      })),
      placeholder: 'Select passenger',
      ariaLabel: 'Passenger profile',
      selectedName,
    });
  }, [passengers, passengerId, onSelectPropsChange]);

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
    if (!passengerId || !applicationMode || !origin.trim() || !destination.trim() || !isValidDateOnly(travelDate)) {
      setTrips([]);
      setTripsError(null);
      setTripsLoading(false);
      return;
    }
    let active = true;
    setTripsLoading(true);
    setTripsError(null);
    const query = new URLSearchParams();
    query.set('origin', origin.trim());
    query.set('destination', destination.trim());
    passengerApi<PassengerTrip[]>(passengerId, `/passenger/trips?${query.toString()}`).then((rows) => {
      if (active) {
        const requestedOrigin = origin.trim().toLowerCase();
        const requestedDestination = destination.trim().toLowerCase();
        setTrips(rows.filter((trip) =>
          trip.origin.trim().toLowerCase() === requestedOrigin
          && trip.destination.trim().toLowerCase() === requestedDestination
          && dateKey(trip.departureTime) >= travelDate
          && new Date(trip.departureTime).getTime() > Date.now()
          && Number(trip.availableSeats) > 0,
        ));
      }
    }).catch((error: Error) => {
      if (active) { setTrips([]); setTripsError(error.message); }
    }).finally(() => { if (active) setTripsLoading(false); });
    return () => { active = false; };
  }, [passengerId, applicationMode, origin, destination, travelDate, tripRefresh]);

  useEffect(() => {
    if (!profile) return;
    setProfileDraft({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? '', address: profile.address ?? '' });
  }, [profile]);

  useEffect(() => {
    if (!applicationMode) {
      setRoutes([]);
      return;
    }
    let active = true;
    apiGet<Route[]>('/routes').then((routesData) => {
      if (active) setRoutes(routesData);
    }).catch(() => {
      if (active) setRoutes([]);
    });
    return () => { active = false; };
  }, [applicationMode]);

  const availableRoutes = useMemo(() => {
    const routeById = new Map<number, Route>();
    for (const trip of trips) {
      if (!routeById.has(trip.routeId)) {
        routeById.set(trip.routeId, {
          id: trip.routeId,
          routeCode: trip.routeCode,
          origin: trip.origin,
          destination: trip.destination,
        });
      }
    }
    return [...routeById.values()];
  }, [trips]);
  const selectedRouteTrips = useMemo(
    () => trips.filter((trip) => trip.routeId === selectedRouteId),
    [trips, selectedRouteId],
  );

  useEffect(() => {
    if (selectedRouteId !== null && !availableRoutes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(null);
    }
    if (selectedTripId !== null && !selectedRouteTrips.some((trip) => trip.tripId === selectedTripId)) {
      setSelectedTripId(null);
    }
  }, [availableRoutes, selectedRouteId, selectedRouteTrips, selectedTripId]);

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

  const selectPassenger = (value: string | number) => {
    setPassengerId(String(value));
    setProfile(null);
    setBookings([]);
    setTrips([]);
    setSelectedRouteId(null);
    setSelectedTripId(null);
    setTripsError(null);
    setToast(null);
    setPageError(null);
    setSubmittedFeedbackTrips([]);
    setPaymentConfirmation(null);
  };

  const clearTripSelection = () => {
    setSelectedRouteId(null);
    setSelectedTripId(null);
    setBookingDialogTrip(null);
    setSeatCount(1);
    setSeatError('');
    setTrips([]);
    setTripsError(null);
  };

  const changeOrigin = (value: string) => {
    setOrigin(value);
    clearTripSelection();
  };

  const changeDestination = (value: string) => {
    setDestination(value);
    clearTripSelection();
  };

  const changeTravelDate = (value: string) => {
    setTravelDate(value);
    clearTripSelection();
  };

  const openBooking = (trip: PassengerTrip) => {
    if (!passengerId) { setToast({ kind: 'error', text: 'Select or enter your passenger profile first.' }); return; }
    if (!origin.trim() || !destination.trim() || !isValidDateOnly(travelDate)
      || selectedRouteId !== trip.routeId || selectedTripId !== trip.tripId
      || trip.origin.trim().toLowerCase() !== origin.trim().toLowerCase()
      || trip.destination.trim().toLowerCase() !== destination.trim().toLowerCase()
      || dateKey(trip.departureTime) < travelDate
      || !selectedRouteTrips.some((selectedTrip) => selectedTrip.tripId === trip.tripId)) {
      setToast({ kind: 'error', text: 'Select an origin, destination, travel date, route, and trip before booking.' });
      return;
    }
    setSeatCount(1);
    setSeatError('');
    setBookingDialogTrip(trip);
  };

  const bookTrip = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookingDialogTrip) return;
    if (!origin.trim() || !destination.trim() || !isValidDateOnly(travelDate)
      || selectedRouteId !== bookingDialogTrip.routeId || selectedTripId !== bookingDialogTrip.tripId
      || bookingDialogTrip.origin.trim().toLowerCase() !== origin.trim().toLowerCase()
      || bookingDialogTrip.destination.trim().toLowerCase() !== destination.trim().toLowerCase()
      || dateKey(bookingDialogTrip.departureTime) < travelDate
      || !selectedRouteTrips.some((trip) => trip.tripId === bookingDialogTrip.tripId)) {
      setBookingDialogTrip(null);
      setToast({ kind: 'error', text: 'Select an origin, destination, travel date, route, and trip before booking.' });
      return;
    }
    if (!Number.isInteger(selectedSeatCount) || selectedSeatCount < 1) {
      setSeatError('Select at least one seat.');
      return;
    }
    if (selectedSeatCount > bookingDialogTrip.availableSeats) {
      setSeatError(`Only ${bookingDialogTrip.availableSeats} seats are available for this trip.`);
      return;
    }
    setSeatError('');
    setBusyAction('booking');
    try {
      await passengerApi<{ bookingIds: number[]; amount: number }>(passengerId, '/passenger/bookings', { method: 'POST', body: JSON.stringify({ tripId: bookingDialogTrip.tripId, seatCount: selectedSeatCount, amount: totalAmount }) });
      setToast({ kind: 'success', text: `${selectedSeatCount} seat${selectedSeatCount === 1 ? '' : 's'} booked. Complete payment to confirm.` });
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
    if (!paymentDialogBookings?.length) return;
    const bookingIds = paymentDialogBookings.map((booking) => booking.bookingId);
    const amount = paymentDialogBookings.reduce((total, booking) => total + Number(booking.amount), 0);
    setPaymentError('');
    setBusyAction('payment');
    try {
      await passengerApi<{ bookingIds: number[]; paymentStatus: string; bookingStatus: string }>(passengerId, '/passenger/payments', { method: 'POST', body: JSON.stringify({ bookingIds, amount, method: paymentMethod }) });
      setPaymentConfirmation({ bookingIds, amount });
      setPaymentDialogBookings(null);
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
    const payableBookings = bookings.filter((item) => item.tripId === booking.tripId
      && item.bookingStatus === 'pending' && ['unpaid', 'pending'].includes(item.paymentStatus));
    const firstPayableBookingId = Math.min(...payableBookings.map((item) => item.bookingId));
    return (
      <article key={booking.bookingId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span>{booking.origin}</span>
              <ArrowRight size={16} className="text-blue-700 shrink-0" />
              <span>{booking.destination}</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Booking #{booking.bookingId} · {booking.routeCode} · Seat {booking.seatNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.bookingStatus} type="booking" />
            <StatusBadge status={booking.paymentStatus} type="payment" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-blue-700 shrink-0" />
            <span>{dateTime(booking.departureTime)}</span>
          </div>
          <span className="font-bold text-slate-900 text-sm">{money(booking.amount)}</span>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          {payableBookings.length > 0 && booking.bookingId === firstPayableBookingId && (
            <button
              type="button"
              onClick={() => setPaymentDialogBookings(payableBookings)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <CreditCard size={14} />
              Pay {payableBookings.length > 1 ? `${payableBookings.length} seats` : 'now'}
            </button>
          )}
          {booking.canCancel && (
            <button
              type="button"
              onClick={() => setCancelDialogBooking(booking)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Cancel booking
            </button>
          )}
        </div>
      </article>
    );
  };

  const feedbackCard = (booking: PassengerBooking) => {
    const submitted = submittedFeedbackTrips.includes(booking.tripId);
    const draft = feedbackDrafts[booking.tripId] ?? { rating: '5', category: 'general', comment: '' };

    return (
      <article key={booking.bookingId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900">{booking.origin} to {booking.destination}</h4>
            <p className="text-xs text-slate-500">{booking.routeCode} · Departed {dateTime(booking.departureTime)}</p>
          </div>
          <StatusBadge status="completed" type="trip" />
        </div>

        {submitted ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={16} />
            Feedback submitted for this trip. Thank you!
          </div>
        ) : (
          <form onSubmit={(e) => submitFeedback(e, booking)} noValidate className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Rating</span>
                <select
                  value={draft.rating}
                  onChange={(e) => updateFeedbackDraft(booking.tripId, { rating: e.target.value })}
                  className={inputClass}
                >
                  <option value="5">5 ★★★★★ (Excellent)</option>
                  <option value="4">4 ★★★★☆ (Good)</option>
                  <option value="3">3 ★★★☆☆ (Average)</option>
                  <option value="2">2 ★★☆☆☆ (Poor)</option>
                  <option value="1">1 ★☆☆☆☆ (Very Bad)</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Category</span>
                <select
                  value={draft.category}
                  onChange={(e) => updateFeedbackDraft(booking.tripId, { category: e.target.value })}
                  className={inputClass}
                >
                  {feedbackCategories.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              <span>Your feedback comment</span>
              <textarea
                rows={2}
                value={draft.comment}
                onChange={(e) => updateFeedbackDraft(booking.tripId, { comment: e.target.value })}
                placeholder="Share details about your journey, bus condition, or driver..."
                className={inputClass}
              />
              {draft.error && <span className={fieldErrorClass}>{draft.error}</span>}
            </label>

            <button
              type="submit"
              disabled={busyAction === 'feedback'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <MessageSquare size={14} />
              {busyAction === 'feedback' ? 'Submitting…' : 'Submit feedback'}
            </button>
          </form>
        )}
      </article>
    );
  };

  const renderProfile = () => {
    if (profileLoading) return <div className="h-64 animate-pulse rounded-xl bg-slate-200" />;
    if (!profile) return <EmptyState icon={<UserCheck size={24} />} message="Select a passenger profile from the top bar to view details." />;

    return (
      <section className="space-y-5 max-w-2xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white shadow-sm">
              {profile.firstName[0]}{profile.lastName[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{profile.firstName} {profile.lastName}</h3>
              <p className="text-xs font-medium text-slate-500">Passenger ID: #{profile.passengerId}</p>
            </div>
          </div>

          <form onSubmit={saveProfile} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>First name</span>
                <input
                  value={profileDraft.firstName}
                  onChange={(e) => { setProfileDraft(curr => ({ ...curr, firstName: e.target.value })); setProfileErrors(curr => ({ ...curr, firstName: undefined })); }}
                  className={inputClass}
                />
                {profileErrors.firstName && <span className={fieldErrorClass}>{profileErrors.firstName}</span>}
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Last name</span>
                <input
                  value={profileDraft.lastName}
                  onChange={(e) => { setProfileDraft(curr => ({ ...curr, lastName: e.target.value })); setProfileErrors(curr => ({ ...curr, lastName: undefined })); }}
                  className={inputClass}
                />
                {profileErrors.lastName && <span className={fieldErrorClass}>{profileErrors.lastName}</span>}
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Phone number</span>
                <input
                  value={profileDraft.phone ?? ''}
                  onChange={(e) => { setProfileDraft(curr => ({ ...curr, phone: e.target.value })); setProfileErrors(curr => ({ ...curr, phone: undefined })); }}
                  className={inputClass}
                />
                {profileErrors.phone && <span className={fieldErrorClass}>{profileErrors.phone}</span>}
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Address</span>
                <input
                  value={profileDraft.address ?? ''}
                  onChange={(e) => { setProfileDraft(curr => ({ ...curr, address: e.target.value })); setProfileErrors(curr => ({ ...curr, address: undefined })); }}
                  className={inputClass}
                />
                {profileErrors.address && <span className={fieldErrorClass}>{profileErrors.address}</span>}
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1">Email <LockKeyhole size={12} className="text-slate-400" /></span>
                <input value={profile.email} readOnly className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1">NIC / Passport <LockKeyhole size={12} className="text-slate-400" /></span>
                <input value={profile.passportOrNic} readOnly className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} />
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={busyAction === 'profile'}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-800 disabled:opacity-60"
              >
                {busyAction === 'profile' ? 'Saving profile…' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  };

  const tabsConfig: Array<{ id: PassengerTab; label: string; icon: React.ReactNode }> = [
    { id: 'find', label: 'Find a trip', icon: <Search size={16} /> },
    { id: 'bookings', label: 'My bookings', icon: <Ticket size={16} /> },
    { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
    { id: 'profile', label: 'Profile', icon: <UserCheck size={16} /> },
  ];
  const paymentDialogBooking = paymentDialogBookings?.[0] ?? null;
  const paymentDialogAmount = paymentDialogBookings?.reduce((total, booking) => total + Number(booking.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Top greeting banner (only show in-page select if NOT in shared layout) ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
            <Sparkles size={13} /> Passenger Portal
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {profile ? `Welcome, ${profile.firstName}` : 'Passenger Dashboard'}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            {profile ? 'Manage your upcoming journeys, active tickets, and feedback.' : 'Select a passenger profile to start searching and booking trips.'}
          </p>
        </div>

        {!inSharedLayout && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500" role="status">
              {applicationMode === 'oracle' ? 'Oracle mode' : applicationMode === 'demo' ? 'Demo mode' : 'Connecting'}
            </span>
            <SearchableSelect
              value={passengerId}
              onChange={selectPassenger}
              options={passengers.map((p) => ({
                value: String(p.id),
                label: `${p.firstName} ${p.lastName}`,
                secondaryLabel: `#${p.id} · ${p.email}`,
                initials: `${p.firstName[0]}${p.lastName[0]}`,
              }))}
              placeholder="Select passenger"
              className="w-64"
              ariaLabel="Passenger profile"
            />
          </div>
        )}
      </header>

      {/* ── Summary Stats Grid ── */}
      <section aria-label="Passenger summary" className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<CalendarDays size={18} />} label="Upcoming trips" value={upcomingCount} />
        <SummaryCard icon={<CreditCard size={18} />} label="Pending payments" value={pendingPaymentCount} />
        <SummaryCard icon={<CheckCircle2 size={18} />} label="Completed trips" value={completedCount} />
        <SummaryCard icon={<Ticket size={18} />} label="Total bookings" value={bookings.length} />
      </section>

      {bootstrapLoading && <div className="h-12 animate-pulse rounded-xl bg-slate-200" aria-label="Loading passenger dashboard" />}
      {pageError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">{pageError}</div>}
      {toast && (
        <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-xs font-semibold ${toast.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <span>{toast.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setToast(null)} className="rounded-md p-1 hover:bg-black/5"><X size={15} /></button>
        </div>
      )}
      {paymentConfirmation && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-bold">Payment confirmed!</p>
            <p className="text-slate-600 font-normal">Bookings #{paymentConfirmation.bookingIds.join(', ')} have been paid: {money(paymentConfirmation.amount)}.</p>
          </div>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Passenger dashboard sections">
        <div className="flex min-w-max gap-2 pb-1">
          {tabsConfig.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`passenger-panel-${tab.id}`}
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
      <div id={`passenger-panel-${activeTab}`} role="tabpanel" className="min-h-64">
        {activeTab === 'find' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Find a trip</h2>
                <p className="text-xs text-slate-500">Filter upcoming available services by origin, destination, and travel date.</p>
              </div>
              <button
                type="button"
                onClick={() => { changeOrigin(''); changeDestination(''); changeTravelDate(''); }}
                disabled={!origin && !destination && !travelDate}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Origin</span>
                <SearchableDropdown
                  value={origin}
                  onChange={changeOrigin}
                  options={Array.from(new Set(routes.map((r) => r.origin))).map(o => ({ value: o, label: o }))}
                  placeholder="All origins"
                  ariaLabel="Origin"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Destination</span>
                <SearchableDropdown
                  value={destination}
                  onChange={changeDestination}
                  options={Array.from(new Set(routes.map((r) => r.destination))).map(d => ({ value: d, label: d }))}
                  placeholder="All destinations"
                  ariaLabel="Destination"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>Trip Date</span>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => changeTravelDate(e.target.value)}
                  className={inputClass}
                  aria-label="Trip date"
                />
              </label>
            </div>

            {!origin.trim() || !destination.trim() || !isValidDateOnly(travelDate) ? (
              <EmptyState icon={<MapPin size={24} />} message="Please select an origin, destination, and travel date." />
            ) : !passengerId ? (
              <EmptyState icon={<UserCheck size={24} />} title="Select a Passenger" message="Select a passenger profile from the top bar to view available trips." />
            ) : tripsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading trips">
                {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : tripsError ? (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">{tripsError}</div>
            ) : trips.length === 0 ? (
              <EmptyState icon={<MapPin size={24} />} title="No Available Trips" message="No available trips found from this date onward." />
            ) : (
              <div className="space-y-5">
                <section aria-label="Available routes" className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available routes ({availableRoutes.length})</h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {availableRoutes.map((route) => {
                      const selected = selectedRouteId === route.id;
                      const scheduleCount = trips.filter((trip) => trip.routeId === route.id).length;
                      return (
                        <button
                          key={route.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => { setSelectedRouteId(route.id); setSelectedTripId(null); setSeatCount(1); setSeatError(''); }}
                          className={`rounded-xl border p-4 text-left shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}
                        >
                          <span className="text-xs font-bold text-blue-700">{route.routeCode}</span>
                          <span className="mt-1 block font-semibold text-slate-900">{route.origin} <ArrowRight size={14} className="mx-1 inline text-blue-700" /> {route.destination}</span>
                          <span className="mt-2 block text-xs text-slate-500">{scheduleCount} {scheduleCount === 1 ? 'available trip' : 'available trips'}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {selectedRouteId === null ? (
                  <EmptyState icon={<MapPin size={24} />} message="Select a route to view its available trips." />
                ) : (
                  <>
                    <section aria-label="Available trips for selected route" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selectedRouteTrips.map((trip) => {
                  const capacity = Math.max(1, Number(trip.totalSeats));
                  const seatRatio = Math.max(0, Math.min(100, (Number(trip.availableSeats) / capacity) * 100));
                  const lowSeats = Number(trip.availableSeats) <= 3;
                  const isFull = Number(trip.availableSeats) === 0;
                  const selected = selectedTripId === trip.tripId;
                  const duration = tripDuration(trip.departureTime, trip.arrivalTime);

                  return (
                    <article key={trip.tripId} className={`flex flex-col justify-between rounded-xl border p-5 shadow-2xs transition-all duration-200 hover:shadow-xs ${selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{trip.routeCode}</span>
                          <span className={`text-xs font-bold ${isFull ? 'text-rose-600' : lowSeats ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {isFull ? 'Fully booked' : lowSeats ? `Only ${trip.availableSeats} seats left` : `${trip.availableSeats} seats available`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                          <span>{trip.origin}</span>
                          <ArrowRight size={18} className="text-blue-700 shrink-0" />
                          <span>{trip.destination}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <CalendarDays size={14} className="text-blue-700 shrink-0" />
                          <span>{dateTime(trip.departureTime)}{duration ? ` · (${duration})` : ''}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${isFull ? 'bg-rose-500' : lowSeats ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${seatRatio}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Fare</span>
                          <span className="text-base font-bold text-slate-900">{money(trip.fareAmount)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => { setSelectedTripId(trip.tripId); setSeatCount(1); setSeatError(''); }}
                          disabled={isFull}
                          aria-pressed={selected}
                          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isFull
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : selected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-700 text-white hover:bg-blue-800'
                          }`}
                        >
                          {isFull ? 'Fully Booked' : selected ? 'Trip selected' : 'Select trip'}
                        </button>
                      </div>
                    </article>
                  );
                })}
                    </section>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const trip = selectedRouteTrips.find((item) => item.tripId === selectedTripId);
                          if (trip) openBooking(trip);
                        }}
                        disabled={!selectedTripId || !selectedRouteTrips.some((trip) => trip.tripId === selectedTripId)}
                        className="rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Continue to booking
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'bookings' && (
          <section className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">My bookings</h2>
              <p className="text-xs text-slate-500">View upcoming reservations, travel history, and complete pending payments.</p>
            </div>

            {bookingsLoading ? (
              <div className="grid gap-4 md:grid-cols-2" aria-label="Loading bookings">
                {[0, 1].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : !passengerId ? (
              <EmptyState icon={<Ticket size={24} />} title="No Passenger Selected" message="Select a passenger profile from the top bar to view your bookings." />
            ) : bookings.length === 0 ? (
              <EmptyState icon={<Ticket size={24} />} title="No Bookings Found" message="You do not have any travel bookings registered yet." />
            ) : (
              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Journeys ({upcomingBookings.length})</h3>
                  {upcomingBookings.length ? (
                    <div className="grid gap-4 md:grid-cols-2">{upcomingBookings.map(bookingCard)}</div>
                  ) : (
                    <EmptyState icon={<CalendarDays size={20} />} message="No upcoming trips scheduled." />
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Past Journeys ({pastBookings.length})</h3>
                  {pastBookings.length ? (
                    <div className="grid gap-4 md:grid-cols-2">{pastBookings.map(bookingCard)}</div>
                  ) : (
                    <EmptyState icon={<CheckCircle2 size={20} />} message="No past trips recorded." />
                  )}
                </section>
              </div>
            )}
          </section>
        )}

        {activeTab === 'feedback' && (
          <section className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Trip feedback & ratings</h2>
              <p className="text-xs text-slate-500">Rate completed journeys and share feedback with transit managers.</p>
            </div>

            {bookingsLoading ? (
              <div className="h-36 animate-pulse rounded-xl bg-slate-200" aria-label="Loading feedback trips" />
            ) : !passengerId ? (
              <EmptyState icon={<Star size={24} />} message="Select a passenger profile from the top bar to view completed trips." />
            ) : completedBookings.length ? (
              <div className="grid gap-4 xl:grid-cols-2">{completedBookings.map(feedbackCard)}</div>
            ) : (
              <EmptyState icon={<Star size={24} />} title="No Completed Trips" message="Completed trips will appear here so you can leave feedback." />
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">System Announcements & Reviews</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {contentSource === 'mongodb' ? 'Live MongoDB' : contentSource === 'demo' ? 'Demo mode' : 'Unavailable'}
                </span>
              </div>
              {announcements.length ? (
                announcements.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="text-xs text-slate-700 space-y-0.5">
                    <strong className="font-bold text-slate-900">{item.title}: </strong>
                    <span>{item.detail}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No active system announcements.</p>
              )}
              {reviewCount > 0 && (
                <p className="mt-2 text-[11px] text-slate-500">{reviewCount} review(s) returned by content service.</p>
              )}
            </section>
          </section>
        )}

        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* ── Dialog Modals ── */}
      <Modal isOpen={Boolean(bookingDialogTrip)} onClose={() => { if (busyAction !== 'booking') setBookingDialogTrip(null); }} title="Book trip seat" size="md">
        {bookingDialogTrip && (
          <FocusTrap>
            <form onSubmit={bookTrip} noValidate className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  {bookingDialogTrip.origin} <ArrowRight size={16} className="text-blue-700" /> {bookingDialogTrip.destination}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  {dateTime(bookingDialogTrip.departureTime)} · Route {bookingDialogTrip.routeCode}
                </p>
              </div>

              <label className="block space-y-1 text-xs font-semibold text-slate-700">
                <span>Number of seats</span>
                <input
                  type="number"
                  min="1"
                  max={bookingDialogTrip.availableSeats}
                  step="1"
                  value={seatCount}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    const normalizedCount = Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1;
                    setSeatCount(normalizedCount);
                    setSeatError(normalizedCount > bookingDialogTrip.availableSeats
                      ? `Only ${bookingDialogTrip.availableSeats} seats are available for this trip.`
                      : '');
                  }}
                  className={inputClass}
                  aria-label="Number of seats"
                  aria-invalid={Boolean(seatError)}
                />
                {seatError && <span className={fieldErrorClass}>{seatError}</span>}
                <span className="text-[11px] font-normal text-slate-500">Choose 1 to {bookingDialogTrip.availableSeats} available seats.</span>
              </label>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4 text-slate-600">
                  <span>Fare per seat</span>
                  <span>{money(baseFare)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-4 text-slate-600">
                  <span>Seats</span>
                  <span>{selectedSeatCount}</span>
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t border-slate-200 pt-3 font-bold text-slate-900">
                  <span>Total amount</span>
                  <span>{money(totalAmount)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setBookingDialogTrip(null)} disabled={busyAction === 'booking'} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={busyAction === 'booking' || selectedSeatCount > bookingDialogTrip.availableSeats} className="rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                  {busyAction === 'booking' ? 'Booking…' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </FocusTrap>
        )}
      </Modal>

      <Modal isOpen={Boolean(paymentDialogBookings?.length)} onClose={() => { if (busyAction !== 'payment') setPaymentDialogBookings(null); }} title="Complete payment" size="md">
        {paymentDialogBooking && (
          <FocusTrap>
            <form onSubmit={payBooking} noValidate className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-900">{routeTitle(paymentDialogBooking)}</p>
                <p className="text-xs text-slate-500 mt-1">Bookings #{(paymentDialogBookings ?? []).map((booking) => booking.bookingId).join(', ')} · Seats {(paymentDialogBookings ?? []).map((booking) => booking.seatNumber).join(', ')}</p>
              </div>

              <label className="block space-y-1 text-xs font-semibold text-slate-700">
                <span>Amount to pay</span>
                <input value={money(paymentDialogAmount)} readOnly className={`${inputClass} bg-slate-50 text-slate-900 font-bold text-base`} aria-label="Payment amount" />
              </label>

              <label className="block space-y-1 text-xs font-semibold text-slate-700">
                <span>Payment method</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass} aria-label="Payment method">
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m.replaceAll('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
                {paymentError && <span className={fieldErrorClass}>{paymentError}</span>}
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPaymentDialogBookings(null)} disabled={busyAction === 'payment'} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={busyAction === 'payment'} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {busyAction === 'payment' ? 'Processing…' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </FocusTrap>
        )}
      </Modal>

      <Modal isOpen={Boolean(cancelDialogBooking)} onClose={() => { if (busyAction !== 'cancel') setCancelDialogBooking(null); }} title="Cancel booking" size="sm">
        {cancelDialogBooking && (
          <FocusTrap>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-rose-50 p-3 text-rose-800 border border-rose-200">
                <AlertTriangle size={20} className="shrink-0 text-rose-600" />
                <p className="text-xs font-medium">Cancellations must be made at least 2 hours prior to departure. Any paid fare will be refunded automatically.</p>
              </div>

              <p className="text-xs font-bold text-slate-900">{routeTitle(cancelDialogBooking)} · {dateTime(cancelDialogBooking.departureTime)}</p>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCancelDialogBooking(null)} disabled={busyAction === 'cancel'} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Keep booking
                </button>
                <button type="button" onClick={cancelBooking} disabled={busyAction === 'cancel'} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                  {busyAction === 'cancel' ? 'Cancelling…' : 'Confirm cancellation'}
                </button>
              </div>
            </div>
          </FocusTrap>
        )}
      </Modal>
    </div>
  );
};

export default PassengerDashboard;
