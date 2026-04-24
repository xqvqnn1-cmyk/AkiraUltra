import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  X, Edit2, Settings, MoreHorizontal, Plus, Calendar, Link2, StickyNote, Camera
} from 'lucide-react';
import { Avatar, getAvatarColor } from './UserProfilePopup.jsx';
import { format } from 'date-fns';
import AvatarEditModal from './AvatarEditModal.jsx';

const BANNER_GRADIENT_MAP = {
  'from-violet-600 to-purple-800': 'linear-gradient(135deg, #7c3aed, #6b21a8)',
  'from-cyan-500 to-blue-700': 'linear-gradient(135deg, #06b6d4, #1d4ed8)',
  'from-pink-500 to-rose-700': 'linear-gradient(135deg, #ec4899, #be123c)',
  'from-orange-500 to-red-700': 'linear-gradient(135deg, #f97316, #b91c1c)',
  'from-green-500 to-teal-700': 'linear-gradient(135deg, #22c55e, #0f766e)',
  'from-yellow-500 to-orange-600': 'linear-gradient(135deg, #eab308, #ea580c)',
  'from-indigo-500 to-violet-700': 'linear-gradient(135deg, #6366f1, #7e22ce)',
  'from-fuchsia-500 to-pink-700': 'linear-gradient(135deg, #d946ef, #be185d)',
};

const WIDGET_CARDS = [
  { id: 'fav_game', label: 'Favorite game', bg: 'from-purple-900/80 to-indigo-900/80' },
  { id: 'games_like', label: 'Games I like', bg: 'from-blue-900/80 to-cyan-900/80' },
  { id: 'games_rotation', label: 'Games in rotation', bg: 'from-pink-900/80 to-rose-900/80' },
  { id: 'want_to_play', label: 'Want to play', bg: 'from-orange-900/80 to-red-900/80' },
];

const TABS = ['Board', 'Activity', 'Wishlist'];

