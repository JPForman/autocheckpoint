import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, getApiErrorMessage } from '../../lib/api';
import { dayName, formatMinute } from '../../lib/format';
import type { AvailabilitySlot } from '../../types';

type Row = { dayOfWeek: number; startMinute: number; endMinute: number };

const emptyRow: Row = { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 };

export function StaffAvailability() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState<Row[]>([emptyRow]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [schedulingTimeZone, setSchedulingTimeZone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (isAdmin && !targetEmployeeId) {
      setRows([emptyRow]);
      setSchedulingTimeZone(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params =
        isAdmin && targetEmployeeId ? { employeeId: targetEmployeeId } : undefined;
      const { data } = await api.get<{
        slots: AvailabilitySlot[];
        schedulingTimeZone?: string;
      }>('/availability', {
        params,
      });
      setSchedulingTimeZone(data.schedulingTimeZone ?? null);
      if (data.slots.length) {
        setRows(
          data.slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
          })),
        );
      } else {
        setRows([emptyRow]);
      }
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, targetEmployeeId]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'EMPLOYEE') {
      void load();
    }
  }, [user, load]);

  useEffect(() => {
    if (isAdmin && targetEmployeeId) {
      void load();
    }
  }, [isAdmin, targetEmployeeId, load]);

  const setRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
      <p className="mt-1 text-slate-600">
        Weekly windows use the server scheduling timezone
        {schedulingTimeZone ? (
          <span className="font-mono text-slate-800"> ({schedulingTimeZone})</span>
        ) : null}
        . Day names and minutes are local to that zone (0–1440 from midnight).
      </p>

      {isAdmin && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm font-medium text-slate-700">Employee user ID</label>
          <input
            className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            placeholder="From Admin → Users"
            value={targetEmployeeId}
            onChange={(e) => setTargetEmployeeId(e.target.value.trim())}
          />
          <button
            type="button"
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void load()}
          >
            Load
          </button>
        </div>
      )}

      {msg && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}
      {err && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : (
        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          {isAdmin && !targetEmployeeId && (
            <p className="text-sm text-slate-500">Enter an employee ID to edit their schedule.</p>
          )}
          {(!isAdmin || targetEmployeeId) && (
            <>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4 last:border-0"
                >
                  <div>
                    <label className="text-xs font-medium text-slate-600">Day</label>
                    <select
                      className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={r.dayOfWeek}
                      onChange={(e) => setRow(i, { dayOfWeek: Number(e.target.value) })}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <option key={d} value={d}>
                          {dayName(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Start (min)</label>
                    <input
                      type="number"
                      className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={r.startMinute}
                      onChange={(e) => setRow(i, { startMinute: Number(e.target.value) })}
                    />
                    <p className="text-[10px] text-slate-400">{formatMinute(r.startMinute)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">End (min)</label>
                    <input
                      type="number"
                      className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={r.endMinute}
                      onChange={(e) => setRow(i, { endMinute: Number(e.target.value) })}
                    />
                    <p className="text-[10px] text-slate-400">{formatMinute(r.endMinute)}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:underline"
                    onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
                >
                  Add window
                </button>
                <button
                  type="button"
                  disabled={isAdmin && !targetEmployeeId}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  onClick={async () => {
                    setErr(null);
                    setMsg(null);
                    try {
                      await api.put('/availability', {
                        ...(isAdmin ? { employeeId: targetEmployeeId } : {}),
                        slots: rows,
                      });
                      setMsg('Saved.');
                    } catch (e) {
                      setErr(getApiErrorMessage(e));
                    }
                  }}
                >
                  Save availability
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
