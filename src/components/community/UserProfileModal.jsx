import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { X, MessageCircle, UserPlus, UserCheck, Clock, Camera, Edit2, Check, Tv, Settings } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Avatar, StatusDot, getAvatarColor } from './UserProfilePopup.jsx';

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

function getBannerStyle(profile) {
  if (profile?.banner_url) return { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  const color = getAvatarColor(profile?.user_email);
  const gradient = BANNER_GRADIENT_MAP[profile?.banner_color] || BANNER_GRADIENT_MAP[color] || 'linear-gradient(to right, #7c3aed, #6b21a8)';
  return { background: gradient };
}

export default function UserProfileModal({ userEmail, userName, onClose, onDM }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendReqId, setFriendReqId] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const isSelf = user?.email === userEmail;

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
          else setFriendStatus(null);
        }
      });
    }
  }, [userEmail, user]);

  const sendFriendRequest = async () => {
    const req = await base44.entities.FriendRequest.create({ from_email: user.email, from_name: user.full_name || user.email.split('@')[0], to_email: userEmail, status: 'pending' });
    await base44.entities.Notification.create({ user_email: userEmail, type: 'friend_request', title: 'Friend Request', body: `${user.full_name || user.email.split('@')[0]} sent you a friend request`, from_email: user.email, from_name: user.full_name, read: false });
    setFriendStatus('pending_sent');
    setFriendReqId(req.id);
  };

  const acceptFriend = async () => {
    await base44.entities.FriendRequest.update(friendReqId, { status: 'accepted' });
    await base44.entities.Notification.create({ user_email: userEmail, type: 'friend_accepted', title: 'Friend Request Accepted', body: `${user.full_name || user.email.split('@')[0]} accepted your friend request`, from_email: user.email, from_name: user.full_name, read: false });
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
  const joinedDate = profile?.created_date ? format(new Date(profile.created_date), 'MMM d, yyyy') : null;
  const dmAllowed = profile?.dm_enabled !== false;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="relative bg-[#1a1a2e] rounded-2xl shadow-2xl overflow-hidden w-80 border border-white/10"
    >
      {/* Banner */}
      <div className="h-24 relative" style={getBannerStyle(profile)} />

      {/* Close */}
      <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors z-10">
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Avatar */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between -mt-8 mb-3">
          <div className="relative group">
            <div className="ring-4 ring-[#1a1a2e] rounded-full">
              <Avatar name={displayName} email={userEmail} avatarUrl={profile?.avatar_url} size="xl" />
            </div>
            {profile?.status && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={profile.status} border="border-[#1a1a2e]" />
              </div>
            )}
            {isSelf && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  {uploadingAvatar ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </>
            )}
          </div>
          {isSelf && (
            <div className="mt-10">
              <Link to="/settings" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors block">
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Name + status */}
        <h3 className="font-bold text-white text-base">{displayName}</h3>
        <div className="flex items-center gap-2 mt-1 mb-3">
          <StatusDot status={profile?.status || 'offline'} border="border-[#1a1a2e]" />
          <span className="text-xs text-gray-500 capitalize">{profile?.status || 'offline'}</span>
          {joinedDate && <span className="text-xs text-gray-600">· Joined {joinedDate}</span>}
        </div>

        {/* Currently watching */}
        {profile?.status === 'watching' && profile?.currently_watching && (
          <div className="mb-3 flex items-center gap-2 text-xs bg-violet-600/10 border border-violet-500/20 rounded-lg px-2.5 py-2">
            <Tv className="w-3 h-3 text-violet-400 flex-shrink-0" />
            <span className="text-violet-300">Watching <span className="font-semibold">{profile.currently_watching}</span></span>
          </div>
        )}

        {/* Bio */}
        {isSelf ? (
          <div className="mb-3">
            {editingBio ? (
              <div className="flex gap-2">
                <textarea value={bioInput} onChange={e => setBioInput(e.target.value)} maxLength={200} rows={2} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none" />
                <button onClick={saveBio} className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white"><Check className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => setEditingBio(true)} className="w-full text-left group flex items-start gap-1.5">
                <p className="text-gray-500 text-xs leading-relaxed flex-1">{profile?.bio || <span className="text-gray-700 italic">Click to add a bio...</span>}</p>
                <Edit2 className="w-3 h-3 text-gray-700 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors" />
              </button>
            )}
          </div>
        ) : (
          profile?.bio && <p className="text-gray-400 text-xs mb-3 leading-relaxed">{profile.bio}</p>
        )}

        {/* Member since */}
        {joinedDate && (
          <div className="mb-3 pb-3 border-b border-white/5">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-0.5">Member Since</p>
            <p className="text-xs text-gray-300">{joinedDate}</p>
          </div>
        )}

        {/* Actions for other users */}
        {!isSelf && user && (
          <div className="flex gap-2">
            {dmAllowed && (
              <button
                onClick={() => { onDM(userEmail, displayName); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </button>
            )}

            {friendStatus === 'friends' ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-green-400 text-xs font-semibold py-2 rounded-xl bg-green-400/10 border border-green-400/20">
                <UserCheck className="w-3.5 h-3.5" /> Friends
              </div>
            ) : friendStatus === 'pending_sent' ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-yellow-400 text-xs font-semibold py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                <Clock className="w-3.5 h-3.5" /> Pending
              </div>
            ) : friendStatus === 'pending_received' ? (
              <button onClick={acceptFriend} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Accept
              </button>
            ) : (
              <button onClick={sendFriendRequest} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Add Friend
              </button>
            )}
          </div>
        )}

        {isSelf && (
          <Link to="/settings" onClick={onClose} className="block mt-2 text-center text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Open Full Settings →
          </Link>
        )}
      </div>
    </motion.div>
  );
}