function getBannerStyle(profile) {
  if (profile?.banner_url) {
    return { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  const gradient = BANNER_GRADIENT_MAP[profile?.banner_color] || 'linear-gradient(135deg, #7c3aed, #6b21a8)';
  return { background: gradient };
}

export default function UserProfileModal({ onClose, onOpenSettings }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('Board');
  const [note, setNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const bannerInputRef = useRef(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.UserProfile.filter({ user_email: user.email }, null, 1).then(r => {
      if (r[0]) setProfile(r[0]);
    });
    // Load accepted friends
    Promise.all([
      base44.entities.FriendRequest.filter({ from_email: user.email }),
      base44.entities.FriendRequest.filter({ to_email: user.email }),
    ]).then(([sent, received]) => {
      const accepted = [...sent, ...received].filter(r => r.status === 'accepted');
      setFriends(accepted);
      const emails = accepted.map(r => r.from_email === user.email ? r.to_email : r.from_email);
      if (emails.length > 0) {
        Promise.all(emails.slice(0, 4).map(e =>
          base44.entities.UserProfile.filter({ user_email: e }, null, 1).then(r => r[0])
        )).then(profiles => setFriendProfiles(profiles.filter(Boolean)));
      }
    });
  }, [user]);

  const handleAvatarApply = async (file) => {
    if (!profile) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.UserProfile.update(profile.id, { avatar_url: file_url });
    setProfile(prev => ({ ...prev, avatar_url: file_url }));
    window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { email: user.email, avatarUrl: file_url } }));
    setUploadingAvatar(false);
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

  if (!user) return null;

  const dn = profile?.user_name || user.full_name || user.email.split('@')[0];
  const tag = user.email.split('@')[0].toLowerCase();
  const joinedDate = profile?.created_date ? format(new Date(profile.created_date), 'MMM d, yyyy') : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-[780px] bg-[#111318] rounded-2xl shadow-2xl border border-white/8 flex overflow-hidden pointer-events-auto"
          style={{ height: 520 }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── LEFT COLUMN ── */}
          <div className="w-[240px] flex-shrink-0 bg-[#0f1115] flex flex-col overflow-hidden border-r border-white/5">
            {/* Banner */}
            <div
              className="h-20 relative group cursor-pointer flex-shrink-0"
              style={getBannerStyle(profile)}
              onClick={() => bannerInputRef.current?.click()}
            >
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            </div>

            <div className="px-4 flex-1 overflow-y-auto scrollbar-hide">
              {/* Avatar */}
              <div className="relative -mt-8 mb-2 w-fit group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                <div className="ring-4 ring-[#0f1115] rounded-full">
                  <Avatar name={dn} email={user.email} avatarUrl={profile?.avatar_url} size="xl" />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploadingAvatar
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Camera className="w-4 h-4 text-white" />}
                </div>
              </div>

              {/* Name + tag */}
              <div className="mb-2">
                <h2 className="font-black text-white text-base leading-tight">{dn}</h2>
                <p className="text-gray-500 text-xs font-mono">{tag}</p>
              </div>

              {/* Edit + action buttons */}
              <div className="flex items-center gap-1.5 mb-4">
                <button
                  onClick={() => { onOpenSettings?.(); onClose(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Edit Profile
                </button>
                <button
                  onClick={() => { onOpenSettings?.(); onClose(); }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-px bg-white/5 mb-3" />

              {/* Member Since */}
              {joinedDate && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Member Since
                  </p>
                  <p className="text-xs text-gray-300">{joinedDate}</p>
                </div>
              )}

              {/* Connections */}
              {friendProfiles.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Connections
                  </p>
                  <div className="space-y-1.5">
                    {friendProfiles.map(fp => (
                      <div key={fp.user_email} className="flex items-center gap-2">
                        <Avatar name={fp.user_name || fp.user_email} email={fp.user_email} avatarUrl={fp.avatar_url} size="sm" />
                        <span className="text-xs text-gray-300 truncate">{fp.user_name || fp.user_email.split('@')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-px bg-white/5 mb-3" />

              {/* Private note */}
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1">
                  <StickyNote className="w-3 h-3" /> Note <span className="normal-case font-normal text-gray-700">(only visible to you)</span>
                </p>
                {editingNote ? (
                  <textarea
                    autoFocus
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onBlur={() => setEditingNote(false)}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 resize-none"
                    placeholder="Click to add a note..."
                  />
                ) : (
                  <button
                    onClick={() => setEditingNote(true)}
                    className="w-full text-left text-xs text-gray-600 hover:text-gray-400 italic transition-colors"
                  >
                    {note || 'Click to add a note →'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header / close */}
            <div className="flex items-center justify-between px-5 pt-4 pb-0 flex-shrink-0">
              <div className="flex items-center gap-1 border-b border-white/5 w-full pb-0">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-semibold transition-colors relative ${
                      activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full"
                      />
                    )}
                  </button>
                ))}
                <div className="ml-auto pb-2">
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
              {activeTab === 'Board' && (
                <div>
                  <div className="text-center mb-5 pt-2">
                    <h3 className="text-white font-bold text-base">Customize your profile with Widgets</h3>
                    <p className="text-gray-500 text-xs mt-1">Choose from our library of Widgets to share more about yourself and your interests</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {WIDGET_CARDS.map(card => (
                      <motion.button
                        key={card.id}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative h-28 rounded-xl bg-gradient-to-br ${card.bg} border border-white/8 flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden group transition-all`}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        <div className="relative z-10 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                        <p className="relative z-10 text-white text-xs font-semibold">{card.label}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Activity' && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Calendar className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-white font-semibold">No activity yet</p>
                  <p className="text-gray-500 text-sm mt-1">Your recent activity will appear here</p>
                </div>
              )}

              {activeTab === 'Wishlist' && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Plus className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-white font-semibold">Your wishlist is empty</p>
                  <p className="text-gray-500 text-sm mt-1">Add items to your wishlist to share with others</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Avatar Edit Modal */}
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