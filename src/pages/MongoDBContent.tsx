import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar';
import { apiGet } from '../services/api';

type ContentItem = { id: string; title: string; detail: string; meta: string; type: string };

const MongoDBContent: React.FC = () => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiGet<{ reviews: Array<Record<string, unknown>>; announcements: ContentItem[]; documents: ContentItem[]; media: ContentItem[] }>('/mongodb/content').then((content) => {
      const reviews = content.reviews.map((item) => ({ id: `review-${item.id}`, title: `${item.rating}/5 · ${item.passengerName ?? 'Passenger'}`, detail: String(item.comment ?? ''), meta: `${item.routeCode ?? 'Route'} · ${item.feedbackDate ?? ''}`, type: 'reviews' }));
      setItems([...reviews, ...content.announcements.map((item) => ({ ...item, type: 'announcements' })), ...content.documents.map((item) => ({ ...item, type: 'documents' })), ...content.media.map((item) => ({ ...item, type: 'media' }))]);
    }).catch((requestError: Error) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => items.filter((item) => (type === 'all' || item.type === type) && `${item.title} ${item.detail} ${item.meta}`.toLowerCase().includes(search.toLowerCase())), [items, search, type]);

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-gray-900">MongoDB Content</h2><p className="mt-1 text-sm text-gray-500">Optional document-style content for reviews, notices, documents, and trip media.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Demo data · Live MongoDB not configured</span></div>
    <div className="flex flex-col gap-3 sm:flex-row"><SearchBar value={search} onChange={setSearch} placeholder="Search content…" className="max-w-md" /><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" aria-label="Filter content"><option value="all">All content</option><option value="reviews">Passenger reviews</option><option value="announcements">Travel announcements</option><option value="documents">Vehicle documents</option><option value="media">Trip multimedia</option></select></div>
    {loading && <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">Loading MongoDB-style content…</div>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Unable to load content: {error}</div>}
    {!loading && filtered.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">No MongoDB demo content matches the current filter.</div> : <div className="grid gap-4 md:grid-cols-2">{filtered.map((item) => <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center justify-between"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium capitalize text-blue-700">{item.type}</span><span className="text-xs text-gray-400">Sample</span></div><h3 className="font-semibold text-gray-900">{item.title}</h3><p className="mt-2 text-sm text-gray-600">{item.detail}</p><p className="mt-3 text-xs text-gray-400">{item.meta}</p></article>)}</div>}
  </div>;
};
export default MongoDBContent;
