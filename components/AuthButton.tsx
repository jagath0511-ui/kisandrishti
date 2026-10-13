'use client';

import React, { useState } from 'react';
import { User, LogIn, LogOut, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../lib/i18n';

export function AuthButton() {
  const { user, loading, error, signInWithGoogle, signOut, demoSignIn } = useAuth();
  const { locale } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleClick = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      setModalOpen(false);
    } catch {
      // Error is stored in context
    } finally {
      setSigningIn(false);
    }
  };

  const handleDemoClick = () => {
    demoSignIn();
    setModalOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setModalOpen(false);
  };

  return (
    <>
      {/* Header Button */}
      {user ? (
        <button
          onClick={() => setModalOpen(true)}
          className="min-h-[48px] px-2.5 py-1.5 bg-emerald-900 border border-emerald-600 rounded-lg flex items-center gap-1.5 text-white font-medium text-xs shadow-sm hover:bg-emerald-950 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label={`Logged in as ${user.displayName || 'Farmer'}`}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-6 h-6 rounded-full border border-white"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-400">
              {user.displayName?.charAt(0).toUpperCase() || 'F'}
            </div>
          )}
          <span className="hidden sm:inline font-bold truncate max-w-[80px]">
            {user.displayName?.split(' ')[0] || 'Farmer'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" aria-label="Online"></span>
        </button>
      ) : (
        <button
          onClick={() => setModalOpen(true)}
          className="min-h-[48px] px-2.5 py-1.5 bg-emerald-900 border border-emerald-700 hover:bg-emerald-950 rounded-lg flex items-center gap-1 text-white font-medium text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Sign in"
        >
          <User className="w-4 h-4 text-emerald-200" aria-hidden="true" />
          <span className="font-bold">
            {locale === 'te' ? 'లాగిన్' : locale === 'hi' ? 'लॉगिन' : 'Sign in'}
          </span>
        </button>
      )}

      {/* Auth Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-gray-900 shadow-2xl border-2 border-emerald-700 relative">
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {user ? (
              /* Signed In Profile Card */
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-12 h-12 rounded-full border-2 border-emerald-600 shadow"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-lg">
                      {user.displayName?.charAt(0).toUpperCase() || 'F'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h2 className="font-extrabold text-base text-gray-900 truncate">
                      {user.displayName || 'Farmer'}
                    </h2>
                    <p className="text-xs text-gray-600 truncate">{user.email || 'No email'}</p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    {locale === 'te'
                      ? 'క్లౌడ్ సింక్ యాక్టివ్‌గా ఉంది. మీ స్ప్రే డైరీ సేవ్ చేయబడింది.'
                      : locale === 'hi'
                      ? 'क्लाउड सिंक चालू है। आपका स्प्रे रिकॉर्ड सुरक्षित है।'
                      : 'Cloud sync active. Spray records sync to your account.'}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full min-h-[48px] py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-200 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{locale === 'te' ? 'లాగ్ అవుట్' : locale === 'hi' ? 'लॉग आउट' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              /* Sign In Options */
              <div className="space-y-4 pt-1">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    {locale === 'te' ? 'రైతు లాగిన్' : locale === 'hi' ? 'किसान लॉगिन' : 'Farmer Sign In'}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {locale === 'te'
                      ? 'మీ స్ప్రే డైరీని సేవ్ చేయడానికి గూగుల్ ద్వారా సైన్ ఇన్ అవ్వండి.'
                      : locale === 'hi'
                      ? 'अपनी स्प्रे डायरी को सुरक्षित रखने के लिए गूगल से लॉगिन करें।'
                      : 'Sign in to sync and protect your spray diary across devices.'}
                  </p>
                </div>

                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    {error}
                  </div>
                )}

                {/* Google Sign In Button */}
                <button
                  onClick={handleGoogleClick}
                  disabled={signingIn}
                  className="w-full min-h-[48px] py-3 px-4 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-xl flex items-center justify-center gap-3 font-bold text-sm text-gray-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {signingIn
                      ? 'Connecting...'
                      : locale === 'te'
                      ? 'గూగుల్‌తో సైన్ ఇన్ అవ్వండి'
                      : locale === 'hi'
                      ? 'गूगल से लॉगिन करें'
                      : 'Sign in with Google'}
                  </span>
                </button>

                {/* Instant Demo Sign-in for fast offline / local testing */}
                <button
                  onClick={handleDemoClick}
                  className="w-full min-h-[44px] py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>
                    {locale === 'te'
                      ? 'డెమో రైతుగా లాగిన్ (పరీక్ష కోసం)'
                      : locale === 'hi'
                      ? 'डेमो किसान के रूप में लॉगिन करें'
                      : 'Quick Demo Sign-In (For Testing)'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

