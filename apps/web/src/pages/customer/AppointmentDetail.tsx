import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Appointment, AppointmentStatus } from '../../types';

const customerSchema = z.object({
  startsAt: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

const staffSchema = z.object({
  status: z.enum([
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELED',
    'NO_SHOW',
  ] as const),
  notes: z.string().max(5000).optional(),
});

type StaffForm = z.infer<typeof staffSchema>;

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isStaff = user?.role === 'EMPLOYEE' || user?.role === 'ADMIN';

  const custForm = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    values: appt ? { startsAt: toLocalInput(appt.startsAt) } : undefined,
  });

  const staffForm = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    values: appt
      ? { status: appt.status, notes: appt.notes ?? '' }
      : { status: 'SCHEDULED', notes: '' },
  });

  const load = async () => {
    if (!id) return;
    setErr(null);
    try {
      const { data } = await api.get<{ appointment: Appointment }>(`/appointments/${id}`);
      setAppt(data.appointment);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (err && !appt) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {err}
      </div>
    );
  }

  if (!appt) {
    return <p className="text-slate-600">Loading…</p>;
  }

  const canCustomerAct =
    (user?.role === 'CUSTOMER' || user?.role === 'ADMIN') &&
    appt.customerId === user?.id &&
    appt.status !== 'CANCELED';

  const showCustomerTools = (user?.role === 'CUSTOMER' || user?.role === 'ADMIN') && appt.customerId === user?.id;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/appointments" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
        ← Appointments
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{appt.serviceType}</h1>
      <p className="mt-1 text-slate-600">{formatDateTime(appt.startsAt)}</p>
      <p className="text-sm text-slate-500">Status: {appt.status}</p>

      {appt.vehicle && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Vehicle</h2>
          <p className="mt-1 text-slate-700">
            {appt.vehicle.year} {appt.vehicle.make} {appt.vehicle.model}
            {appt.vehicle.licensePlate ? ` · ${appt.vehicle.licensePlate}` : ''}
          </p>
        </div>
      )}

      {appt.customer && isStaff && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Customer</h2>
          <p className="mt-1 text-slate-700">
            {appt.customer.firstName} {appt.customer.lastName} ({appt.customer.email})
          </p>
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

      {showCustomerTools && (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">Reschedule</h2>
            <form
              className="mt-3 flex flex-wrap items-end gap-3"
              onSubmit={custForm.handleSubmit(async (data) => {
                setErr(null);
                setMsg(null);
                if (!data.startsAt) return;
                try {
                  const starts = new Date(data.startsAt);
                  await api.patch(`/appointments/${appt.id}`, {
                    startsAt: starts.toISOString(),
                  });
                  setMsg('Appointment updated.');
                  await load();
                } catch (e) {
                  setErr(getApiErrorMessage(e));
                }
              })}
            >
              <div>
                <label className="block text-xs font-medium text-slate-600">New start</label>
                <input
                  type="datetime-local"
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  {...custForm.register('startsAt')}
                />
              </div>
              <button
                type="submit"
                disabled={!canCustomerAct || custForm.formState.isSubmitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Save
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">Cancel</h2>
            <p className="mt-1 text-xs text-slate-500">
              Subject to the minimum notice window configured on the server.
            </p>
            <button
              type="button"
              disabled={!canCustomerAct}
              onClick={async () => {
                setErr(null);
                setMsg(null);
                try {
                  await api.patch(`/appointments/${appt.id}`, { status: 'CANCELED' });
                  setMsg('Appointment canceled.');
                  await load();
                } catch (e) {
                  setErr(getApiErrorMessage(e));
                }
              }}
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              Cancel appointment
            </button>
          </div>
        </div>
      )}

      {isStaff && (
        <form
          className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-4"
          onSubmit={staffForm.handleSubmit(async (data) => {
            setErr(null);
            setMsg(null);
            try {
              await api.patch(`/appointments/${appt.id}`, {
                status: data.status as AppointmentStatus,
                notes: data.notes?.trim() ? data.notes : null,
              });
              setMsg('Saved.');
              await load();
            } catch (e) {
              setErr(getApiErrorMessage(e));
            }
          })}
        >
          <h2 className="text-sm font-semibold text-slate-800">Shop update</h2>
          <div>
            <label className="block text-xs font-medium text-slate-600">Status</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              {...staffForm.register('status')}
            >
              {(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW'] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Internal notes</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              {...staffForm.register('notes')}
            />
          </div>
          <button
            type="submit"
            disabled={staffForm.formState.isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save
          </button>
        </form>
      )}
    </div>
  );
}
