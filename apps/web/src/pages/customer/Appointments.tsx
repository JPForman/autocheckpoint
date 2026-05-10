import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Appointment } from '../../types';

export function Appointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ appointments: Appointment[] }>('/appointments');
        setItems(data.appointments);
      } catch (e) {
        setErr(getApiErrorMessage(e));
      }
    })();
  }, []);

  const upcoming = items.filter((a) => new Date(a.endsAt) >= new Date() && a.status !== 'CANCELED');
  const past = items.filter((a) => new Date(a.endsAt) < new Date() || a.status === 'CANCELED');

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="mt-1 text-slate-600">Upcoming and past visits.</p>
        </div>
        <Link
          to="/appointments/new"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          New appointment
        </Link>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800">Upcoming</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {upcoming.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">None scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <Link
                      to={`/appointments/${a.id}`}
                      className="font-medium text-indigo-700 hover:underline"
                    >
                      {a.serviceType}
                    </Link>
                    <p className="text-sm text-slate-600">{formatDateTime(a.startsAt)}</p>
                    <p className="text-xs text-slate-500">Status: {a.status}</p>
                    {a.assignedEmployee && (
                      <p className="text-xs text-slate-600">
                        Technician: {a.assignedEmployee.firstName} {a.assignedEmployee.lastName}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">Past & canceled</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {past.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No history yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {past.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <Link
                    to={`/appointments/${a.id}`}
                    className="font-medium text-slate-800 hover:underline"
                  >
                    {a.serviceType}
                  </Link>
                  <p className="text-sm text-slate-600">{formatDateTime(a.startsAt)}</p>
                  <p className="text-xs text-slate-500">Status: {a.status}</p>
                  {a.assignedEmployee && (
                    <p className="text-xs text-slate-600">
                      Technician: {a.assignedEmployee.firstName} {a.assignedEmployee.lastName}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
