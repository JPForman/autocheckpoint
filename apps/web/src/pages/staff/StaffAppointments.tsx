import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Appointment } from '../../types';

export function StaffAppointments() {
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Shop appointments</h1>
      <p className="mt-1 text-slate-600">All customer appointments.</p>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDateTime(a.startsAt)}
                </td>
                <td className="px-4 py-3 text-slate-800">{a.serviceType}</td>
                <td className="px-4 py-3 text-slate-600">
                  {a.customer
                    ? `${a.customer.firstName} ${a.customer.lastName}`
                    : a.customerId}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.assignedEmployee
                    ? `${a.assignedEmployee.firstName} ${a.assignedEmployee.lastName}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/appointments/${a.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No appointments.</p>
        )}
      </div>
    </div>
  );
}
