import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  X, Edit2, Settings, MoreHorizontal, Calendar, Link2, StickyNote, Camera,
  MessageCircle, UserPlus, UserCheck, Clock, Tv
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

function getBannerStyle(profile) {
  if (profile?.banner_url) {
    return { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  const gradient = BANNER_GRADIENT_MAP[profile?.banner_color] || 'linear-gradient(135deg, #7c3aed, #6b21a8)';
  return { background: gradient };
}

// Self-view modal (own profile)
function SelfProfileModal({ onClose, onOpenSettings }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [friendProfiles, setFriendProfiles] = useState([]);
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
    Promise.all([
      base44.entities.FriendRequest.filter({ from_email: user.email }),
      base44.entities.FriendRequest.filter({ to_email: user.email }),
    ]).then(([sent, received]) => {
      const accepted = [...sent, ...received].filter(r => r.status === 'accepted');
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
    <div
      className="w-full max-w-[780px] bg-[#111318] rounded-2xl shadow-2xl border border-white/8 flex overflow-hidden pointer-events-auto"
      style={{ height: 520 }}
      onClick={e => e.stopPropagation()}
    >
      {/* LEFT */}
      <div className="w-[240px] flex-shrink-0 bg-[#0f1115] flex flex-col border-r border-white/5 overflow-y-auto scrollbar-hide">
        {/* Banner Container - Height fixed, allows avatar to overflow */}
        <div 
          className="relative w-full h-32 flex-shrink-0 bg-cover bg-center group cursor-pointer"
          style={{
            backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : undefined,
            background: !profile?.banner_url ? getBannerStyle(profile).background : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          onClick={() => bannerInputRef.current?.click()}
        >
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
        </div>
        
        {/* Avatar - Absolute positioned to overlap banner, outside overflow */}
        <div className="relative px-4 -mt-10 mb-2 flex justify-center z-20 pointer-events-none">
          <div 
            className="group cursor-pointer pointer-events-auto"
            onClick={() => setShowAvatarModal(true)}
          >
            <div className="ring-4 ring-[#0f1115] rounded-full relative inline-block">
              <Avatar name={dn} email={user.email} avatarUrl={profile?.avatar_url} size="xl" />
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploadingAvatar ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-3 flex-1">
          <div className="mb-2">
            <h2 className="font-black text-white text-base leading-tight">{dn}</h2>
            <p className="text-gray-500 text-xs font-mono">{tag}</p>
          </div>
          <div className="flex items-center gap-1.5 mb-4">
            <button onClick={() => { onOpenSettings?.(); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors">
              <Edit2 className="w-3 h-3" /> Edit Profile
            </button>
            <button onClick={() => { onOpenSettings?.(); onClose(); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-px bg-white/5 mb-3" />
          {joinedDate && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Member Since</p>
              <p className="text-xs text-gray-300">{joinedDate}</p>
            </div>
          )}
          {friendProfiles.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-1"><Link2 className="w-3 h-3" /> Connections</p>
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
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Note <span className="normal-case font-normal text-gray-700">(only visible to you)</span></p>
            {editingNote ? (
              <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} onBlur={() => setEditingNote(false)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 resize-none" placeholder="Click to add a note..." />
            ) : (
              <button onClick={() => setEditingNote(true)} className="w-full text-left text-xs text-gray-600 hover:text-gray-400 italic transition-colors">{note || 'Click to add a note →'}</button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
          <span className="text-sm font-semibold text-white">Activity</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Calendar className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-white font-semibold">No activity yet</p>
          <p className="text-gray-500 text-sm mt-1">Your recent activity will appear here</p>
        </div>
      </div>

      <AnimatePresence>
        {showAvatarModal && (
          <AvatarEditModal currentAvatarUrl={profile?.avatar_url} displayName={dn} userEmail={user.email} onApply={handleAvatarApply} onClose={() => setShowAvatarModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Other user view modal
function OtherUserProfileModal({ targetEmail, targetName, onClose, onDM }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendReqId, setFriendReqId] = useState(null);

  useEffect(() => {
    if (!targetEmail) return;
    base44.entities.UserProfile.filter({ user_email: targetEmail }, null, 1).then(r => setProfile(r[0] || null));
    if (user && user.email !== targetEmail) {
      Promise.all([
        base44.entities.FriendRequest.filter({ from_email: user.email, to_email: targetEmail }),
        base44.entities.FriendRequest.filter({ from_email: targetEmail, to_email: user.email }),
      ]).then(([sent, received]) => {
        const acceptedSent = sent.find(r => r.status === 'accepted');
        const acceptedReceived = received.find(r => r.status === 'accepted');
        if (acceptedSent || acceptedReceived) { setFriendStatus('friends'); setFriendReqId((acceptedSent || acceptedReceived).id); }
        else {
          const pendingSent = sent.find(r => r.status === 'pending');
          const pendingReceived = received.find(r => r.status === 'pending');
          if (pendingSent) { setFriendStatus('pending_sent'); setFriendReqId(pendingSent.id); }
          else if (pendingReceived) { setFriendStatus('pending_received'); setFriendReqId(pendingReceived.id); }
        }
      });
    }
  }, [targetEmail, user]);

  const sendFriendRequest = async () => {
    const req = await base44.entities.FriendRequest.create({ from_email: user.email, from_name: user.full_name || user.email.split('@')[0], to_email: targetEmail, status: 'pending' });
    await base44.entities.Notification.create({ user_email: targetEmail, type: 'friend_request', title: 'Friend Request', body: `${user.full_name || user.email.split('@')[0]} sent you a friend request`, from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false });
    setFriendStatus('pending_sent'); setFriendReqId(req.id);
  };

  const acceptFriend = async () => {
    await base44.entities.FriendRequest.update(friendReqId, { status: 'accepted' });
    setFriendStatus('friends');
  };

  const dn = profile?.user_name || targetName || targetEmail?.split('@')[0] || 'User';
  const tag = targetEmail?.split('@')[0].toLowerCase();
  const joinedDate = profile?.created_date ? format(new Date(profile.created_date), 'MMM d, yyyy') : null;
  const dmAllowed = profile?.dm_enabled !== false;
  const STATUS_COLORS = { online: 'bg-green-500', watching: 'bg-violet-500', idle: 'bg-yellow-400', offline: 'bg-gray-600' };

  return (
    <div
      className="w-full max-w-[780px] bg-[#111318] rounded-2xl shadow-2xl border border-white/8 flex overflow-hidden pointer-events-auto"
      style={{ height: 520 }}
      onClick={e => e.stopPropagation()}
    >
      {/* LEFT */}
      <div className="w-[240px] flex-shrink-0 bg-[#0f1115] flex flex-col border-r border-white/5 overflow-y-auto scrollbar-hide">
        {/* Banner Container - Height fixed, allows avatar to overflow */}
        <div className="relative w-full h-32 flex-shrink-0 bg-cover bg-center">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : undefined,
              background: !profile?.banner_url ? getBannerStyle(profile).background : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </div>

        {/* Avatar - Absolute positioned to overlap banner, outside overflow */}
        <div className="relative px-4 -mt-10 mb-2 flex justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <div className="ring-4 ring-[#0f1115] rounded-full relative inline-block">
              <Avatar name={dn} email={targetEmail} avatarUrl={profile?.avatar_url} size="xl" />
              {profile?.status && (
                <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-[#0f1115] ${STATUS_COLORS[profile.status] || 'bg-gray-600'}`} />
              )}
            </div>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="px-4 pb-3 flex-1">
          <div className="mb-2">
            <h2 className="font-black text-white text-base leading-tight">{dn}</h2>
            <p className="text-gray-500 text-xs font-mono">{tag}</p>
          </div>

          {/* Status */}
          {profile?.status === 'watching' && profile?.currently_watching && (
            <div className="mb-3 flex items-center gap-2 text-xs bg-violet-600/10 border border-violet-500/20 rounded-lg px-2.5 py-2">
              <Tv className="w-3 h-3 text-violet-400 flex-shrink-0" />
              <span className="text-violet-300">Watching <span className="font-semibold">{profile.currently_watching}</span></span>
            </div>
          )}

          {profile?.bio && <p className="text-gray-400 text-xs mb-3 leading-relaxed">{profile.bio}</p>}

          {/* Actions */}
          {user && (
            <div className="flex flex-col gap-2 mb-4">
              {friendStatus === 'friends' ? (
                <div className="flex items-center justify-center gap-1.5 text-green-400 text-xs font-semibold py-2 rounded-xl bg-green-400/10 border border-green-400/20">
                  <UserCheck className="w-3.5 h-3.5" /> Friends
                </div>
              ) : friendStatus === 'pending_sent' ? (
                <div className="flex items-center justify-center gap-1.5 text-yellow-400 text-xs font-semibold py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                  <Clock className="w-3.5 h-3.5" /> Request Sent
                </div>
              ) : friendStatus === 'pending_received' ? (
                <button onClick={acceptFriend} className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                  <UserPlus className="w-3.5 h-3.5" /> Accept Request
                </button>
              ) : (
                <button onClick={sendFriendRequest} className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 transition-colors">
                  <UserPlus className="w-3.5 h-3.5" /> Add Friend
                </button>
              )}
              {dmAllowed ? (
                <button onClick={() => { onDM?.(targetEmail, dn); onClose(); }} className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> Message
                </button>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed">
                  <MessageCircle className="w-3.5 h-3.5" /> DMs Off
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-white/5 mb-3" />
          {joinedDate && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Member Since</p>
              <p className="text-xs text-gray-300">{joinedDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
          <span className="text-sm font-semibold text-white">Activity</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Calendar className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-white font-semibold">No activity yet</p>
          <p className="text-gray-500 text-sm mt-1">Recent activity will appear here</p>
        </div>
      </div>
    </div>
  );
}

// Main export — decides which modal to show
export default function UserProfileModal({ onClose, onOpenSettings, targetEmail, targetName, onDM }) {
  const { user } = useAuth();
  const isSelf = !targetEmail || targetEmail === user?.email;

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none"
      >
        {isSelf ? (
          <SelfProfileModal onClose={onClose} onOpenSettings={onOpenSettings} />
        ) : (
          <OtherUserProfileModal targetEmail={targetEmail} targetName={targetName} onClose={onClose} onDM={onDM} />
        )}
      </motion.div>
    </>
  );
}