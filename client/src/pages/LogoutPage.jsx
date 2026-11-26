import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Coins, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LogoutPage() {
  const { logout } = useAuth();
  const [status, setStatus] = useState('signing-out');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    logout()
      .then(() => {
        if (active) setStatus('signed-out');
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Could not complete sign out.');
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [logout]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#060913] px-4 py-12 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="fintech-grid absolute inset-0 opacity-50" />
      </div>

      <div className="glass-panel relative z-10 w-full max-w-md rounded-3xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-300">
          {status === 'signing-out' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <CheckCircle2 className="h-6 w-6" />
          )}
        </div>

        <h1 className="mt-5 font-display text-2xl font-bold text-white">
          {status === 'signing-out'
            ? 'Signing you out...'
            : status === 'error'
              ? 'Sign out issue'
              : 'You have been signed out'}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          {status === 'signing-out'
            ? 'Closing your Firebase session securely.'
            : status === 'error'
              ? error
              : 'Your MoneyVerse progress is safely saved in Firestore.'}
        </p>

        {status !== 'signing-out' && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              <LogIn className="h-4 w-4" />
              Log In Again
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <Coins className="h-4 w-4 text-emerald-400" />
              Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
