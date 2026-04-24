import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, MessageCircle, UserPlus, UserCheck, Clock, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

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

export function Avatar({ name, email, size = 'md', onClick }) {
  const color = getAvatarColor(email);
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
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

export default function UserProfilePopup({ userEmail, userName, anchorRef, onClose, onDM }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null); // null | 'pending_sent' | 'pending_received' | 'friends'
  const [friendReqId, setFriendReqId] = useState(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.UserProfile.filter({ user_email: userEmail }, null, 1).then(r => setProfile(r[0] || null));
    if (user && user.email !== userEmail) {
      // Check friend status
      Promise.all([
        base44.entities.FriendRequest.filter({ from_email: user.email, to_email: userEmail }),
        base44.entities.FriendRequest.filter({ from_email: userEmail, to_email: user.email }),
      ]).then(([sent, received]) => {
        if (sent.length > 0) {
          if (sent[0].status === 'accepted') { setFriendStatus('friends'); setFriendReqId(sent[0].id); }
          else if (sent[0].status === 'pending') { setFriendStatus('pending_sent'); setFriendReqId(sent[0].id); }
        } else if (received.length > 0) {
          if (received[0].status === 'accepted') { setFriendStatus('friends'); setFriendReqId(received[0].id); }
          else if (received[0].status === 'pending') { setFriendStatus('pending_received'); setFriendReqId(received[0].id); }
        }
      });
    }
  }, [userEmail, user]);

  const sendFriendRequest = async () => {
    const req = await base44.entities.FriendRequest.create({ from_email: user.email, from_name: user.full_name || user.email.split('@')[0], to_email: userEmail, status: 'pending' });
    // Create notification for target user
    await base44.entities.Notification.create({ user_email: userEmail, type: 'friend_request', title: 'Friend Request', body: `${user.full_name || user.email.split('@')[0]} sent you a friend request`, from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false });
    setFriendStatus('pending_sent');
    setFriendReqId(req.id);
  };

  const acceptFriend = async () => {
    await base44.entities.FriendRequest.update(friendReqId, { status: 'accepted' });
    await base44.entities.Notification.create({ user_email: userEmail, type: 'friend_accepted', title: 'Friend Request Accepted', body: `${user.full_name || user.email.split('@')[0]} accepted your friend request`, from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false });
    setFriendStatus('friends');
  };

  const isSelf = user?.email === userEmail;
  const displayName = profile?.user_name || userName || userEmail?.split('@')[0] || 'Unknown';

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 w-72 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      style={{ top: '100%', left: 0, marginTop: 8 }}
    >
      {/* Banner */}
      <div className={`h-16 bg-gradient-to-r ${getAvatarColor(userEmail)}`} />

      {/* Avatar + close */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between -mt-8 mb-3">
          <div className="relative">
            <Avatar name={displayName} email={userEmail} size="xl" />
            {profile?.status && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={profile.status} border="border-[#111118]" />
              </div>
            )}
          </div>
          <button onClick={onClose} className="mt-8 text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-bold text-white text-base">{displayName}</h3>
        <p className="text-gray-500 text-xs">{userEmail}</p>

        {profile?.bio && <p className="text-gray-400 text-xs mt-2 leading-relaxed">{profile.bio}</p>}

        {profile?.status === 'watching' && profile?.currently_watching && (
          <div className="mt-3 flex items-center gap-2 text-xs text-violet-400">
            <Tv className="w-3 h-3" />
            <span>Watching <span className="font-semibold">{profile.currently_watching}</span></span>
          </div>
        )}

        {!isSelf && user && (
          <div className="flex gap-2 mt-4">
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
            <button
              onClick={() => { onDM(userEmail, displayName); onClose(); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Message
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}