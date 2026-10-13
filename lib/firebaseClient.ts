/**
 * Zero-Install Firebase Client Loader
 * 
 * Uses the official Google Firebase CDN scripts loaded in the browser.
 * 0 MB installed on your laptop, 0 extra RAM during development and builds.
 */

export interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  };
}

/**
 * Ensures Firebase is initialized on the window object
 */
export function initFirebaseClient(): any {
  if (typeof window === 'undefined') return null;

  const fb = (window as any).firebase;
  if (!fb) return null;

  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    console.warn('Firebase config missing in environment variables.');
    return null;
  }

  if (!fb.apps || fb.apps.length === 0) {
    return fb.initializeApp(config);
  }

  return fb.app();
}

