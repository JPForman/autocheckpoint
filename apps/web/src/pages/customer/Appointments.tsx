import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Appointment } from '../../types';

type ViewMode = 'list' | 'calendar';

const VIEW_STORAGE_KEY = 'customer_appt_view';

function readStoredView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === 'list' || v === 'calendar') return v;
  } catch {
    /* ignore */
  }
  return 'list';
}

function persistView(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-indigo-500',
  IN_PROGRESS: 'bg-indigo-400',
  COMPLETED: 'bg-emerald-500',
  CANCELED: 'bg-slate-400',
  NO_SHOW: 'bg-slate-400',
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Appointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredView);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  function setView(mode: ViewMode) {
    setViewMode(mode);
    persistView(mode);
  }

  const upcoming = items.filter((a) => new Date(a.endsAt) >= new Date() && a.status !== 'CANCELED');
  const past = items.filter((a) => new Date(a.endsAt) < new Date() || a.status === 'CANCELED');
  const selectedDayAppts = items.filter((a) => isSameDay(new Date(a.startsAt), selectedDate));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="mt-1 text-slate-600">Upcoming and past visits.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calendar
            </button>
          </div>
          <Link
            to="/appointments/new"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            New appointment
          </Link>
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      {viewMode === 'list' ? (
        <>
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
            <h2 className="text-lg font-semibold text-slate-800">Past &amp; canceled</h2>
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
        </>
      ) : (
        <div className="mt-8">
          <div className="appt-calendar overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Calendar
              value={selectedDate}
              onChange={(val) => setSelectedDate(val as Date)}
              tileContent={({ date }) => {
                const appts = items.filter((a) => isSameDay(new Date(a.startsAt), date));
                if (appts.length === 0) return null;
                return (
                  <div className="mt-0.5 flex justify-center gap-0.5">
                    {appts.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[a.status] ?? 'bg-slate-400'}`}
                      />
                    ))}
                  </div>
                );
              }}
            />
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {selectedDayAppts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No appointments on this day.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {selectedDayAppts.map((a) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
