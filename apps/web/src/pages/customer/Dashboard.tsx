import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Appointment } from '../../types';

export function Dashboard() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ appointments: Appointment[] }>('/appointments', {
          params: { from: new Date().toISOString() },
        });
        setItems(data.appointments.slice(0, 5));
      } catch (e) {
        setErr(getApiErrorMessage(e));
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-600">Your upcoming service visits.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/appointments/new"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Schedule appointment
        </Link>
        <Link
          to="/appointments"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          View all appointments
        </Link>
      </div>

      {err && (
        <p className="mt-6 text-sm text-red-600">{err}</p>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
          Next up
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No upcoming appointments.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <Link to={`/appointments/${a.id}`} className="font-medium text-indigo-700 hover:underline">
                  {a.serviceType}
                </Link>
                <p className="text-sm text-slate-600">{formatDateTime(a.startsAt)}</p>
                <p className="text-xs text-slate-500">
                  {a.vehicle ? `${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}` : a.vehicleId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
