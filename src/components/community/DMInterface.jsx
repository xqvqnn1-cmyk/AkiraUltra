import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Phone, Video, Search, MoreVertical, Plus, Heart, Share2, X, Calendar, Link as Link2, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar } from './UserProfilePopup.jsx';
import UserProfileModal from './UserProfileModal.jsx';

const STATUS_COLORS = {
  online: 'bg-green-500',
  watching: 'bg-violet-500',
  idle: 'bg-yellow-400',
  offline: 'bg-gray-600',
};

export default function DMInterface({ targetEmail, targetName, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [profile, setProfile] = useState(null);
  const [targetProfile, setTargetProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendReqId, setFriendReqId] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const menuRef = useRef(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch profiles, friend status, and block status
  useEffect(() => {
    if (!user?.email || !targetEmail) return;
    Promise.all([
      base44.entities.UserProfile.filter({ user_email: user.email }, null, 1),
      base44.entities.UserProfile.filter({ user_email: targetEmail }, null, 1),
      base44.entities.FriendRequest.filter({ from_email: user.email, to_email: targetEmail }),
      base44.entities.FriendRequest.filter({ from_email: targetEmail, to_email: user.email }),
      base44.entities.BlockedUser.filter({ user_email: user.email, blocked_email: targetEmail }),
    ]).then(([myProfiles, targetProfiles, sentReqs, receivedReqs, blockedUsers]) => {
      setProfile(myProfiles[0] || null);
      setTargetProfile(targetProfiles[0] || null);
      
      const accepted = [...sentReqs, ...receivedReqs].find(r => r.status === 'accepted');
      const pendingSent = sentReqs.find(r => r.status === 'pending');
      const pendingReceived = receivedReqs.find(r => r.status === 'pending');
      
      if (accepted) {
        setFriendStatus('friends');
        setFriendReqId(accepted.id);
      } else if (pendingSent) {
        setFriendStatus('pending_sent');
        setFriendReqId(pendingSent.id);
      } else if (pendingReceived) {
        setFriendStatus('pending_received');
        setFriendReqId(pendingReceived.id);
      } else {
        setFriendStatus(null);
      }

      if (blockedUsers[0]) {
        setIsBlocked(blockedUsers[0].reason === 'block');
        setIsMuted(blockedUsers[0].reason === 'mute');
      } else {
        setIsBlocked(false);
        setIsMuted(false);
      }
    });

    const handleBlockUpdate = (e) => {
      if (e.detail.blockedEmail === targetEmail) {
        setIsBlocked(e.detail.isBlocked);
        setIsMuted(e.detail.isMuted);
      }
    };
    window.addEventListener('blockStatusChanged', handleBlockUpdate);
    return () => window.removeEventListener('blockStatusChanged', handleBlockUpdate);
  }, [user?.email, targetEmail]);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch DM messages
  const { data: messages = [] } = useQuery({
    queryKey: ['dm', user?.email, targetEmail],
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        base44.entities.DirectMessage.filter({ from_email: user.email, to_email: targetEmail }, 'created_date', 100),
        base44.entities.DirectMessage.filter({ from_email: targetEmail, to_email: user.email }, 'created_date', 100),
      ]);
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    refetchInterval: 3000,
    enabled: !!user?.email && !!targetEmail,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark received messages as read
  useEffect(() => {
    if (!targetEmail) return;
    messages
      .filter(m => m.from_email === targetEmail && !m.read)
      .forEach(m => base44.entities.DirectMessage.update(m.id, { read: true }));
  }, [messages, targetEmail]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.DirectMessage.create({
        from_email: user.email,
        from_name: user.full_name || user.email.split('@')[0],
        to_email: targetEmail,
        content,
        read: false,
      });
      // Create notification
      await base44.entities.Notification.create({
        user_email: targetEmail,
        type: 'dm',
        title: `${user.full_name || user.email.split('@')[0]} sent you a message`,
        body: content.slice(0, 80),
        from_email: user.email,
        from_name: user.full_name || user.email.split('@')[0],
        read: false,
      });
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm', user?.email, targetEmail] });
      setInput('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending || isBlocked) return;
    sendMutation.mutate(input.trim());
  };

  const sendFriendRequest = async () => {
    const req = await base44.entities.FriendRequest.create({
      from_email: user.email,
      from_name: user.full_name || user.email.split('@')[0],
      to_email: targetEmail,
      status: 'pending',
    });
    await base44.entities.Notification.create({
      user_email: targetEmail,
      type: 'friend_request',
      title: 'Friend Request',
      body: `${user.full_name || user.email.split('@')[0]} sent you a friend request`,
      from_email: user.email,
      from_name: user.full_name || user.email.split('@')[0],
      read: false,
    });
    setFriendStatus('pending_sent');
    setFriendReqId(req.id);
  };

  const acceptFriend = async () => {
    if (!friendReqId) return;
    await base44.entities.FriendRequest.update(friendReqId, { status: 'accepted' });
    await base44.entities.Notification.create({
      user_email: targetEmail,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${user.full_name || user.email.split('@')[0]} accepted your friend request`,
      from_email: user.email,
      from_name: user.full_name || user.email.split('@')[0],
      read: false,
    });
    setFriendStatus('friends');
  };

  const cancelFriendRequest = async () => {
    if (!friendReqId) return;
    await base44.entities.FriendRequest.update(friendReqId, { status: 'declined' });
    setFriendStatus(null);
    setFriendReqId(null);
  };

  const displayName = targetName || targetEmail?.split('@')[0] || 'User';
  const joinedDate = targetProfile?.created_date ? format(new Date(targetProfile.created_date), 'MMM d, yyyy') : null;

  const BANNER_GRADIENT_MAP = {
    'from-violet-600 to-purple-800': 'linear-gradient(to right, #7c3aed, #6b21a8)',
    'from-cyan-500 to-blue-700': 'linear-gradient(to right, #06b6d4, #1d4ed8)',
  };

  const bannerStyle = targetProfile?.banner_url
    ? { backgroundImage: `url(${targetProfile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: BANNER_GRADIENT_MAP['from-violet-600 to-purple-800'] || 'linear-gradient(to right, #7c3aed, #6b21a8)' };

  return (
    <div className="flex h-full w-full bg-[#0f1115] text-white overflow-hidden">
      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Top Bar */}
      <div className="h-14 bg-[#111318] border-b border-white/5 px-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar name={displayName} email={targetEmail} avatarUrl={targetProfile?.avatar_url} size="sm" />
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111318] ${STATUS_COLORS[targetProfile?.status || 'offline']}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 capitalize">{targetProfile?.status || 'offline'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Voice call">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Video call">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Search">
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors md:hidden"
              title="Toggle sidebar"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 scrollbar-hide">
          {messages.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full">
              <div className="ring-4 ring-white/10 rounded-full mb-4 inline-block">
                <Avatar name={displayName} email={targetEmail} avatarUrl={targetProfile?.avatar_url} size="xl" />
              </div>
              <p className="text-white font-bold text-lg mb-2">{displayName}</p>
              <p className="text-gray-500 text-sm text-center max-w-xs">
                This is the beginning of your direct message history with <span className="text-gray-300 font-semibold">{displayName}</span>
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.from_email === user.email;
              const prev = messages[i - 1];
              const grouped = prev && prev.from_email === msg.from_email && new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
              const senderProfile = isMine ? profile : targetProfile;
              const senderName = isMine ? (user.full_name || user.email.split('@')[0]) : displayName;

              return (
                <div key={msg.id} className={`flex items-start gap-3 group hover:bg-white/[0.02] px-2 py-0.5 rounded-lg ${grouped ? 'pl-14' : ''}`}>
                  {!grouped && (
                    <div className="flex-shrink-0 mt-0.5">
                      <Avatar name={senderName} email={msg.from_email} avatarUrl={senderProfile?.avatar_url} size="md" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {!grouped && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-white">{senderName}</span>
                        <span className="text-gray-600 text-[10px]">{format(new Date(msg.created_date), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                    <p className="text-gray-300 text-sm leading-relaxed break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

      {/* Message Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 sticky bottom-0 bg-gradient-to-t from-[#0f1115] to-[#0f1115]/80">
          {isBlocked ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center text-sm text-red-400">
              You cannot message this user (blocked)
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-end gap-3">
              <div className="flex-1 flex items-center gap-2 bg-[#1a1d23] rounded-xl px-4 py-3 border border-white/5 focus-within:border-violet-500/50 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Message ${displayName}...`}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button type="button" className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors" title="Emoji">
                  <span className="text-lg">😊</span>
                </button>
                <button type="button" className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors" title="Attachment">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || sendMutation.isPending}
                className="p-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white transition-colors flex-shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <UserProfileModal
            targetEmail={targetEmail}
            targetName={targetName}
            onClose={() => setShowProfileModal(false)}
            onDM={(email, name) => setShowProfileModal(false)}
          />
        )}
      </AnimatePresence>

      {/* RIGHT SIDEBAR */}
      <div className="hidden lg:flex w-80 flex-shrink-0 bg-[#0f1115] border-l border-white/5 flex-col overflow-hidden">
        {/* Banner + Avatar */}
        <div className="relative w-full h-24 flex-shrink-0 bg-cover bg-center" style={bannerStyle}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] to-transparent" />
        </div>

        {/* Avatar + Name */}
        <div className="relative px-4 -mt-10 mb-2 flex justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <div className="ring-4 ring-[#0f1115] rounded-full inline-block">
              <Avatar name={displayName} email={targetEmail} avatarUrl={targetProfile?.avatar_url} size="xl" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-4">
        <div className="text-center mb-2">

          <h3 className="font-black text-white text-base">{displayName}</h3>
          <p className="text-gray-500 text-xs mt-1">{targetEmail?.split('@')[0]}</p>
        </div>

        {/* Status + Badges */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[targetProfile?.status || 'offline']}`} />
            <span className="text-xs text-gray-400 capitalize">{targetProfile?.status || 'offline'}</span>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Member Since */}
        {joinedDate && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Member Since
            </p>
            <p className="text-xs text-gray-300">{joinedDate}</p>
          </div>
        )}

        {/* Bio */}
        {targetProfile?.bio && (
          <>
            <div className="h-px bg-white/5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">About</p>
              <p className="text-xs text-gray-400 leading-relaxed">{targetProfile.bio}</p>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="h-px bg-white/5" />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {friendStatus === 'friends' ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-green-400 text-xs font-semibold py-2 rounded-lg bg-green-400/10 border border-green-400/20">
                <Heart className="w-3.5 h-3.5" /> Friends
              </div>
            ) : friendStatus === 'pending_sent' ? (
              <button onClick={cancelFriendRequest} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 text-xs font-semibold transition-colors border border-yellow-400/20">
                ⏳ Cancel Request
              </button>
            ) : friendStatus === 'pending_received' ? (
              <button onClick={acceptFriend} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors">
                <Heart className="w-3.5 h-3.5" /> Accept
              </button>
            ) : (
              <button onClick={sendFriendRequest} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors">
                <Heart className="w-3.5 h-3.5" /> Add Friend
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors" title="More options">
                <MoreVertical className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full mt-1 w-48 bg-[#1a1d23] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
                    <button 
                      onClick={async () => { 
                        if (isBlocked) {
                          await base44.entities.BlockedUser.filter({ user_email: user.email, blocked_email: targetEmail }).then(r => {
                            if (r[0]) base44.entities.BlockedUser.delete(r[0].id);
                          });
                          setIsBlocked(false);
                        } else {
                          await base44.entities.BlockedUser.create({ user_email: user.email, blocked_email: targetEmail, blocked_name: displayName, reason: 'block' });
                          setIsBlocked(true);
                        }
                        window.dispatchEvent(new CustomEvent('blockStatusChanged', { detail: { blockedEmail: targetEmail, isBlocked: !isBlocked, isMuted: false } }));
                        setShowMenu(false); 
                      }} 
                      className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      {isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                    <button 
                      onClick={async () => { 
                        if (isMuted) {
                          await base44.entities.BlockedUser.filter({ user_email: user.email, blocked_email: targetEmail }).then(r => {
                            if (r[0]) base44.entities.BlockedUser.delete(r[0].id);
                          });
                          setIsMuted(false);
                        } else {
                          await base44.entities.BlockedUser.create({ user_email: user.email, blocked_email: targetEmail, blocked_name: displayName, reason: 'mute' });
                          setIsMuted(true);
                        }
                        window.dispatchEvent(new CustomEvent('blockStatusChanged', { detail: { blockedEmail: targetEmail, isBlocked: false, isMuted: !isMuted } }));
                        setShowMenu(false); 
                      }} 
                      className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors border-t border-white/5"
                    >
                      {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                    </button>
                    <button onClick={() => { alert('User reported'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5">Report User</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <button onClick={() => setShowProfileModal(true)} className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors border border-white/10">
            View Full Profile
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}