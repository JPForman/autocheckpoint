import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600 hover:bg-slate-100'}`;

function CarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  );
}

function NavSection({
  title,
  items,
}: {
  title: string;
  items: { to: string; label: string }[];
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <nav className="flex flex-col gap-1">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} className={linkClass}>
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();

  const customerNav = [
    { to: '/appointments', label: 'Appointments' },
    { to: '/vehicles', label: 'Vehicles' },
    { to: '/towing', label: 'Towing' },
    { to: '/profile', label: 'Profile' },
  ];

  const staffNav = [
    { to: '/staff/appointments', label: 'Shop appointments' },
    { to: '/staff/availability', label: 'My availability' },
    { to: '/staff/towing', label: 'Tow jobs' },
  ];

  const adminNav = [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/analytics', label: 'Analytics' },
  ];

  const role = user?.role as UserRole | undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            {user && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <CarIcon className="h-5 w-5" />
              </span>
            )}
            AutoCheckpoint
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.firstName} {user.lastName}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {user.role}
                </span>
              </span>
            )}
            {user ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log out
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
        {user && (
          <>
            <div className="mb-6 flex flex-wrap gap-2 md:hidden">
              {(role === 'CUSTOMER' || role === 'ADMIN') &&
                customerNav.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {i.label}
                  </NavLink>
                ))}
              {(role === 'EMPLOYEE' || role === 'ADMIN') &&
                staffNav.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {i.label}
                  </NavLink>
                ))}
              {role === 'ADMIN' &&
                adminNav.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-900"
                  >
                    {i.label}
                  </NavLink>
                ))}
            </div>
            <aside className="hidden w-56 shrink-0 md:block">
              {(role === 'CUSTOMER' || role === 'ADMIN') && (
                <NavSection title="Customer" items={customerNav} />
              )}
              {(role === 'EMPLOYEE' || role === 'ADMIN') && (
                <NavSection title="Staff" items={staffNav} />
              )}
              {role === 'ADMIN' && <NavSection title="Admin" items={adminNav} />}
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
