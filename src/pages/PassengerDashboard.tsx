import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { apiGet, apiPost } from '../services/api';
import type { Booking, Route, Trip } from '../types';

const PassengerDashboard: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState('');
  const [seat, setSeat] = useState('A01');
  const [tripId, setTripId] = useState('1');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [source, setSource] = useState('Demo Data');
  const [announcements, setAnnouncements] = useState<{ title: string; detail: string }[]>([]);
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');

  useEffect(() => {
    Promise.all([apiGet<Route[]>('/routes'), apiGet<Trip[]>('/trips'), apiGet<Booking[]>('/bookings'), apiGet<{ oracle: { mode: string } }>('/health/databases'), apiGet<{ announcements: { title: string; detail: string }[]; reviews: Record<string, unknown>[] }>('/mongodb/content')])
      .then(([routeRows, tripRows, bookingRows, status, content]) => { setRoutes(routeRows); setTrips(tripRows); setBookings(bookingRows.filter((booking) => booking.passengerId === 1)); setSource(status.oracle.mode === 'oracle' ? 'Oracle Database' : 'Demo Data'); setAnnouncements(content.announcements); setReviews(content.reviews); })
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  const filteredTrips = useMemo(() => trips.filter((trip) => `${trip.routeCode} ${trip.origin} ${trip.destination}`.toLowerCase().includes(query.toLowerCase())), [trips, query]);
  const bookingColumns: Column<Booking>[] = [{ key: 'routeCode', label: 'Route' }, { key: 'seatNumber', label: 'Seat' }, { key: 'bookingDate', label: 'Booked' }, { key: 'status', label: 'Booking status', render: (row) => <StatusBadge status={row.status} /> }, { key: 'amount', label: 'Payment status', render: () => <StatusBadge status="paid" /> }];

  const bookTicket = async () => { try { const booking = await apiPost<Booking>('/bookings', { tripId: Number(tripId), passengerId: 1, seatNumber: seat, status: 'confirmed', bookingDate: new Date().toISOString().slice(0, 10), amount: 350 }); setBookings((previous) => [...previous, booking]); setMessage('Ticket booked successfully.'); setError(''); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Booking failed'); } };
  const submitFeedback = async () => { try { await apiPost('/feedback', { passengerId: 1, tripId: Number(tripId), rating: Number(rating), comment, category: 'general', feedbackDate: new Date().toISOString().slice(0, 10) }); setMessage('Feedback submitted successfully.'); setComment(''); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Feedback failed'); } };

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-900">Passenger Dashboard</h1><p className="mt-1 text-sm text-gray-500">Search trips, manage bookings, and review your travel history.</p><span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Data source: {source}</span></div>{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}{message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Available trips</h2><div className="mt-3 flex flex-col gap-3 sm:flex-row"><SearchBar value={query} onChange={setQuery} placeholder="Search routes or destinations…" className="max-w-md" /><select value={tripId} onChange={(event) => setTripId(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" aria-label="Select trip">{filteredTrips.map((trip) => <option key={trip.id} value={trip.id}>{trip.routeCode} · {trip.origin} to {trip.destination}</option>)}</select><input value={seat} onChange={(event) => setSeat(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Seat" aria-label="Seat" /><button type="button" onClick={bookTicket} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Book ticket</button></div><p className="mt-3 text-xs text-gray-500">{routes.length} routes available. Announcements and route reviews are available in MongoDB Content.</p></section>
    <section><h2 className="mb-3 text-lg font-semibold text-gray-900">My bookings and travel history</h2><DataTable<Booking> columns={bookingColumns} data={bookings} emptyMessage="No bookings yet." /></section>
    <div className="grid gap-4 md:grid-cols-2"><section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Travel announcements and route reviews</h2>{announcements.map((item) => <p key={item.title} className="mt-2 text-sm text-gray-600"><strong>{item.title}:</strong> {item.detail}</p>)}<p className="mt-3 text-xs text-gray-500">{reviews.length} route review(s) available from MongoDB-style content.</p></section><section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Submit feedback</h2><div className="mt-3 flex gap-2"><select value={rating} onChange={(event) => setRating(event.target.value)} className="rounded border border-gray-200 px-2 py-2 text-sm" aria-label="Rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Your feedback" className="min-w-0 flex-1 rounded border border-gray-200 px-3 py-2 text-sm" aria-label="Feedback comment" /><button type="button" onClick={submitFeedback} className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Submit</button></div></section></div>
  </div>;
};
export default PassengerDashboard;
