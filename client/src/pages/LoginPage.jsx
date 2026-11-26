import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Coins,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, loading, isFirebaseConfigured, missingFirebaseEnvVars, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to log in right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-[#060913] px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="fintech-grid absolute inset-0 opacity-50" />
        <div className="absolute -top-32 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-indigo-500/12 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to MoneyVerse
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 shadow-lg shadow-emerald-500/20">
              <Coins className="h-5 w-5 text-slate-950" strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-white">Welcome back</h1>
              <p className="text-xs text-slate-400">Sign in to your MoneyVerse dashboard</p>
            </div>
          </div>

          {!isFirebaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <p className="font-semibold text-amber-100">Firebase configuration required</p>
                  <p className="mt-1 leading-relaxed text-amber-200/90">
                    Add {missingFirebaseEnvVars.join(', ')} to{' '}
                    <code className="rounded bg-black/30 px-1 py-0.5 font-mono">client/.env</code>{' '}
                    and restart the Vite dev server to enable login.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#070c18] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/12 bg-[#070c18] px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isFirebaseConfigured}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            New to MoneyVerse?{' '}
            <Link to="/signup" className="font-semibold text-emerald-300 hover:text-emerald-200">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
