import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../lib/api';
import { TowMap } from '../../components/TowMap';
import type { TowJob, TowJobStatus } from '../../types';

const STATUS_LABELS: Record<TowJobStatus, string> = {
  PENDING: 'Pending',
  EN_ROUTE: 'En route',
  VEHICLE_LOADED: 'Vehicle loaded',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  CANCELED: 'Canceled',
};

const STATUS_CLASSES: Record<TowJobStatus, string> = {
  PENDING: 'bg-indigo-100 text-indigo-800',
  EN_ROUTE: 'bg-indigo-50 text-indigo-600',
  VEHICLE_LOADED: 'bg-amber-100 text-amber-700',
  IN_TRANSIT: 'bg-amber-50 text-amber-600',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELED: 'bg-slate-100 text-slate-500',
};

const ACTIVE_STATUSES: TowJobStatus[] = ['PENDING', 'EN_ROUTE', 'VEHICLE_LOADED', 'IN_TRANSIT'];

function sortJobs(jobs: TowJob[]): TowJob[] {
  return [...jobs].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status) ? 0 : a.status === 'DELIVERED' ? 1 : 2;
    const bActive = ACTIVE_STATUSES.includes(b.status) ? 0 : b.status === 'DELIVERED' ? 1 : 2;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function vehicleSummary(job: TowJob) {
  if (job.vehicle) {
    return `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}${job.vehicle.licensePlate ? ` (${job.vehicle.licensePlate})` : ''}`;
  }
  return job.vehicleDesc ?? 'Vehicle';
}

export function CustomerTowing() {
  const [jobs, setJobs] = useState<TowJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const { data } = await api.get<{ towJobs: TowJob[] }>('/tow-jobs');
      setJobs(sortJobs(data.towJobs));
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Towing</h1>
      <p className="mt-1 text-slate-600">Track the status and location of your vehicle during towing.</p>

      {err && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No tow jobs linked to your account.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
              {/* Header */}
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-900">{vehicleSummary(job)}</p>
                  <p className="text-xs text-slate-500">
                    Created {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[job.status]}`}>
                  {STATUS_LABELS[job.status]}
                </span>
              </div>

              {/* Pickup / destination */}
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pickup</p>
                  <p className="text-slate-700">
                    {job.pickupLabel || `${job.pickupLat.toFixed(5)}, ${job.pickupLng.toFixed(5)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Destination</p>
                  <p className="text-slate-700">
                    {job.destinationLabel || `${job.destinationLat.toFixed(5)}, ${job.destinationLng.toFixed(5)}`}
                  </p>
                </div>
              </div>

              {/* Map */}
              <div className="h-64 overflow-hidden rounded-lg">
                <TowMap
                  mode="view"
                  pickupLat={job.pickupLat}
                  pickupLng={job.pickupLng}
                  pickupLabel={job.pickupLabel}
                  destinationLat={job.destinationLat}
                  destinationLng={job.destinationLng}
                  destinationLabel={job.destinationLabel}
                  currentLat={job.currentLat}
                  currentLng={job.currentLng}
                  currentUpdatedAt={job.currentUpdatedAt}
                />
              </div>

              {/* Location status */}
              <p className="mt-2 text-xs text-slate-500">
                {job.currentLat != null
                  ? `Location last updated: ${job.currentUpdatedAt ? new Date(job.currentUpdatedAt).toLocaleString() : '—'}`
                  : 'Location tracking not yet started.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
