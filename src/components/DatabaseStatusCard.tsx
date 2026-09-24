import React, { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

type Health = { connected: boolean; mode: string; message: string };
const DatabaseStatusCard: React.FC = () => {
  const [status, setStatus] = useState<{ oracle: Health; mongodb: Health } | null>(null);
  const [checkedAt, setCheckedAt] = useState('');
  useEffect(() => { apiGet<{ oracle: Health; mongodb: Health }>('/health/databases').then((result) => { setStatus(result); setCheckedAt(new Date().toLocaleTimeString()); }).catch(() => setStatus(null)); }, []);
  const source = (health?: Health) => health?.connected ? 'Connected' : 'Demo Mode';
  return <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold text-gray-900">Database status</h2><span className="text-xs text-gray-400">Last checked {checkedAt || '—'}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{(['oracle', 'mongodb'] as const).map((name) => <div key={name} className={`rounded-lg p-3 ${status?.[name].connected ? 'bg-green-50' : 'bg-amber-50'}`}><p className="text-sm font-semibold capitalize text-gray-900">{name === 'mongodb' ? 'MongoDB' : 'Oracle'}</p><p className={`text-sm font-medium ${status?.[name].connected ? 'text-green-700' : 'text-amber-700'}`}>{source(status?.[name])}</p><p className="mt-1 text-xs text-gray-600">{status?.[name].message ?? 'Checking database status…'}</p></div>)}</div></section>;
};
export default DatabaseStatusCard;
