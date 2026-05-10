import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../lib/api';
import type { Vehicle } from '../../types';

const schema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  startsAt: z.string().min(1, 'Pick date and time'),
  serviceType: z.string().min(1, 'Required'),
  customerNotes: z.string().max(2000).optional(),
});

type Form = z.infer<typeof schema>;

export function NewAppointment() {
  const nav = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ vehicles: Vehicle[] }>('/vehicles');
        setVehicles(data.vehicles);
      } catch (e) {
        setLoadErr(getApiErrorMessage(e));
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Schedule appointment</h1>
      <p className="mt-1 text-sm text-slate-600">
        Times are sent to the server in your local timezone. Availability checks for assigned staff
        use UTC on the server—see README for details.
      </p>

      {loadErr && <p className="mt-4 text-sm text-red-600">{loadErr}</p>}

      {vehicles.length === 0 && !loadErr ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add a vehicle first in{' '}
          <Link to="/vehicles" className="font-medium underline">
            Vehicles
          </Link>
          .
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(async (data) => {
            setSubmitErr(null);
            try {
              const starts = new Date(data.startsAt);
              const { data: res } = await api.post('/appointments', {
                vehicleId: data.vehicleId,
                startsAt: starts.toISOString(),
                serviceType: data.serviceType,
                customerNotes: data.customerNotes || undefined,
              });
              nav(`/appointments/${(res as { appointment: { id: string } }).appointment.id}`);
            } catch (e) {
              setSubmitErr(getApiErrorMessage(e));
            }
          })}
        >
          {submitErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {submitErr}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Vehicle</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              {...register('vehicleId')}
            >
              <option value="">Select…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model}
                </option>
              ))}
            </select>
            {errors.vehicleId && (
              <p className="mt-1 text-sm text-red-600">{errors.vehicleId.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Start</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              {...register('startsAt')}
            />
            {errors.startsAt && (
              <p className="mt-1 text-sm text-red-600">{errors.startsAt.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Service</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Oil change"
              {...register('serviceType')}
            />
            {errors.serviceType && (
              <p className="mt-1 text-sm text-red-600">{errors.serviceType.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              {...register('customerNotes')}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || vehicles.length === 0}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Booking…' : 'Book'}
          </button>
        </form>
      )}
    </div>
  );
}
