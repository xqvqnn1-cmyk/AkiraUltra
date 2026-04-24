import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, MessageCircle, UserPlus, UserCheck, Clock, X, Camera, Edit2, Check, Settings } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const AVATAR_COLORS = [
  'from-violet-600 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-orange-500 to-red-600',
  'from-green-500 to-teal-600',
  'from-yellow-500 to-orange-600',
  'from-purple-600 to-indigo-600',
];

export function getAvatarColor(email) {
  if (!email) return AVATAR_COLORS[0];
  let sum = 0;
  for (let i = 0; i < email.length; i++) sum += email.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function Avatar({ name, email, avatarUrl, size = 'md', onClick }) {
  const color = getAvatarColor(email);
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        onClick={onClick}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-violet-400 transition-all' : ''}`}
      />
    );
  }
  return (
    <div
      onClick={onClick}
      className={`${sizes[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white flex-shrink-0 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-violet-400 transition-all' : ''}`}
    >
      {(name || email || 'A')[0].toUpperCase()}
    </div>
  );
}

export function StatusDot({ status, border = 'border-[#0d0d14]' }) {
  const colors = { online: 'bg-green-400', watching: 'bg-violet-400', idle: 'bg-yellow-400', offline: 'bg-gray-600' };
  return <span className={`w-3 h-3 rounded-full border-2 ${border} ${colors[status] || 'bg-gray-600'}`} />;
}

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

const ROLE_BADGE = {
  owner: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '👑 Owner' },
  admin: { bg: 'bg-violet-500/20', text: 'text-violet-400', label: '⚙️ Admin' },
  user: null,
};

