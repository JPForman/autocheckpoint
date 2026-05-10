import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl py-12 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
        Auto care scheduling
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        AutoCheckpoint
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
        Book service, manage your vehicles, and keep your appointments organized. Staff and admins
        get dedicated tools for the shop floor.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {user ? (
          <>
            {(user.role === 'CUSTOMER' || user.role === 'ADMIN') && (
              <Link
                to="/dashboard"
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Go to dashboard
              </Link>
            )}
            {(user.role === 'EMPLOYEE' || user.role === 'ADMIN') && (
              <Link
                to="/staff/appointments"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Staff tools
              </Link>
            )}
          </>
        ) : (
          <>
            <Link
              to="/register"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
