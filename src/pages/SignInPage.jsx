import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mail, ArrowRight, Shield, ArrowLeft, Lock, Eye, EyeOff, User } from 'lucide-react';

// step: 'login' | 'signup' | 'verify'

export default function SignInPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [step, setStep] = useState('form');  // 'form' | 'verify'
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextUrl = new URLSearchParams(window.location.search).get('next') || '/';

  const reset = (newMode) => {
    setMode(newMode);
    setStep('form');
    setCode('');
    setError('');
    setPassword('');
    setDisplayName('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      window.location.href = nextUrl;
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await base44.auth.register({ email: email.trim().toLowerCase(), password, full_name: displayName.trim() });
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await base44.auth.verifyOtp({ email: email.trim().toLowerCase(), otpCode: code.trim() });
      window.location.href = nextUrl;
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await base44.auth.resendOtp(email.trim().toLowerCase());
    } catch (err) {
      setError('Failed to resend code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-violet-700/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-900/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-[#0f0f1a] border border-white/8 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <img
              src="https://media.base44.com/images/public/69eaec00027d7dc32aaa376a/43ed0279b_ChatGPTImageApr24202612_30_57AM.png"
              alt="AkiraPlus"
              className="w-16 h-16 object-contain mb-4"
            />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Akira<span className="text-violet-400">+</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 'verify' ? 'Verify your email' : mode === 'login' ? 'Welcome back' : 'Create your account'}
            </p>
          </div>

          <AnimatePresence mode="wait">

            {/* VERIFY STEP (signup only) */}
            {step === 'verify' ? (
              <motion.form
                key="verify"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleVerify}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 rounded-xl px-3 py-2.5">
                  <Shield className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <p className="text-xs text-violet-300">
                    Code sent to <span className="font-semibold">{email}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Verification code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-colors text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || code.length < 4}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-900/30"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Verify & Continue <ArrowRight className="w-4 h-4" /></>}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => { setStep('form'); setCode(''); setError(''); }} className="text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Go back
                  </button>
                  <button type="button" onClick={handleResend} className="text-violet-400 hover:text-violet-300 transition-colors">
                    Resend code
                  </button>
                </div>
              </motion.form>

            ) : mode === 'login' ? (
              /* LOGIN FORM */
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-900/30"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => reset('signup')} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                    Sign Up
                  </button>
                </p>
              </motion.form>

            ) : (
              /* SIGNUP FORM */
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSignup}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); setError(''); }}
                      placeholder="Your name"
                      required
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || password.length < 6 || !displayName.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-900/30"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <button type="button" onClick={() => reset('login')} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                    Sign In
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center mt-5">
          <a href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← Continue browsing as guest
          </a>
        </div>
      </motion.div>
    </div>
  );
}