import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Required'),
});

type Form = z.infer<typeof schema>;

function roleHome(role: string) {
  if (role === 'EMPLOYEE') return '/staff/appointments';
  if (role === 'ADMIN') return '/admin/analytics';
  return '/dashboard';
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-red-500">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function SpeedometerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12L8.5 7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M6 15.5a7 7 0 0 1 0-7" strokeLinecap="round" />
      <path d="M18 15.5a7 7 0 0 0 0-7" strokeLinecap="round" />
    </svg>
  );
}

export function Login() {
  const { user, login, error, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  if (user && !loading) {
    const dest = from && from !== '/login' ? from : roleHome(user.role);
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100vh-64px)] bg-zinc-950">
      {/* Left branding panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[55%] lg:flex-col lg:justify-between lg:p-14">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />

        {/* Diagonal racing stripes */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #dc2626 0px, #dc2626 2px, transparent 2px, transparent 32px)',
          }}
        />

        {/* Red left edge accent */}
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-700 via-red-500 to-red-700" />

        {/* Radial glow */}
        <div className="absolute bottom-0 left-1/3 h-96 w-96 -translate-x-1/2 translate-y-1/3 rounded-full bg-red-700/10 blur-3xl" />

        {/* Brand mark */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-900/40">
            <CarIcon />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-white">AutoCheckpoint</p>
            <p className="text-xs font-medium tracking-widest text-red-500 uppercase">Service Management</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-px w-8 bg-red-500" />
            <span className="text-xs font-semibold tracking-widest text-red-400 uppercase">
              Welcome back
            </span>
          </div>
          <h2 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white">
            Your vehicle,<br />
            <span className="text-red-500">our expertise.</span>
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-zinc-400">
            Schedule services, track repairs, and keep your car running at
            peak performance — all in one place.
          </p>
        </div>

        {/* Stats row */}
        <div className="relative flex gap-10">
          {[
            { value: '500+', label: 'Services completed' },
            { value: '4.9★', label: 'Customer rating' },
            { value: '24h', label: 'Quick turnaround' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-red-500">{stat.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-zinc-900 px-8 py-12 lg:px-16">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
              <CarIcon />
            </div>
            <p className="text-lg font-bold text-white">AutoCheckpoint</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <WrenchIcon />
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Sign in</h1>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-red-400 hover:text-red-300">
                Create one free
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-400">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form
            className="space-y-5"
            onSubmit={handleSubmit(async (data) => {
              const u = await login(data.email, data.password);
              const dest = from && from !== '/login' ? from : roleHome(u.role);
              nav(dest, { replace: true });
            })}
            noValidate
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-zinc-500 hover:text-red-400 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative mt-2 w-full overflow-hidden rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition group-hover:translate-x-0.5">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer badge */}
          <div className="mt-8 flex items-center gap-2 text-xs text-zinc-600">
            <SpeedometerIcon />
            <span>AutoCheckpoint — Precision auto service management</span>
          </div>
        </div>
      </div>
    </div>
  );
}
