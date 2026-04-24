import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Camera, Save, ArrowLeft, Palette, MessageCircle, User, Mail, Shield, Edit2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/community/UserProfilePopup.jsx';

const BANNER_COLORS = [
  'from-violet-600 to-purple-800',
  'from-cyan-500 to-blue-700',
  'from-pink-500 to-rose-700',
  'from-orange-500 to-red-700',
  'from-green-500 to-teal-700',
  'from-yellow-500 to-orange-600',
  'from-indigo-500 to-violet-700',
  'from-fuchsia-500 to-pink-700',
];

const BANNER_GRADIENT_MAP = {
  'from-violet-600 to-purple-800': 'linear-gradient(to right, #7c3aed, #6b21a8)',
  'from-cyan-500 to-blue-700': 'linear-gradient(to right, #06b6d4, #1d4ed8)',
  'from-pink-500 to-rose-700': 'linear-gradient(to right, #ec4899, #be123c)',
  'from-orange-500 to-red-700': 'linear-gradient(to right, #f97316, #b91c1c)',
  'from-green-500 to-teal-700': 'linear-gradient(to right, #22c55e, #0f766e)',
  'from-yellow-500 to-orange-600': 'linear-gradient(to right, #eab308, #ea580c)',
  'from-indigo-500 to-violet-700': 'linear-gradient(to right, #6366f1, #7e22ce)',
  'from-fuchsia-500 to-pink-700': 'linear-gradient(to right, #d946ef, #be185d)',
};

export default function UserSettingsPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0]);
  const [dmEnabled, setDmEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Email change flow
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailStep, setEmailStep] = useState('input');
  const [emailCode, setEmailCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.full_name || user.email.split('@')[0]);
    base44.entities.UserProfile.filter({ user_email: user.email }, null, 1).then(r => {
      if (r[0]) {
        setProfile(r[0]);
        setBio(r[0].bio || '');
        setBannerColor(r[0].banner_color || BANNER_COLORS[0]);
        setDmEnabled(r[0].dm_enabled !== false);
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await Promise.all([
      base44.entities.UserProfile.update(profile.id, {
        bio, banner_color: bannerColor, dm_enabled: dmEnabled, user_name: displayName,
      }),
      base44.auth.updateMe({ full_name: displayName }),
    ]);
    setProfile(prev => ({ ...prev, bio, banner_color: bannerColor, dm_enabled: dmEnabled, user_name: displayName }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.UserProfile.update(profile.id, { avatar_url: file_url });
    setProfile(prev => ({ ...prev, avatar_url: file_url }));
    setUploadingAvatar(false);
    window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { email: user.email, avatarUrl: file_url } }));
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingBanner(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.UserProfile.update(profile.id, { banner_url: file_url });
    setProfile(prev => ({ ...prev, banner_url: file_url, banner_color: null }));
    setUploadingBanner(false);
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    setEmailError('');
    try {
      await base44.auth.resendOtp(newEmail.trim().toLowerCase());
      setEmailStep('verify');
    } catch (err) {
      setEmailError(err.message || 'Failed to send code.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    setEmailLoading(true);
    setEmailError('');
    try {
      await base44.auth.verifyOtp({ email: newEmail.trim().toLowerCase(), otpCode: emailCode.trim() });
      setEditingEmail(false);
      setEmailStep('input');
      setEmailCode('');
      setNewEmail('');
      window.location.reload();
    } catch (err) {
      setEmailError(err.message || 'Invalid code.');
    } finally {
      setEmailLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f0f18] flex items-center justify-center">
        <p className="text-gray-400">Please sign in to access settings.</p>
      </div>
    );
  }

  const bannerStyle = profile?.banner_url
    ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: BANNER_GRADIENT_MAP[bannerColor] || BANNER_GRADIENT_MAP[BANNER_COLORS[0]] };

  return (
    <div className="min-h-screen bg-[#0f0f18] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/community" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Community
        </Link>

        <h1 className="text-2xl font-black mb-6">User Settings</h1>

        {/* Profile Preview Card */}
        <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 overflow-hidden mb-6">
          <div className="relative h-32 group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
            <div className="w-full h-full" style={bannerStyle} />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2 text-sm text-white font-semibold">
              <Camera className="w-4 h-4" />
              {uploadingBanner ? 'Uploading...' : 'Change Banner'}
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10 mb-3">
              <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="ring-4 ring-[#1a1a2e] rounded-full">
                  <Avatar name={displayName} email={user.email} avatarUrl={profile?.avatar_url} size="xl" />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploadingAvatar
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Camera className="w-4 h-4 text-white" />}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="pb-1">
                <h2 className="font-bold text-white text-lg">{displayName}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Profile Info */}
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-violet-400">Profile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Display Name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Email</label>
                {!editingEmail ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300">{user.email}</div>
                    <button onClick={() => { setEditingEmail(true); setEmailStep('input'); setEmailError(''); }} className="px-3 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-semibold border border-violet-500/30 transition-colors flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> Change
                    </button>
                  </div>
                ) : emailStep === 'input' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                        <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailError(''); }} placeholder="New email address"
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50" autoFocus />
                      </div>
                      <button onClick={handleRequestEmailChange} disabled={emailLoading || !newEmail.trim()} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1">
                        {emailLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Shield className="w-3 h-3" /> Send Code</>}
                      </button>
                      <button onClick={() => { setEditingEmail(false); setEmailStep('input'); setEmailError(''); setNewEmail(''); }} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-violet-300 bg-violet-600/10 border border-violet-500/20 rounded-lg px-3 py-2">Code sent to <span className="font-semibold">{newEmail}</span></p>
                    <div className="flex items-center gap-2">
                      <input type="text" value={emailCode} onChange={e => { setEmailCode(e.target.value.replace(/\D/g, '')); setEmailError(''); }} placeholder="Enter code" maxLength={6}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 text-center tracking-widest font-mono" autoFocus />
                      <button onClick={handleVerifyEmailChange} disabled={emailLoading || emailCode.length < 4} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1">
                        {emailLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-3 h-3" /> Verify</>}
                      </button>
                      <button onClick={() => { setEmailStep('input'); setEmailCode(''); setEmailError(''); }} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={3} placeholder="Tell people about yourself..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none" />
                <p className="text-xs text-gray-600 mt-1">{bio.length}/200</p>
              </div>
            </div>
          </div>

          {/* Banner Color */}
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-violet-400">Banner Color</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">Click the banner above to upload a custom image instead.</p>
            <div className="grid grid-cols-4 gap-2">
              {BANNER_COLORS.map(c => (
                <button key={c} onClick={() => { setBannerColor(c); setProfile(prev => prev ? { ...prev, banner_url: null } : prev); }}
                  style={{ background: BANNER_GRADIENT_MAP[c] }}
                  className={`h-10 rounded-lg transition-all ${bannerColor === c && !profile?.banner_url ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e]' : 'opacity-60 hover:opacity-100'}`} />
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-violet-400">Privacy</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Allow Direct Messages</p>
                <p className="text-xs text-gray-500 mt-0.5">Let other users send you DMs</p>
              </div>
              <button onClick={() => setDmEnabled(v => !v)} className={`w-11 h-6 rounded-full transition-colors relative ${dmEnabled ? 'bg-violet-600' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dmEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
            <button onClick={() => logout()} className="px-6 py-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 font-semibold transition-all text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}