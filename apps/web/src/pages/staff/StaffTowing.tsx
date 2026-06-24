import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../lib/api';
import { TowMap } from '../../components/TowMap';
import type { TowJob, TowJobStatus, VehicleWithOwner } from '../../types';

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

type FormState = {
  vehicleSource: 'registered' | 'other';
  vehicleId: string;
  vehicleDesc: string;
  customerId: string;
  notes: string;
  status: TowJobStatus;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupLabel: string;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationLabel: string;
  currentLat: number | null;
  currentLng: number | null;
};

const emptyForm: FormState = {
  vehicleSource: 'registered',
  vehicleId: '',
  vehicleDesc: '',
  customerId: '',
  notes: '',
  status: 'PENDING',
  pickupLat: null,
  pickupLng: null,
  pickupLabel: '',
  destinationLat: null,
  destinationLng: null,
  destinationLabel: '',
  currentLat: null,
  currentLng: null,
};

function formFromJob(job: TowJob): FormState {
  return {
    vehicleSource: job.vehicleId ? 'registered' : 'other',
    vehicleId: job.vehicleId ?? '',
    vehicleDesc: job.vehicleDesc ?? '',
    customerId: job.customerId ?? '',
    notes: job.notes ?? '',
    status: job.status,
    pickupLat: job.pickupLat,
    pickupLng: job.pickupLng,
    pickupLabel: job.pickupLabel ?? '',
    destinationLat: job.destinationLat,
    destinationLng: job.destinationLng,
    destinationLabel: job.destinationLabel ?? '',
    currentLat: job.currentLat,
    currentLng: job.currentLng,
  };
}

function vehicleSummary(job: TowJob) {
  if (job.vehicle) {
    return `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}${job.vehicle.licensePlate ? ` (${job.vehicle.licensePlate})` : ''}`;
  }
  return job.vehicleDesc ?? '—';
}

