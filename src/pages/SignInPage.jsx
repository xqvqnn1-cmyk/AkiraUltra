import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    const next = new URLSearchParams(window.location.search).get('next') || '/community';
    // redirectToLogin navigates in the same tab to the platform login, then redirects back
    base44.auth.redirectToLogin(next);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-900/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
      >
        {/* Card */}
        <div className="bg-[#0f0f1a] border border-white/8 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="https://media.base44.com/images/public/69eaec00027d7dc32aaa376a/43ed0279b_ChatGPTImageApr24202612_30_57AM.png"
              alt="AkiraPlus"
              className="w-20 h-20 object-contain mb-4"
            />
            <h1 className="text-2xl font-black text-white tracking-tight">Welcome to <span className="text-violet-400">AkiraPlus</span></h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
          </div>

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 text-sm shadow-lg shadow-violet-900/40"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign In / Create Account
              </>
            )}
          </button>

          <p className="text-center text-gray-600 text-xs mt-6 leading-relaxed">
            By signing in you agree to our{' '}
            <span className="text-violet-400 cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-violet-400 cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <a href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← Continue browsing as guest
          </a>
        </div>
      </motion.div>
    </div>
  );
}