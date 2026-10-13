'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FirebaseUser, initFirebaseClient } from '../lib/firebaseClient';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: (name?: string, email?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  demoSignIn: () => {},
});

const LOCAL_USER_KEY = 'kisandrishti_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check initial local cached user
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_USER_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Listen to Firebase Auth state once scripts load
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let attempts = 0;

    const setupAuthListener = () => {
      const fb = (window as any).firebase;
      if (fb && fb.auth) {
        initFirebaseClient();
        try {
          unsubscribe = fb.auth().onAuthStateChanged((fbUser: any) => {
            if (fbUser) {
              const u: FirebaseUser = {
                uid: fbUser.uid,
                displayName: fbUser.displayName || 'Farmer',
                email: fbUser.email,
                photoURL: fbUser.photoURL,
              };
              setUser(u);
              localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
            } else {
              // If Firebase reports null and not demo mode
              const cached = localStorage.getItem(LOCAL_USER_KEY);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (!parsed.uid?.startsWith('demo_')) {
                  setUser(null);
                  localStorage.removeItem(LOCAL_USER_KEY);
                }
              } else {
                setUser(null);
              }
            }
            setLoading(false);
          });
          return true;
        } catch {
          setLoading(false);
          return false;
        }
      }
      return false;
    };

    // Retry checking if CDN script loaded
    const interval = setInterval(() => {
      attempts++;
      if (setupAuthListener() || attempts > 15) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 400);

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);

    try {
      const fb = (window as any).firebase;
      if (!fb || !fb.auth) {
        throw new Error('Google Sign-In is initializing. Please check your internet connection or use Demo Sign-in.');
      }

      initFirebaseClient();
      const provider = new fb.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await fb.auth().signInWithPopup(provider);
      const fbUser = result.user;
      const u: FirebaseUser = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'Farmer',
        email: fbUser.email,
        photoURL: fbUser.photoURL,
      };

      setUser(u);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      // Friendly message for unauthorized domain or popup closed
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized in Firebase Console. Add your domain to Authorized Domains.');
      } else {
        setError(err.message || 'Could not complete Google Sign-in.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const fb = (window as any).firebase;
      if (fb && fb.auth && fb.apps && fb.apps.length > 0) {
        await fb.auth().signOut();
      }
    } catch {
      // Ignore
    } finally {
      setUser(null);
      localStorage.removeItem(LOCAL_USER_KEY);
      setLoading(false);
    }
  };

  const demoSignIn = (name = 'Jagath (Farmer)', email = 'jagath1105@gmail.com') => {
    const demoUser: FirebaseUser = {
      uid: `demo_${Date.now()}`,
      displayName: name,
      email,
      photoURL: null,
    };
    setUser(demoUser);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(demoUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signOut,
        demoSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

