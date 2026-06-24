import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { api, getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Appointment, AppointmentStatus } from '../../types';

const VIEW_STORAGE_KEY = 'staffAppointmentsView';
type ViewMode = 'table' | 'kanban' | 'calendar';

const STATUS_ORDER: AppointmentStatus[] = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
  'NO_SHOW',
];

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
  NO_SHOW: 'No show',
};

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-indigo-500',
  IN_PROGRESS: 'bg-indigo-400',
  COMPLETED: 'bg-emerald-500',
  CANCELED: 'bg-slate-400',
  NO_SHOW: 'bg-slate-400',
};

function readStoredView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === 'kanban' || v === 'table' || v === 'calendar') return v;
  } catch {
    /* ignore */
  }
  return 'table';
}

function persistView(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isStatus(id: string): id is AppointmentStatus {
  return STATUS_ORDER.includes(id as AppointmentStatus);
}

function resolveDropTarget(overId: UniqueIdentifier, items: Appointment[]): AppointmentStatus | null {
  const s = String(overId);
  if (isStatus(s)) return s;
  const appt = items.find((a) => a.id === s);
  return appt?.status ?? null;
}

function customerLabel(a: Appointment) {
  return a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : a.customerId;
}

function assigneeLabel(a: Appointment) {
  return a.assignedEmployee
    ? `${a.assignedEmployee.firstName} ${a.assignedEmployee.lastName}`
    : '—';
}

function KanbanColumn({
  status,
  count,
  children,
}: {
  status: AppointmentStatus;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-slate-50/80 ${
        isOver ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200'
      }`}
    >
      <div className="border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-800">{STATUS_LABEL[status]}</h2>
        <p className="text-xs text-slate-500">{count} appointment{count !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex min-h-32 flex-col gap-2 p-2">{children}</div>
    </div>
  );
}

function KanbanCard({ appt }: { appt: Appointment }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-0.5 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
          aria-label="Drag to change status"
          {...listeners}
          {...attributes}
        >
          <span className="select-none text-xs leading-none" aria-hidden>
            ⋮⋮
          </span>
        </button>
        <div className="min-w-0 flex-1 text-sm">
          <p className="whitespace-nowrap font-medium text-slate-800">{formatDateTime(appt.startsAt)}</p>
          <p className="mt-0.5 truncate text-slate-700">{appt.serviceType}</p>
          <p className="mt-1 truncate text-xs text-slate-600">{customerLabel(appt)}</p>
          <p className="truncate text-xs text-slate-500">{assigneeLabel(appt)}</p>
          <div className="mt-2">
            <Link
              to={`/appointments/${appt.id}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Open
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanCardPreview({ appt }: { appt: Appointment }) {
  return (
    <div className="w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg ring-2 ring-indigo-200">
      <p className="text-sm font-medium text-slate-800">{formatDateTime(appt.startsAt)}</p>
      <p className="mt-0.5 truncate text-sm text-slate-700">{appt.serviceType}</p>
      <p className="mt-1 truncate text-xs text-slate-600">{customerLabel(appt)}</p>
      <p className="truncate text-xs text-slate-500">{assigneeLabel(appt)}</p>
    </div>
  );
}

export function StaffAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [patchErr, setPatchErr] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredView);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const byStatus = useMemo(() => {
    const map = new Map<AppointmentStatus, Appointment[]>();
    for (const s of STATUS_ORDER) map.set(s, []);
    for (const a of items) {
      const list = map.get(a.status);
      if (list) list.push(a);
    }
    for (const s of STATUS_ORDER) {
      const list = map.get(s) ?? [];
      list.sort((x, y) => x.startsAt.localeCompare(y.startsAt));
      map.set(s, list);
    }
    return map;
  }, [items]);

  const activeAppt = activeId ? items.find((a) => a.id === activeId) : undefined;
  const selectedDayAppts = items.filter((a) => isSameDay(new Date(a.startsAt), selectedDate));

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

  function setView(next: ViewMode) {
    persistView(next);
    setViewMode(next);
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setPatchErr(null);
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const appt = items.find((a) => a.id === active.id);
    if (!appt) return;

    const nextStatus = resolveDropTarget(over.id, items);
    if (!nextStatus || nextStatus === appt.status) return;

    try {
      const { data } = await api.patch<{ appointment: Appointment }>(`/appointments/${appt.id}`, {
        status: nextStatus,
      });
      setItems((prev) => prev.map((x) => (x.id === appt.id ? data.appointment : x)));
      setPatchErr(null);
    } catch (e) {
      setPatchErr(getApiErrorMessage(e));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Shop appointments</h1>
      <p className="mt-1 text-slate-600">All customer appointments.</p>

      <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => setView('table')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            viewMode === 'table'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Table
        </button>
        <button
          type="button"
          onClick={() => setView('kanban')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            viewMode === 'kanban'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Board
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

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {patchErr && viewMode === 'kanban' && (
        <p className="mt-4 text-sm text-red-600">{patchErr}</p>
      )}

      {viewMode === 'table' && (
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
                  <td className="px-4 py-3 text-slate-600">{customerLabel(a)}</td>
                  <td className="px-4 py-3 text-slate-600">{assigneeLabel(a)}</td>
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
      )}

      {viewMode === 'kanban' && (
        <div className="mt-6">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {STATUS_ORDER.map((status) => {
                const columnItems = byStatus.get(status) ?? [];
                return (
                  <KanbanColumn key={status} status={status} count={columnItems.length}>
                    {columnItems.map((a) => (
                      <KanbanCard key={a.id} appt={a} />
                    ))}
                  </KanbanColumn>
                );
              })}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeAppt ? <KanbanCardPreview appt={activeAppt} /> : null}
            </DragOverlay>
          </DndContext>
          {items.length === 0 && (
            <p className="mt-4 text-center text-sm text-slate-500">No appointments.</p>
          )}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="mt-6">
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
                    {selectedDayAppts.map((a) => (
                      <tr key={a.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatDateTime(a.startsAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{a.serviceType}</td>
                        <td className="px-4 py-3 text-slate-600">{customerLabel(a)}</td>
                        <td className="px-4 py-3 text-slate-600">{assigneeLabel(a)}</td>
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
