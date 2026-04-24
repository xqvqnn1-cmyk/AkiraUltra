import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  X, User, Palette, MessageCircle, Camera, ImagePlus, Mail, Check, Loader2, Edit2
} from 'lucide-react';
import { Avatar } from './UserProfilePopup.jsx';
import AvatarEditModal from './AvatarEditModal.jsx';

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

const TABS = [
  { id: 'profile', label: 'My Account', icon: User },
  { id: 'edit', label: 'Edit Profile', icon: Edit2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'email', label: 'Email & Security', icon: Mail },
  { id: 'privacy', label: 'Privacy & Blocking', icon: MessageCircle },
];

export default function UserSettingsModal({ onClose }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0]);
  const [dmEnabled, setDmEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const usernameCheckTimeoutRef = useRef(null);

  const bannerInputRef = useRef(null);
  const appearanceBannerInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.full_name || user.email.split('@')[0]);
    Promise.all([
      base44.entities.UserProfile.filter({ user_email: user.email }, null, 1),
      base44.entities.BlockedUser.filter({ user_email: user.email }),
    ]).then(([profiles, blocked]) => {
      if (profiles[0]) {
        setProfile(profiles[0]);
        setBio(profiles[0].bio || '');
        setUsername(profiles[0].user_name || '');
        setBannerColor(profiles[0].banner_color || BANNER_COLORS[0]);
        setDmEnabled(profiles[0].dm_enabled !== false);
      }
      setBlockedUsers(blocked);
    });

    const handleBlockChange = () => {
      base44.entities.BlockedUser.filter({ user_email: user.email }).then(setBlockedUsers);
    };
    window.addEventListener('blockStatusChanged', handleBlockChange);
    return () => window.removeEventListener('blockStatusChanged', handleBlockChange);
  }, [user]);

  const checkUsernameAvailability = async (value) => {
    if (!value || value === profile?.user_name) {
      setUsernameError('');
      return;
    }
    setCheckingUsername(true);
    try {
      const existing = await base44.entities.UserProfile.filter({ user_name: value }, null, 1);
      if (existing.length > 0) {
        setUsernameError('Username is already taken');
      } else {
        setUsernameError('');
      }
    } catch (err) {
      setUsernameError('');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value) => {
    setUsername(value);
    clearTimeout(usernameCheckTimeoutRef.current);
    usernameCheckTimeoutRef.current = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 800);
  };

  const handleSave = async () => {
    if (!profile) return;
    setDisplayNameError('');
    setUsernameError('');
    if (usernameError) {
      setUsernameError('Username is not available');
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        base44.entities.UserProfile.update(profile.id, {
          bio, banner_color: bannerColor, dm_enabled: dmEnabled, user_name: username || displayName,
        }),
        base44.auth.updateMe({ full_name: displayName }),
      ]);
      setProfile(prev => ({ ...prev, bio, banner_color: bannerColor, dm_enabled: dmEnabled, user_name: username || displayName }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setDisplayNameError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!newEmail || newEmail === user.email) {
      setDisplayNameError('Please enter a different email');
      return;
    }
    setSendingCode(true);
    try {
      await base44.auth.changeEmailRequestVerification(newEmail);
      setShowEmailVerification(true);
    } catch (err) {
      setDisplayNameError('Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailVerificationCode) return;
    setVerifyingEmail(true);
    try {
      await base44.auth.changeEmailVerify(newEmail, emailVerificationCode);
      setDisplayNameError('');
      setNewEmail('');
      setEmailVerificationCode('');
      setShowEmailVerification(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setDisplayNameError('Invalid verification code');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleAvatarApply = async (file) => {
    if (!profile) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.UserProfile.update(profile.id, { avatar_url: file_url });
    setProfile(prev => ({ ...prev, avatar_url: file_url }));
    window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { email: user.email, avatarUrl: file_url } }));
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingBanner(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.UserProfile.update(profile.id, { banner_url: file_url, banner_color: null });
    setProfile(prev => ({ ...prev, banner_url: file_url, banner_color: null }));
    setUploadingBanner(false);
  };

  const bannerStyle = profile?.banner_url
    ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: BANNER_GRADIENT_MAP[bannerColor] || BANNER_GRADIENT_MAP[BANNER_COLORS[0]] };

  if (!user) return null;

  const dn = profile?.user_name || user.full_name || user.email.split('@')[0];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-3xl h-[600px] bg-[#0f1115] rounded-2xl shadow-2xl border border-white/8 flex overflow-hidden pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Left sidebar tabs */}
          <div className="w-52 flex-shrink-0 bg-[#111318] border-r border-white/5 flex flex-col py-4">
            {/* Mini profile */}
            <div className="px-3 mb-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <Avatar name={dn} email={user.email} avatarUrl={profile?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{dn}</p>
                  <p className="text-[10px] text-gray-500 truncate">Edit Profiles ✏️</p>
                </div>
              </div>
            </div>

            <div className="px-3 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-2 mb-1">User Settings</p>
            </div>

            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-5 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}

            <div className="mt-2 px-3">
              <div className="h-px bg-white/5" />
            </div>

            <button
              onClick={() => { logout(); onClose(); }}
              className="flex items-center gap-2.5 px-5 py-2 mt-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              Sign Out
            </button>

            <div className="flex-1" />
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Content header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
              <h2 className="text-white font-bold text-lg">
                {TABS.find(t => t.id === activeTab)?.label || 'Settings'}
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-hide">
              {/* ── EDIT PROFILE TAB ── */}
              {activeTab === 'edit' && (
                <>
                  {/* Display Name */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Display Name</label>
                    <input
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); setDisplayNameError(''); }}
                      className={`w-full bg-[#1a1d23] border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${displayNameError ? 'border-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-violet-500/50'}`}
                    />
                    {displayNameError && <p className="text-xs text-red-400 mt-1">{displayNameError}</p>}
                  </div>

                  {/* Username */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Username</label>
                    <div className="relative">
                      <input
                        value={username}
                        onChange={e => handleUsernameChange(e.target.value)}
                        placeholder="e.g., gioXyz"
                        className={`w-full bg-[#1a1d23] border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${usernameError ? 'border-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-violet-500/50'}`}
                      />
                      {checkingUsername && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                    </div>
                    {usernameError && <p className="text-xs text-red-400 mt-1">{usernameError}</p>}
                    {!usernameError && username && <p className="text-xs text-green-400 mt-1">✓ Available</p>}
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">About Me</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Tell people about yourself..."
                      className="w-full bg-[#1a1d23] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
                    />
                    <p className="text-xs text-gray-600 mt-1">{bio.length}/200</p>
                  </div>
                </>
              )}

              {/* ── PROFILE TAB ── */}
              {activeTab === 'profile' && (
                <>
                  {/* Banner + Avatar */}
                  <div className="rounded-xl overflow-hidden border border-white/8">
                    <div
                      className="h-28 relative group cursor-pointer"
                      style={bannerStyle}
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <p className="text-white text-sm font-semibold flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          {uploadingBanner ? 'Uploading...' : 'Change Banner'}
                        </p>
                      </div>
                      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                    </div>
                    <div className="bg-[#1a1d23] px-5 pb-4 pt-0">
                      <div className="flex items-end gap-4 -mt-8 mb-3">
                        <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setShowAvatarModal(true)}>
                          <div className="ring-4 ring-white/10 rounded-full inline-block">
                            <Avatar name={dn} email={user.email} avatarUrl={profile?.avatar_url} size="xl" />
                          </div>
                          <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="pb-1">
                          <p className="font-bold text-white">{dn}</p>
                          <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Avatar buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => setShowAvatarModal(true)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors">
                      Change Avatar
                    </button>
                    {profile?.avatar_url && (
                      <button
                        onClick={async () => {
                          if (!profile) return;
                          await base44.entities.UserProfile.update(profile.id, { avatar_url: null });
                          setProfile(prev => ({ ...prev, avatar_url: null }));
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg transition-colors border border-white/10"
                      >
                        Remove Avatar
                      </button>
                    )}
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Display Name</label>
                    <input
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); setDisplayNameError(''); }}
                      className={`w-full bg-[#1a1d23] border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${displayNameError ? 'border-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-violet-500/50'}`}
                    />
                    {displayNameError && <p className="text-xs text-red-400 mt-1">{displayNameError}</p>}
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">About Me</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Tell people about yourself..."
                      className="w-full bg-[#1a1d23] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
                    />
                    <p className="text-xs text-gray-600 mt-1">{bio.length}/200</p>
                  </div>
                </>
              )}

              {/* ── APPEARANCE TAB ── */}
              {activeTab === 'appearance' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Banner Color</label>
                    <div className="grid grid-cols-4 gap-2">
                      {BANNER_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => { setBannerColor(c); setProfile(prev => prev ? { ...prev, banner_url: null } : prev); }}
                          style={{ background: BANNER_GRADIENT_MAP[c] }}
                          className={`h-12 rounded-xl transition-all ${bannerColor === c && !profile?.banner_url ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1115]' : 'opacity-60 hover:opacity-100'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#1a1d23] rounded-xl p-4 flex items-center gap-3">
                    <ImagePlus className="w-5 h-5 text-violet-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-white font-semibold">Upload Banner Picture</p>
                      <p className="text-xs text-gray-500">
                        {uploadingBanner ? 'Uploading...' : profile?.banner_url ? 'Banner set — click to change' : 'Set a custom profile banner image'}
                      </p>
                    </div>
                    <button
                      onClick={() => appearanceBannerInputRef.current?.click()}
                      disabled={uploadingBanner}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2a2d35] hover:bg-white/10 border border-white/10 transition-all flex-shrink-0 disabled:opacity-50"
                    >
                      {uploadingBanner ? '...' : 'Upload'}
                    </button>
                    <input ref={appearanceBannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  </div>
                </>
              )}

              {/* ── EMAIL TAB ── */}
              {activeTab === 'email' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Current Email</label>
                    <div className="bg-[#1a1d23] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-400">
                      {user.email}
                    </div>
                  </div>

                  {!showEmailVerification ? (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">New Email</label>
                      <input
                        value={newEmail}
                        onChange={e => { setNewEmail(e.target.value); setDisplayNameError(''); }}
                        type="email"
                        placeholder="Enter new email address"
                        className="w-full bg-[#1a1d23] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                      {displayNameError && <p className="text-xs text-red-400 mt-1">{displayNameError}</p>}
                      <button
                        onClick={handleSendEmailCode}
                        disabled={sendingCode || !newEmail}
                        className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                      >
                        {sendingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Send Verification Code
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Verification Code</label>
                      <p className="text-xs text-gray-400 mb-2">We sent a verification code to {newEmail}</p>
                      <input
                        value={emailVerificationCode}
                        onChange={e => { setEmailVerificationCode(e.target.value); setDisplayNameError(''); }}
                        placeholder="Enter 6-digit code"
                        className={`w-full bg-[#1a1d23] border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${displayNameError ? 'border-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-violet-500/50'}`}
                      />
                      {displayNameError && <p className="text-xs text-red-400 mt-1">{displayNameError}</p>}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => { setShowEmailVerification(false); setEmailVerificationCode(''); setDisplayNameError(''); }}
                          className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg transition-colors border border-white/10"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleVerifyEmail}
                          disabled={verifyingEmail || !emailVerificationCode}
                          className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {verifyingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── PRIVACY TAB ── */}
              {activeTab === 'privacy' && (
                <>
                  <div className="bg-[#1a1d23] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Allow Direct Messages</p>
                      <p className="text-xs text-gray-500 mt-0.5">Let other users send you DMs</p>
                    </div>
                    <button
                      onClick={() => setDmEnabled(v => !v)}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${dmEnabled ? 'bg-violet-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dmEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Blocked Users</h3>
                    {blockedUsers.length === 0 ? (
                      <p className="text-xs text-gray-600 italic">You haven't blocked anyone yet</p>
                    ) : (
                      <div className="space-y-2">
                        {blockedUsers.map(b => (
                          <div key={b.id} className="flex items-center justify-between bg-[#1a1d23] rounded-lg px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate font-medium">{b.blocked_name || b.blocked_email}</p>
                              <p className="text-xs text-gray-600 capitalize">{b.reason}</p>
                            </div>
                            <button
                              onClick={async () => {
                                await base44.entities.BlockedUser.delete(b.id);
                                setBlockedUsers(prev => prev.filter(x => x.id !== b.id));
                              }}
                              className="ml-2 px-3 py-1 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs font-semibold rounded transition-colors flex-shrink-0"
                            >
                              Unblock
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              </div>

            {/* Footer save */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center gap-2"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Avatar Edit Modal on top */}
      <AnimatePresence>
        {showAvatarModal && (
          <AvatarEditModal
            currentAvatarUrl={profile?.avatar_url}
            displayName={dn}
            userEmail={user.email}
            onApply={handleAvatarApply}
            onClose={() => setShowAvatarModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}