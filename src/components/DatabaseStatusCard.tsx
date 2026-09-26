import React, { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

type Health = { connected: boolean; mode: string; message: string };
type Status = { mode: 'oracle' | 'demo'; oracle: Health; mongodb: Health };

const DatabaseStatusCard: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [checkedAt, setCheckedAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Status>('/health/databases')
      .then((result) => {
        setStatus(result);
        setCheckedAt(new Date().toLocaleTimeString());
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900">Database status</h2>
        <div className="flex items-center gap-3">
          {status && <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Application mode: {status.mode === 'oracle' ? 'Oracle' : 'Demo'}</span>}
          <span className="text-xs text-gray-400">{checkedAt ? `Last checked ${checkedAt}` : 'Checking status…'}</span>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(['oracle', 'mongodb'] as const).map((name) => {
          const health = status?.[name];
          return (
            <div key={name} className={`rounded-lg p-3 ${health?.connected ? 'bg-green-50' : 'bg-amber-50'}`}>
              <p className="text-sm font-semibold capitalize text-gray-900">{name === 'mongodb' ? 'MongoDB content' : 'Oracle database'}</p>
              <p className={`text-sm font-medium ${health?.connected ? 'text-green-700' : 'text-amber-700'}`}>
                {health ? (health.connected ? 'Connected' : 'Unavailable') : 'Checking'}
              </p>
              <p className="mt-1 text-xs text-gray-600">{health?.message ?? 'Waiting for the backend health check.'}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
export default DatabaseStatusCard;
