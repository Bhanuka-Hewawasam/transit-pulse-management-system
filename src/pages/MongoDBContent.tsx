import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { ApiError, apiGet, apiPost } from '../services/api';

type ContentItem = { id: string; title: string; detail: string; meta: string; type: string };
type AnnouncementStatus = 'draft' | 'published' | 'scheduled' | 'expired';
type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
type AnnouncementAudience = 'all' | 'passengers' | 'drivers';
type AnnouncementDraft = {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  startDate: string;
  endDate: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  routeId: string;
  tripId: string;
};
type MongoContent = {
  demo: boolean;
  reviews: Array<Record<string, unknown>>;
  announcements: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
};
type LoadedContent = { items: ContentItem[]; source: 'mongodb' | 'demo' };

const loadMongoContent = async (includeInactive: boolean): Promise<LoadedContent> => {
  const content = await apiGet<MongoContent>(`/mongodb/content${includeInactive ? '?includeInactive=true' : ''}`);
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
    detail: value(item, 'message', 'body', 'detail'),
    meta: [value(item, 'audience'), value(item, 'status'), value(item, 'priority'), value(item, 'startDate', 'activeFrom'), value(item, 'endDate', 'activeTo')].filter(Boolean).join(' · ') || 'Active announcement',
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
  return { items: [...reviews, ...announcements, ...documents, ...media], source: content.demo ? 'demo' : 'mongodb' };
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const emptyAnnouncement = (): AnnouncementDraft => ({
  title: '', message: '', audience: 'all', startDate: today(), endDate: '', priority: 'normal', status: 'published', routeId: '', tripId: '',
});

const value = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return String(record[key]);
  return '';
};

