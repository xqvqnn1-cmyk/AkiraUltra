import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  X, User, Palette, MessageCircle, Camera, ImagePlus
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
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: MessageCircle },
];

export default function UserSettingsModal({ onClose }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0]);
  const [dmEnabled, setDmEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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
                          <div className="ring-4 ring-[#1a1d23] rounded-full">
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
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full bg-[#1a1d23] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
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
                      <p className="text-xs text-gray-500">Set a custom profile banner image</p>
                    </div>
                    <button
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2a2d35] hover:bg-white/10 border border-white/10 transition-all flex-shrink-0"
                    >
                      Upload
                    </button>
                  </div>
                </>
              )}

              {/* ── PRIVACY TAB ── */}
              {activeTab === 'privacy' && (
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