import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getApiErrorMessage } from '../../lib/api';
import type { Vehicle } from '../../types';

const schema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().max(32).optional(),
  licensePlate: z.string().max(20).optional(),
});

type Form = z.infer<typeof schema>;

export function Vehicles() {
  const [list, setList] = useState<Vehicle[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema) as Resolver<Form>,
    defaultValues: { year: new Date().getFullYear() },
  });

  const load = async () => {
    try {
      const { data } = await api.get<{ vehicles: Vehicle[] }>('/vehicles');
      setList(data.vehicles);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
      <p className="mt-1 text-slate-600">Vehicles linked to your account for service bookings.</p>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Add vehicle</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={handleSubmit(async (data) => {
              setErr(null);
              try {
                await api.post('/vehicles', data);
                reset({ make: '', model: '', year: new Date().getFullYear(), vin: '', licensePlate: '' });
                await load();
              } catch (e) {
                setErr(getApiErrorMessage(e));
              }
            })}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Make</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  {...register('make')}
                />
                {errors.make && (
                  <p className="text-xs text-red-600">{errors.make.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Model</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  {...register('model')}
                />
                {errors.model && (
                  <p className="text-xs text-red-600">{errors.model.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Year</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                {...register('year', { valueAsNumber: true })}
              />
              {errors.year && <p className="text-xs text-red-600">{errors.year.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">VIN (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                {...register('vin')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Plate (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                {...register('licensePlate')}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
            Your vehicles
          </div>
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No vehicles yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="text-xs text-slate-500">
                      {v.licensePlate || 'No plate'}
                      {v.vin ? ` · VIN ${v.vin}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-700 hover:underline"
                    onClick={async () => {
                      if (!confirm('Delete this vehicle?')) return;
                      setErr(null);
                      try {
                        await api.delete(`/vehicles/${v.id}`);
                        await load();
                      } catch (e) {
                        setErr(getApiErrorMessage(e));
                      }
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
