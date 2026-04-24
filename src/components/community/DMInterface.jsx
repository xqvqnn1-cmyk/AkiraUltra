import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Phone, Video, Search, MoreVertical, Plus, Heart, Share2, X, Calendar, Link as Link2, MessageCircle, Smile
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showReactionsFor, setShowReactionsFor] = useState(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

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
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch DM messages and reactions
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

  const { data: reactions = [] } = useQuery({
    queryKey: ['dmReactions', user?.email, targetEmail],
    queryFn: () => base44.entities.MessageReaction.filter({ message_type: 'dm' }, null, 200),
    refetchInterval: 3000,
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
    mutationFn: async (payload) => {
      const msg = await base44.entities.DirectMessage.create({
        from_email: user.email,
        from_name: user.full_name || user.email.split('@')[0],
        to_email: targetEmail,
        content: payload.content,
        read: false,
        image_url: payload.image_url,
        gif_url: payload.gif_url,
        reply_to_id: payload.reply_to_id,
        reply_to_user: payload.reply_to_user,
      });
      // Create notification
      await base44.entities.Notification.create({
        user_email: targetEmail,
        type: 'dm',
        title: `${user.full_name || user.email.split('@')[0]} sent you a message`,
        body: payload.content.slice(0, 80),
        from_email: user.email,
        from_name: user.full_name || user.email.split('@')[0],
        read: false,
      });
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm', user?.email, targetEmail] });
      setInput('');
      setReplyingTo(null);
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending || isBlocked) return;
    sendMutation.mutate({
      content: input.trim(),
      image_url: null,
      gif_url: null,
      reply_to_id: replyingTo?.id,
      reply_to_user: replyingTo?.from_name,
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !input.trim()) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadingFile(false);
    const isGif = file.type === 'image/gif';
    sendMutation.mutate({
      content: input.trim(),
      image_url: isGif ? null : file_url,
      gif_url: isGif ? file_url : null,
      reply_to_id: replyingTo?.id,
      reply_to_user: replyingTo?.from_name,
    });
  };

  const addReaction = async (msgId, emoji) => {
    await base44.entities.MessageReaction.create({
      message_id: msgId,
      message_type: 'dm',
      user_email: user?.email,
      emoji,
    });
    queryClient.invalidateQueries({ queryKey: ['dmReactions', user?.email, targetEmail] });
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
          <div ref={searchRef} className="relative">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" 
              title="Search messages"
            >
              <Search className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-[#1a1d23] border border-white/10 rounded-lg shadow-lg z-50"
                >
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none px-3 py-2.5 border-b border-white/5"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
          {(() => {
            const filteredMessages = searchQuery.trim() 
              ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
              : messages;
            
            return filteredMessages.length === 0 ? (
              searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-500 text-sm text-center">No messages match "<span className="text-gray-300 font-semibold">{searchQuery}</span>"</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="ring-4 ring-white/10 rounded-full mb-4 inline-block">
                    <Avatar name={displayName} email={targetEmail} avatarUrl={targetProfile?.avatar_url} size="xl" />
                  </div>
                  <p className="text-white font-bold text-lg mb-2">{displayName}</p>
                  <p className="text-gray-500 text-sm text-center max-w-xs">
                    This is the beginning of your direct message history with <span className="text-gray-300 font-semibold">{displayName}</span>
                  </p>
                </div>
              )
            ) : (
              filteredMessages.map((msg, i) => {
                const isMine = msg.from_email === user.email;
                const prev = filteredMessages[i - 1];
                const grouped = prev && prev.from_email === msg.from_email && new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
                const senderProfile = isMine ? profile : targetProfile;
                const senderName = isMine ? (user.full_name || user.email.split('@')[0]) : displayName;
                const msgReactions = reactions.filter(r => r.message_id === msg.id);
                const showReactions = showReactionsFor === msg.id;

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
                      {msg.reply_to_user && (
                        <div className="text-xs text-gray-500 mb-1 pl-2 border-l border-gray-600">
                          Replying to <span className="text-gray-300 font-semibold">{msg.reply_to_user}</span>
                        </div>
                      )}
                      <p className="text-gray-300 text-sm leading-relaxed break-words">{msg.content}</p>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="attachment" className="mt-2 max-w-xs rounded-lg max-h-48 object-cover" />
                      )}
                      {msg.gif_url && (
                        <img src={msg.gif_url} alt="gif" className="mt-2 max-w-xs rounded-lg max-h-48 object-cover" />
                      )}
                      {/* Reactions */}
                      {msgReactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(msgReactions.reduce((acc, r) => {
                            acc[r.emoji] = acc[r.emoji] || [];
                            acc[r.emoji].push(r);
                            return acc;
                          }, {})).map(([emoji, reacts]) => (
                            <div key={emoji} title={reacts.map(r => r.user_email.split('@')[0]).join(', ')} className="px-2 py-1 bg-white/10 rounded-full text-xs flex items-center gap-1 hover:bg-white/20 cursor-pointer transition-colors">
                              <span>{emoji}</span>
                              <span className="text-gray-400 text-xs">{reacts.length}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Reaction button */}
                      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative">
                          <button
                            onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                            className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-xs"
                          >
                            <Smile className="w-3 h-3" />
                          </button>
                          <AnimatePresence>
                            {showReactions && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute bottom-full mb-2 bg-[#1a1d23] border border-white/10 rounded-lg p-2 flex gap-1 z-50"
                              >
                                {['👍', '❤️', '😂', '🔥', '🎉', '😢'].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => { addReaction(msg.id, emoji); setShowReactionsFor(null); }}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-sm"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-xs"
                        >
                          ↩️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            );
          })()}
          <div ref={chatEndRef} />
        </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 pt-2 flex items-center justify-between bg-white/5 rounded-t-xl border-b border-white/5">
          <div className="text-xs text-gray-400">
            Replying to <span className="text-white font-semibold">{replyingTo.from_name}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

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
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,image/gif" className="hidden" onChange={handleFileUpload} />
                <button type="submit" disabled={!input.trim() || sendMutation.isPending || uploadingFile} className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors flex-shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || sendMutation.isPending || uploadingFile}
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