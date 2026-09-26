import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { ApiError, apiGet, apiPost } from '../services/api';
import type { Booking, Feedback, Passenger, Route, Trip } from '../types';

type BookingRow = { id: number; route: string; seat: string; bookingDate: string; amount: string; status: string };
type ContentItem = { title: string; detail: string };
const money = (amount: number) => `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const displayDate = (value?: string | null) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }) : '—';

const PassengerDashboard: React.FC = () => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [query, setQuery] = useState('');
  const [passengerId, setPassengerId] = useState('');
  const [seat, setSeat] = useState('');
  const [tripId, setTripId] = useState('');
  const [applicationMode, setApplicationMode] = useState<'oracle' | 'demo' | null>(null);
  const [contentSource, setContentSource] = useState<'mongodb' | 'demo' | 'unavailable'>('unavailable');
  const [announcements, setAnnouncements] = useState<ContentItem[]>([]);
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<Passenger[]>('/passengers'), apiGet<Route[]>('/routes'), apiGet<Trip[]>('/trips'),
      apiGet<Booking[]>('/bookings'), apiGet<Feedback[]>('/feedback'), apiGet<{ mode: 'oracle' | 'demo' }>('/health/databases'),
    ]).then(([passengerRows, routeRows, tripRows, bookingRows, feedbackRows, health]) => {
      if (!active) return;
      setPassengers(passengerRows); setRoutes(routeRows); setTrips(tripRows); setBookings(bookingRows);
      setFeedback(feedbackRows); setApplicationMode(health.mode);
    }).catch((requestError: Error) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });

    apiGet<{ demo: boolean; announcements: Array<Record<string, unknown>>; reviews: Array<Record<string, unknown>> }>('/mongodb/content')
      .then((content) => {
        if (!active) return;
        setContentSource(content.demo ? 'demo' : 'mongodb');
        setAnnouncements(content.announcements.map((item) => ({ title: String(item.title ?? 'Announcement'), detail: String(item.body ?? item.detail ?? '') })));
        setReviews(content.reviews);
      })
      .catch(() => { if (active) setContentSource('unavailable'); });
    return () => { active = false; };
  }, []);

  const filteredTrips = useMemo(() => trips.filter((trip) => {
    const route = routes.find((item) => item.id === trip.routeId);
    return `${route?.routeCode ?? ''} ${route?.origin ?? ''} ${route?.destination ?? ''}`.toLowerCase().includes(query.toLowerCase());
  }), [trips, routes, query]);
  const selectedTrip = trips.find((trip) => trip.id === Number(tripId));
  const selectedRoute = routes.find((route) => route.id === selectedTrip?.routeId);
  const passengerBookings = bookings.filter((booking) => passengerId && booking.passengerId === Number(passengerId));
  const bookingRows: BookingRow[] = passengerBookings.map((booking) => {
    const trip = trips.find((item) => item.id === booking.tripId);
    const route = routes.find((item) => item.id === trip?.routeId);
    return { id: booking.id, route: route ? `${route.routeCode} · ${route.origin} to ${route.destination}` : `Route #${trip?.routeId ?? '—'}`, seat: booking.seatNumber, bookingDate: displayDate(booking.bookingDate), amount: money(Number(booking.amount)), status: booking.status };
  });
  const bookingColumns: Column<BookingRow>[] = [
    { key: 'route', label: 'Route' }, { key: 'seat', label: 'Seat' }, { key: 'bookingDate', label: 'Booked' },
    { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Booking status', render: (row) => <StatusBadge status={row.status} type="booking" /> },
  ];

  const refreshBookings = async () => setBookings(await apiGet<Booking[]>('/bookings'));
  const refreshFeedback = async () => setFeedback(await apiGet<Feedback[]>('/feedback'));

  const bookTicket = async () => {
    setError(null); setMessage('');
    if (!passengerId || !tripId || !seat.trim()) {
      setError(new Error('Select a passenger and trip, then enter a seat number.'));
      return;
    }
    if (!selectedRoute) {
      setError(new Error('The selected trip route is unavailable. Refresh the page and try again.'));
      return;
    }
    setSaving(true);
    try {
      await apiPost<Booking>('/bookings', { tripId: Number(tripId), passengerId: Number(passengerId), seatNumber: seat.trim(), status: 'confirmed', amount: Number(selectedRoute.fareAmount) });
      await refreshBookings();
      setMessage('Booking saved and travel history refreshed.');
      setSeat('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('Booking failed.'));
    } finally {
      setSaving(false);
    }
  };

  const submitFeedback = async () => {
    setError(null); setMessage('');
    if (!passengerId || !tripId || !comment.trim()) {
      setError(new Error('Select a passenger and trip, then enter a comment.'));
      return;
    }
    if (!selectedTrip) {
      setError(new Error('The selected trip is unavailable. Refresh the page and try again.'));
      return;
    }
    setSaving(true);
    try {
      await apiPost('/feedback', {
        passengerId: Number(passengerId), tripId: selectedTrip.id, driverId: selectedTrip.driverId,
        vehicleId: selectedTrip.vehicleId, rating: Number(rating), comment: comment.trim(), category: 'general',
      });
      await refreshFeedback();
      setMessage('Feedback saved and records refreshed.');
      setComment('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('Feedback submission failed.'));
    } finally {
      setSaving(false);
    }
  };

  const selectedPassenger = passengers.find((passenger) => passenger.id === Number(passengerId));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Passenger Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Select a passenger profile to view bookings, book a trip, or submit feedback.</p>
        <p className="mt-2 text-xs text-gray-500" role="status">Application mode: {applicationMode === 'oracle' ? 'Oracle' : applicationMode === 'demo' ? 'Demo' : 'Checking'}</p>
      </header>
      <label className="block max-w-md space-y-1 text-sm font-medium text-gray-700"><span>Passenger profile</span><select value={passengerId} onChange={(event) => { setPassengerId(event.target.value); setMessage(''); }} className="w-full rounded border border-gray-300 bg-white px-3 py-2" aria-label="Passenger profile"><option value="">Select a passenger</option>{passengers.map((passenger) => <option key={passenger.id} value={passenger.id}>{passenger.firstName} {passenger.lastName} · #{passenger.id}</option>)}</select></label>
      {loading && <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">Loading passenger and trip records…</p>}
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
      {message && <p role="status" className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Available trips</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Search routes or destinations…" />
          <label className="block space-y-1 text-sm text-gray-700"><span>Trip</span><select value={tripId} onChange={(event) => setTripId(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" aria-label="Select trip"><option value="">Select a trip</option>{filteredTrips.map((trip) => { const route = routes.find((item) => item.id === trip.routeId); return <option key={trip.id} value={trip.id}>#{trip.id} · {route?.routeCode ?? `Route ${trip.routeId}`} · {route?.origin ?? ''} to {route?.destination ?? ''}</option>; })}</select></label>
          <label className="block space-y-1 text-sm text-gray-700"><span>Seat number</span><input value={seat} onChange={(event) => setSeat(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" aria-label="Seat number" /></label>
          <div className="flex items-end"><button type="button" onClick={bookTicket} disabled={saving || loading} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Book ticket'}</button></div>
        </div>
        <p className="mt-3 text-xs text-gray-600">{routes.length} route(s) are available. {selectedRoute ? `Selected fare: ${money(selectedRoute.fareAmount)}.` : ''}</p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">{selectedPassenger ? `${selectedPassenger.firstName}'s bookings` : 'Passenger bookings'}</h2>
        <DataTable<BookingRow> columns={bookingColumns} data={bookingRows} loading={loading} emptyMessage={passengerId ? 'No bookings for this passenger.' : 'Select a passenger to view bookings.'} />
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-gray-900">Travel announcements and reviews</h2><span className="text-xs text-gray-500">{contentSource === 'mongodb' ? 'Live MongoDB' : contentSource === 'demo' ? 'Demo fallback' : 'Unavailable'}</span></div>
          {announcements.map((item, index) => <p key={`${item.title}-${index}`} className="mt-2 text-sm text-gray-700"><strong>{item.title}:</strong> {item.detail}</p>)}
          <p className="mt-3 text-xs text-gray-600">{reviews.length} review(s) returned by the content endpoint.</p>
        </section>
        <section className="rounded border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900">Submit feedback for a trip</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr_auto]">
            <label className="block space-y-1 text-sm text-gray-700"><span>Rating</span><select value={rating} onChange={(event) => setRating(event.target.value)} className="rounded border border-gray-300 px-3 py-2" aria-label="Rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label>
            <label className="block space-y-1 text-sm text-gray-700"><span>Comment</span><input value={comment} onChange={(event) => setComment(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" aria-label="Feedback comment" /></label>
            <button type="button" onClick={submitFeedback} disabled={saving || loading} className="self-end rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Submit</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">Feedback is linked to the selected passenger, trip, driver, and vehicle.</p>
        </section>
      </div>
      {selectedPassenger && <p className="text-xs text-gray-500">Feedback records for this profile: {feedback.filter((item) => item.passengerId === selectedPassenger.id).length}.</p>}
    </div>
  );
};
export default PassengerDashboard;