const MongoDBContent: React.FC<{ role: 'admin' | 'passenger' | 'driver'; searchValue?: string; onSearchValueChange?: (value: string) => void }> = ({ role, searchValue, onSearchValueChange }) => {
  const [localSearch, setLocalSearch] = useState('');
  const [type, setType] = useState('all');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [source, setSource] = useState<'mongodb' | 'demo' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<AnnouncementDraft>(emptyAnnouncement);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const search = searchValue ?? localSearch;
  const setSearch = onSearchValueChange ?? setLocalSearch;

  useEffect(() => {
    let active = true;
    loadMongoContent(role === 'admin').then((content) => {
      if (!active) return;
      setItems(content.items);
      setSource(content.source);
    }).catch((requestError: Error) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [role]);

  const saveAnnouncement = async (saveAs: 'draft' | 'publish') => {
    setSaving(true);
    setToast(null);
    try {
      const status = saveAs === 'draft' ? 'draft' : announcement.status === 'draft' ? 'published' : announcement.status;
      await apiPost('/mongodb/announcements', {
        ...announcement,
        endDate: announcement.endDate || undefined,
        routeId: announcement.routeId.trim() || undefined,
        tripId: announcement.tripId.trim() || undefined,
        status,
      });
      setAnnouncementOpen(false);
      setAnnouncement(emptyAnnouncement());
      setToast({ kind: 'success', message: status === 'draft' ? 'Announcement saved as a draft.' : 'Announcement saved successfully.' });
      try {
        const refreshed = await loadMongoContent(role === 'admin');
        setItems(refreshed.items);
        setSource(refreshed.source);
        setError(null);
      } catch {
        setError(new Error('The announcement was saved, but the content list could not be refreshed. Reload the page to see it.'));
      }
    } catch (saveError) {
      setToast({ kind: 'error', message: saveError instanceof Error ? saveError.message : 'Announcement could not be saved. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => items.filter((item) => (type === 'all' || item.type === type) && `${item.title} ${item.detail} ${item.meta}`.toLowerCase().includes(search.toLowerCase())), [items, search, type]);
  const sourceLabel = source === 'mongodb' ? 'Live MongoDB content' : source === 'demo' ? 'Demo fallback content' : 'Source unavailable';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">MongoDB Content</h2><p className="mt-1 text-sm text-gray-600">Reviews, announcements, vehicle documents, and trip media.</p></div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span role="status" className={`text-sm font-medium ${source === 'mongodb' ? 'text-emerald-700' : source === 'demo' ? 'text-amber-700' : 'text-gray-500'}`}>{sourceLabel}</span>
          {role === 'admin' && <button type="button" onClick={() => { setAnnouncement(emptyAnnouncement()); setAnnouncementOpen(true); }} className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"><Plus size={16} />Add Announcement</button>}
        </div>
      </div>
      {toast && <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`rounded border p-3 text-sm ${toast.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{toast.message}</div>}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:flex-row">{onSearchValueChange === undefined && <SearchBar value={search} onChange={setSearch} placeholder="Search content…" className="max-w-md" />}<label className="sr-only" htmlFor="content-filter">Filter content</label><select id="content-filter" value={type} onChange={(event) => setType(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"><option value="all">All content</option><option value="reviews">Passenger reviews</option><option value="announcements">Travel announcements</option><option value="documents">Vehicle documents</option><option value="media">Trip media</option></select></div>
      {loading && <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">Loading content from the backend…</p>}
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>Unable to load content: {error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
      {!loading && !error && filtered.length === 0 ? <div className="border-t border-gray-200 py-10 text-center text-sm text-gray-500">No content matches this search and filter.</div> : <div className="grid gap-3 md:grid-cols-2">{filtered.map((item) => <article key={item.id} className="rounded border border-gray-200 bg-white p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase text-blue-800">{item.type}</span><span className="text-xs text-gray-500">{source === 'mongodb' ? 'Live record' : 'Demo record'}</span></div><h3 className="font-semibold text-gray-900">{item.title}</h3><p className="mt-2 break-words text-sm text-gray-600">{item.detail || 'No additional detail.'}</p><p className="mt-3 text-xs text-gray-500">{item.meta}</p></article>)}</div>}
      <Modal isOpen={announcementOpen} onClose={() => { if (!saving) setAnnouncementOpen(false); }} title="Add travel announcement" size="lg">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void saveAnnouncement('publish'); }}>
          <div><label htmlFor="announcement-title" className="mb-1 block text-sm font-medium text-gray-700">Title</label><input id="announcement-title" required value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
          <div><label htmlFor="announcement-message" className="mb-1 block text-sm font-medium text-gray-700">Message / content</label><textarea id="announcement-message" required rows={4} value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="announcement-audience" className="mb-1 block text-sm font-medium text-gray-700">Audience</label><select id="announcement-audience" value={announcement.audience} onChange={(event) => setAnnouncement({ ...announcement, audience: event.target.value as AnnouncementAudience })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="all">Everyone</option><option value="passengers">Passengers</option><option value="drivers">Drivers</option></select></div>
            <div><label htmlFor="announcement-start" className="mb-1 block text-sm font-medium text-gray-700">Start date</label><input id="announcement-start" type="date" required value={announcement.startDate} onChange={(event) => setAnnouncement({ ...announcement, startDate: event.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
            <div><label htmlFor="announcement-end" className="mb-1 block text-sm font-medium text-gray-700">End date</label><input id="announcement-end" type="date" min={announcement.startDate} value={announcement.endDate} onChange={(event) => setAnnouncement({ ...announcement, endDate: event.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
            <div><label htmlFor="announcement-priority" className="mb-1 block text-sm font-medium text-gray-700">Priority</label><select id="announcement-priority" value={announcement.priority} onChange={(event) => setAnnouncement({ ...announcement, priority: event.target.value as AnnouncementPriority })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
            <div><label htmlFor="announcement-status" className="mb-1 block text-sm font-medium text-gray-700">Status</label><select id="announcement-status" value={announcement.status} onChange={(event) => setAnnouncement({ ...announcement, status: event.target.value as AnnouncementStatus })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="expired">Expired</option></select></div>
            <div><label htmlFor="announcement-route" className="mb-1 block text-sm font-medium text-gray-700">Route ID <span className="font-normal text-gray-500">(optional)</span></label><input id="announcement-route" value={announcement.routeId} onChange={(event) => setAnnouncement({ ...announcement, routeId: event.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
            <div><label htmlFor="announcement-trip" className="mb-1 block text-sm font-medium text-gray-700">Trip ID <span className="font-normal text-gray-500">(optional)</span></label><input id="announcement-trip" value={announcement.tripId} onChange={(event) => setAnnouncement({ ...announcement, tripId: event.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
            <button type="button" disabled={saving} onClick={() => setAnnouncementOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void saveAnnouncement('draft')} className="rounded-md border border-blue-800 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">{saving ? 'Saving…' : 'Save Draft'}</button>
            <button type="submit" disabled={saving} className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">{saving ? 'Saving…' : 'Publish Announcement'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default MongoDBContent;