export function StaffTowing() {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingJob, setEditingJob] = useState<TowJob | null>(null);
  const [jobs, setJobs] = useState<TowJob[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pinTarget, setPinTarget] = useState<'pickup' | 'destination' | 'current'>('pickup');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [jobsRes, vehiclesRes] = await Promise.all([
        api.get<{ towJobs: TowJob[] }>('/tow-jobs'),
        api.get<{ vehicles: VehicleWithOwner[] }>('/tow-jobs/vehicles'),
      ]);
      setJobs(jobsRes.data.towJobs);
      setVehicles(vehiclesRes.data.vehicles);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditingJob(null);
    setForm(emptyForm);
    setPinTarget('pickup');
    setFormErr(null);
    setMode('form');
  }

  function openEdit(job: TowJob) {
    setEditingJob(job);
    setForm(formFromJob(job));
    setPinTarget('pickup');
    setFormErr(null);
    setMode('form');
  }

  function cancel() {
    setMode('list');
    setEditingJob(null);
    setFormErr(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);

    if (form.vehicleSource === 'registered' && !form.vehicleId) {
      setFormErr('Please select a vehicle.');
      return;
    }
    if (form.vehicleSource === 'other' && !form.vehicleDesc.trim()) {
      setFormErr('Please describe the vehicle.');
      return;
    }
    if (form.pickupLat == null || form.pickupLng == null) {
      setFormErr('Please place the pickup pin on the map.');
      return;
    }
    if (form.destinationLat == null || form.destinationLng == null) {
      setFormErr('Please place the destination pin on the map.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleId: form.vehicleSource === 'registered' ? form.vehicleId : undefined,
        vehicleDesc: form.vehicleSource === 'other' ? form.vehicleDesc.trim() : undefined,
        customerId: form.customerId.trim() || undefined,
        notes: form.notes.trim() || undefined,
        pickupLat: form.pickupLat,
        pickupLng: form.pickupLng,
        pickupLabel: form.pickupLabel.trim() || undefined,
        destinationLat: form.destinationLat,
        destinationLng: form.destinationLng,
        destinationLabel: form.destinationLabel.trim() || undefined,
        ...(editingJob ? { status: form.status } : {}),
        ...(editingJob && form.currentLat != null && form.currentLng != null
          ? { currentLat: form.currentLat, currentLng: form.currentLng }
          : {}),
      };

      if (editingJob) {
        await api.patch(`/tow-jobs/${editingJob.id}`, payload);
      } else {
        await api.post('/tow-jobs', payload);
      }
      setMode('list');
      void load();
    } catch (e) {
      setFormErr(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(job: TowJob) {
    if (!window.confirm(`Delete tow job for ${vehicleSummary(job)}?`)) return;
    try {
      await api.delete(`/tow-jobs/${job.id}`);
      void load();
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  if (mode === 'form') {
    const isEdit = editingJob != null;
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Edit tow job' : 'New tow job'}
          </h1>
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Vehicle */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Vehicle</p>
            <div className="mb-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={form.vehicleSource === 'registered'}
                  onChange={() => setField('vehicleSource', 'registered')}
                />
                Registered vehicle
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={form.vehicleSource === 'other'}
                  onChange={() => setField('vehicleSource', 'other')}
                />
                Other (describe)
              </label>
            </div>

            {form.vehicleSource === 'registered' ? (
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.vehicleId}
                onChange={(e) => setField('vehicleId', e.target.value)}
              >
                <option value="">— Select vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model}
                    {v.licensePlate ? ` (${v.licensePlate})` : ''}
                    {' — '}{v.user.firstName} {v.user.lastName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. Red 2005 Honda Civic"
                value={form.vehicleDesc}
                onChange={(e) => setField('vehicleDesc', e.target.value)}
                maxLength={500}
              />
            )}
          </div>

          {/* Customer ID (optional) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Customer ID <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder="Customer's user ID"
              value={form.customerId}
              onChange={(e) => setField('customerId', e.target.value.trim())}
            />
            <p className="mt-1 text-xs text-slate-400">
              Leave blank for walk-ins. Customer will be able to track this job if set.
            </p>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Status</label>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as TowJobStatus)}
              >
                {(Object.keys(STATUS_LABELS) as TowJobStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Notes <span className="font-normal text-slate-400">(internal)</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              maxLength={5000}
              placeholder="Internal notes for staff…"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </div>

          {/* Map */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Locations</p>

            {/* Pin target switcher */}
            <div className="mb-3 flex flex-wrap gap-2">
              {(['pickup', 'destination', ...(isEdit ? ['current'] : [])] as ('pickup' | 'destination' | 'current')[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPinTarget(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    pinTarget === t
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'pickup' ? 'Place pickup (green)' : t === 'destination' ? 'Place destination (red)' : 'Update current location (orange)'}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs text-slate-400">Click the map to place the selected pin.</p>

            <TowMap
              mode="edit"
              pickupLat={form.pickupLat}
              pickupLng={form.pickupLng}
              destinationLat={form.destinationLat}
              destinationLng={form.destinationLng}
              currentLat={form.currentLat}
              currentLng={form.currentLng}
              pinTarget={pinTarget}
              onPickupSet={(lat, lng) => { setField('pickupLat', lat); setField('pickupLng', lng); }}
              onDestinationSet={(lat, lng) => { setField('destinationLat', lat); setField('destinationLng', lng); }}
              onCurrentSet={(lat, lng) => { setField('currentLat', lat); setField('currentLng', lng); }}
            />

            {/* Labels */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Pickup label</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  placeholder="e.g. Main St & 5th Ave"
                  value={form.pickupLabel}
                  onChange={(e) => setField('pickupLabel', e.target.value)}
                  maxLength={200}
                />
                {form.pickupLat != null && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {form.pickupLat.toFixed(5)}, {form.pickupLng!.toFixed(5)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Destination label</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  placeholder="e.g. AutoCheckpoint Shop"
                  value={form.destinationLabel}
                  onChange={(e) => setField('destinationLabel', e.target.value)}
                  maxLength={200}
                />
                {form.destinationLat != null && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {form.destinationLat.toFixed(5)}, {form.destinationLng!.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {isEdit && form.currentLat != null && (
              <p className="mt-2 text-xs text-slate-500">
                Current location set: {form.currentLat.toFixed(5)}, {form.currentLng!.toFixed(5)}
              </p>
            )}
          </div>

          {formErr && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formErr}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create tow job'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tow jobs</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          New tow job
        </button>
      </div>

      {err && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No tow jobs yet. Click "New tow job" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{vehicleSummary(job)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {job.customer
                      ? `${job.customer.firstName} ${job.customer.lastName}`
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {job.pickupLabel || `${job.pickupLat.toFixed(4)}, ${job.pickupLng.toFixed(4)}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {job.destinationLabel || `${job.destinationLat.toFixed(4)}, ${job.destinationLng.toFixed(4)}`}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(job)}
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      {(job.status === 'PENDING' || job.status === 'CANCELED') && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(job)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
