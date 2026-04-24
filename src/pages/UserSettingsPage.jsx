import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Camera, Save, ArrowLeft, Palette, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Avatar, getAvatarColor } from '../components/community/UserProfilePopup.jsx';

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

export default function UserSettingsPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0]);
  const [dmEnabled, setDmEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
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
    await base44.entities.UserProfile.update(profile.id, {
      bio,
      banner_color: bannerColor,
      dm_enabled: dmEnabled,
    });
    setProfile(prev => ({ ...prev, bio, banner_color: bannerColor, dm_enabled: dmEnabled }));
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
    setProfile(prev => ({ ...prev, banner_url: file_url }));
    setUploadingBanner(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-gray-400">Please sign in to access settings.</p>
      </div>
    );
  }

  const displayName = user.full_name || user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/community" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Community
        </Link>

        <h1 className="text-2xl font-black mb-6">User Settings</h1>

        {/* Profile Preview */}
        <div className="bg-[#0d0d14] rounded-2xl border border-white/5 overflow-hidden mb-6">
          {/* Banner */}
          <div className="relative h-28 group">
            {profile?.banner_url ? (
              <img src={profile.banner_url} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${bannerColor}`} />
            )}
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-sm text-white font-semibold gap-2"
            >
              <Camera className="w-4 h-4" />
              {uploadingBanner ? 'Uploading...' : 'Change Banner'}
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>

          {/* Avatar */}
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-8 mb-3">
              <div className="relative group flex-shrink-0">
                <Avatar name={displayName} email={user.email} avatarUrl={profile?.avatar_url} size="xl" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  {uploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">{displayName}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Profile Info */}
          <div className="bg-[#0d0d14] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-violet-400">Profile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Display Name</label>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400">{displayName} <span className="text-gray-600 text-xs">(managed by account)</span></div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Email</label>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400">{user.email}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="Tell people about yourself..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
                />
                <p className="text-xs text-gray-600 mt-1">{bio.length}/200</p>
              </div>
            </div>
          </div>

          {/* Banner Color */}
          <div className="bg-[#0d0d14] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-violet-400">Banner Color</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">Or upload a custom banner image above.</p>
            <div className="grid grid-cols-4 gap-2">
              {BANNER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setBannerColor(c); setProfile(prev => prev ? { ...prev, banner_url: null } : prev); }}
                  className={`h-10 rounded-lg bg-gradient-to-r ${c} transition-all ${bannerColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0d14]' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-[#0d0d14] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-violet-400">Privacy</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Allow Direct Messages</p>
                <p className="text-xs text-gray-500 mt-0.5">Let other users send you DMs</p>
              </div>
              <button
                onClick={() => setDmEnabled(v => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative ${dmEnabled ? 'bg-violet-600' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dmEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
            <button
              onClick={() => logout()}
              className="px-6 py-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 font-semibold transition-all text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}