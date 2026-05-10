import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../lib/api';
import type { AppointmentStatus } from '../../types';

type Summary = {
  range: { from: string; to: string };
  appointmentsByStatus: Partial<Record<AppointmentStatus, number>>;
  upcomingScheduledCount: number;
  totalUsers: number;
};

export function AdminAnalytics() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await api.get<Summary>('/admin/analytics/summary');
        setData(res);
      } catch (e) {
        setErr(getApiErrorMessage(e));
      }
    })();
  }, []);

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {err}
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-600">Loading…</p>;
  }

  const statuses: AppointmentStatus[] = [
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELED',
    'NO_SHOW',
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
      <p className="mt-1 text-slate-600">
        Snapshot for range {new Date(data.range.from).toLocaleDateString()} –{' '}
        {new Date(data.range.to).toLocaleDateString()}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Upcoming active</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.upcomingScheduledCount}</p>
          <p className="text-xs text-slate-500">Scheduled or in progress from now</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Total users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.totalUsers}</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Appointments by status (range)</h2>
        <ul className="mt-4 space-y-2">
          {statuses.map((s) => (
            <li key={s} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{s}</span>
              <span className="font-semibold text-slate-900">
                {data.appointmentsByStatus[s] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