function getBannerStyle(profile) {
  if (profile?.banner_url) return { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  const color = getAvatarColor(profile?.user_email);
  const gradient = BANNER_GRADIENT_MAP[profile?.banner_color] || BANNER_GRADIENT_MAP[color] || 'linear-gradient(to right, #7c3aed, #6b21a8)';
  return { background: gradient };
}

export default function UserProfilePopup({ userEmail, userName, anchorRef, onClose, onDM, modal = false }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null); // null | 'friends' | 'pending_sent' | 'pending_received'
  const [friendReqId, setFriendReqId] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const popupRef = useRef(null);
  const fileInputRef = useRef(null);

  const isSelf = user?.email === userEmail;

  useEffect(() => {
    if (modal) return; // modal mode: parent backdrop handles closing
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef, modal]);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.UserProfile.filter({ user_email: userEmail }, null, 1).then(r => {
      setProfile(r[0] || null);
      setBioInput(r[0]?.bio || '');
    });
    if (user && user.email !== userEmail) {
      Promise.all([
        base44.entities.FriendRequest.filter({ from_email: user.email, to_email: userEmail }),
        base44.entities.FriendRequest.filter({ from_email: userEmail, to_email: user.email }),
      ]).then(([sent, received]) => {
        const acceptedSent = sent.find(r => r.status === 'accepted');
        const acceptedReceived = received.find(r => r.status === 'accepted');
        if (acceptedSent || acceptedReceived) {
          setFriendStatus('friends');
          setFriendReqId((acceptedSent || acceptedReceived).id);
        } else {
          const pendingSent = sent.find(r => r.status === 'pending');
          const pendingReceived = received.find(r => r.status === 'pending');
          if (pendingSent) { setFriendStatus('pending_sent'); setFriendReqId(pendingSent.id); }
          else if (pendingReceived) { setFriendStatus('pending_received'); setFriendReqId(pendingReceived.id); }
          else { setFriendStatus(null); }
        }
      });
    }
  }, [userEmail, user]);

  const sendFriendRequest = async () => {
    const req = await base44.entities.FriendRequest.create({ from_email: user.email, from_name: user.full_name || user.email.split('@')[0], to_email: userEmail, status: 'pending' });
    await base44.entities.Notification.create({ user_email: userEmail, type: 'friend_request', title: 'Friend Request', body: `${user.full_name || user.email.split('@')[0]} sent you a friend request`, from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false });
    setFriendStatus('pending_sent');
    setFriendReqId(req.id);
  };

  const acceptFriend = async () => {
    await base44.entities.FriendRequest.update(friendReqId, { status: 'accepted' });
    await base44.entities.Notification.create({ user_email: userEmail, type: 'friend_accepted', title: 'Friend Request Accepted', body: `${user.full_name || user.email.split('@')[0]} accepted your friend request`, from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false });
    setFriendStatus('friends');
  };

  const saveBio = async () => {
    if (!profile) return;
    await base44.entities.UserProfile.update(profile.id, { bio: bioInput });
    setProfile(prev => ({ ...prev, bio: bioInput }));
    setEditingBio(false);
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

  const displayName = profile?.user_name || userName || userEmail?.split('@')[0] || 'Unknown';
  const joinedDate = profile?.created_date ? format(new Date(profile.created_date), 'MMM yyyy') : null;
  const dmAllowed = profile?.dm_enabled !== false;

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.15 }}
      className={`${modal ? 'relative' : 'absolute'} z-50 w-72 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}
      style={!modal ? { top: '100%', left: 0, marginTop: 8 } : {}}
    >
      {/* Banner */}
      <div className="h-20" style={getBannerStyle(profile)} />

      {/* Avatar + close */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between -mt-8 mb-2">
          <div className="relative group">
            <Avatar name={displayName} email={userEmail} avatarUrl={profile?.avatar_url} size="xl" />
            {profile?.status && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={profile.status} border="border-[#111118]" />
              </div>
            )}
            {isSelf && (
              <>
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
              </>
            )}
          </div>
          <div className="flex items-center gap-1 mt-9">
            {isSelf && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-white text-base">{displayName}</h3>
          {profile?.role === 'owner' && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">👑 Owner</span>
          )}
          {profile?.role === 'admin' && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">⚙️ Admin</span>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-1 mb-2">
          <StatusDot status={profile?.status || 'offline'} border="border-[#111118]" />
          <span className="text-xs text-gray-500 capitalize">{profile?.status || 'offline'}</span>
          {joinedDate && <span className="text-xs text-gray-600">· Joined {joinedDate}</span>}
        </div>

        {/* Bio */}
        {isSelf ? (
          <div className="mb-3">
            {editingBio ? (
              <div className="flex gap-2 items-start">
                <textarea
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  placeholder="Write something about yourself..."
                  maxLength={200}
                  rows={2}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
                />
                <button onClick={saveBio} className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingBio(true)} className="w-full text-left group flex items-start gap-1.5">
                <p className="text-gray-500 text-xs leading-relaxed flex-1">
                  {profile?.bio || <span className="text-gray-700 italic">Click to add a bio...</span>}
                </p>
                <Edit2 className="w-3 h-3 text-gray-700 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors" />
              </button>
            )}
          </div>
        ) : (
          profile?.bio && <p className="text-gray-400 text-xs mb-3 leading-relaxed">{profile.bio}</p>
        )}

        {/* Currently watching */}
        {profile?.status === 'watching' && profile?.currently_watching && (
          <div className="mb-3 flex items-center gap-2 text-xs bg-violet-600/10 border border-violet-500/20 rounded-lg px-2.5 py-2">
            <Tv className="w-3 h-3 text-violet-400 flex-shrink-0" />
            <span className="text-violet-300">Watching <span className="font-semibold">{profile.currently_watching}</span></span>
          </div>
        )}

        {/* Actions for other users */}
        {!isSelf && user && (
          <div className="flex gap-2 mt-3">
            {friendStatus === 'friends' ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-green-400 text-xs font-semibold py-2 rounded-xl bg-green-400/10 border border-green-400/20">
                <UserCheck className="w-3.5 h-3.5" /> Friends
              </div>
            ) : friendStatus === 'pending_sent' ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-yellow-400 text-xs font-semibold py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                <Clock className="w-3.5 h-3.5" /> Request Sent
              </div>
            ) : friendStatus === 'pending_received' ? (
              <button onClick={acceptFriend} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Accept Request
              </button>
            ) : (
              <button onClick={sendFriendRequest} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Add Friend
              </button>
            )}

            {dmAllowed ? (
              <button
                onClick={() => { onDM(userEmail, displayName); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed">
                <MessageCircle className="w-3.5 h-3.5" /> DMs Off
              </div>
            )}
          </div>
        )}

        {isSelf && (
          <button onClick={onClose} className="block w-full mt-3 text-center text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Close ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}