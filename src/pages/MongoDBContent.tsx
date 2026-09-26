import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar';
import { ApiError, apiGet } from '../services/api';

type ContentItem = { id: string; title: string; detail: string; meta: string; type: string };
type MongoContent = {
  demo: boolean;
  reviews: Array<Record<string, unknown>>;
  announcements: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
};

const value = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return String(record[key]);
  return '';
};

const MongoDBContent: React.FC = () => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [source, setSource] = useState<'mongodb' | 'demo' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<MongoContent>('/mongodb/content').then((content) => {
      if (!active) return;
      const reviews = content.reviews.map((item, index) => ({
        id: `review-${value(item, '_id', 'id') || index}`,
        title: `${value(item, 'rating')}/5 · Passenger #${value(item, 'passengerId') || '—'}`,
        detail: value(item, 'comment', 'feedbackComment'),
        meta: `${value(item, 'routeCode') || 'Route'} · ${value(item, 'createdAt', 'feedbackDate') || 'Date unavailable'}`,
        type: 'reviews',
      }));
      const announcements = content.announcements.map((item, index) => ({
        id: `announcement-${value(item, '_id', 'id') || index}`,
        title: value(item, 'title') || 'Travel announcement',
        detail: value(item, 'body', 'detail'),
        meta: [value(item, 'activeFrom'), value(item, 'activeTo')].filter(Boolean).join(' – ') || 'Active announcement',
        type: 'announcements',
      }));
      const documents = content.documents.map((item, index) => ({
        id: `document-${value(item, '_id', 'id') || index}`,
        title: `${value(item, 'registration', 'registrationNumber') || `Vehicle #${value(item, 'vehicleId')}`} · ${value(item, 'documentType') || 'Document'}`,
        detail: value(item, 'fileUrl') || 'Document record',
        meta: value(item, 'expiresOn', 'expiresAt') ? `Expires ${value(item, 'expiresOn', 'expiresAt')}` : 'Expiry date unavailable',
        type: 'documents',
      }));
      const media = content.media.map((item, index) => ({
        id: `media-${value(item, '_id', 'id') || index}`,
        title: `Trip #${value(item, 'tripId') || '—'} · ${value(item, 'mediaType') || 'Media'}`,
        detail: value(item, 'caption') || value(item, 'url'),
        meta: value(item, 'routeCode') || 'Trip media',
        type: 'media',
      }));
      setItems([...reviews, ...announcements, ...documents, ...media]);
      setSource(content.demo ? 'demo' : 'mongodb');
    }).catch((requestError: Error) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => items.filter((item) => (type === 'all' || item.type === type) && `${item.title} ${item.detail} ${item.meta}`.toLowerCase().includes(search.toLowerCase())), [items, search, type]);
  const sourceLabel = source === 'mongodb' ? 'Live MongoDB content' : source === 'demo' ? 'Demo fallback content' : 'Source unavailable';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">MongoDB Content</h2><p className="mt-1 text-sm text-gray-600">Reviews, announcements, vehicle documents, and trip media.</p></div>
        <span role="status" className={`text-sm font-medium ${source === 'mongodb' ? 'text-emerald-700' : source === 'demo' ? 'text-amber-700' : 'text-gray-500'}`}>{sourceLabel}</span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row"><SearchBar value={search} onChange={setSearch} placeholder="Search content…" className="max-w-md" /><label className="sr-only" htmlFor="content-filter">Filter content</label><select id="content-filter" value={type} onChange={(event) => setType(event.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"><option value="all">All content</option><option value="reviews">Passenger reviews</option><option value="announcements">Travel announcements</option><option value="documents">Vehicle documents</option><option value="media">Trip media</option></select></div>
      {loading && <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">Loading content from the backend…</p>}
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>Unable to load content: {error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
      {!loading && !error && filtered.length === 0 ? <div className="border-t border-gray-200 py-10 text-center text-sm text-gray-500">No content matches this search and filter.</div> : <div className="grid gap-3 md:grid-cols-2">{filtered.map((item) => <article key={item.id} className="rounded border border-gray-200 bg-white p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase text-blue-800">{item.type}</span><span className="text-xs text-gray-500">{source === 'mongodb' ? 'Live record' : 'Demo record'}</span></div><h3 className="font-semibold text-gray-900">{item.title}</h3><p className="mt-2 break-words text-sm text-gray-600">{item.detail || 'No additional detail.'}</p><p className="mt-3 text-xs text-gray-500">{item.meta}</p></article>)}</div>}
    </div>
  );
};
export default MongoDBContent;
