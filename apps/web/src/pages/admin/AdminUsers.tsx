import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../lib/api';
import type { UserRole } from '../../types';

type Row = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
};

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setErr(null);
    try {
      const { data } = await api.get<{ users: Row[]; total: number; page: number }>(
        '/admin/users',
        { params: { page, pageSize: 20, search: search || undefined } },
      );
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
      <p className="mt-1 text-slate-600">Manage accounts and roles.</p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Search</label>
          <input
            className="mt-1 block w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email or name"
          />
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Search
        </button>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs font-mono text-slate-400">{u.id}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    value={u.role}
                    onChange={async (e) => {
                      const role = e.target.value as UserRole;
                      setErr(null);
                      try {
                        await api.patch(`/admin/users/${u.id}/role`, { role });
                        await load();
                      } catch (err) {
                        setErr(getApiErrorMessage(err));
                      }
                    }}
                  >
                    {(['CUSTOMER', 'EMPLOYEE', 'ADMIN'] as const).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No users.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} · {total} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page * 20 >= total}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
