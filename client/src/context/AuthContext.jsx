import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured, missingFirebaseEnvVars } from '../lib/firebase';
import { initProfile } from '../lib/api';

const AuthContext = createContext(null);

function formatAuthError(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase Authentication. Check your internet connection.';
    default:
      return error?.response?.data?.error || error?.message || 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signup({ displayName, email, password }) {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        `Firebase is not configured. Add ${missingFirebaseEnvVars.join(', ')} to client/.env.`,
      );
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const trimmedName = displayName?.trim() || '';

      if (trimmedName) {
        await updateProfile(credential.user, { displayName: trimmedName });
      }

      // Ensure the latest ID token is ready before initializing the Firestore profile
      await credential.user.getIdToken(true);
      const profileResponse = await initProfile({ displayName: trimmedName });

      setUser(auth.currentUser || credential.user);
      return {
        user: auth.currentUser || credential.user,
        profile: profileResponse?.profile || null,
      };
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function login({ email, password }) {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        `Firebase is not configured. Add ${missingFirebaseEnvVars.join(', ')} to client/.env.`,
      );
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return credential.user;
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function logout() {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      return;
    }

    await signOut(auth);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isFirebaseConfigured,
      missingFirebaseEnvVars,
      signup,
      login,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
