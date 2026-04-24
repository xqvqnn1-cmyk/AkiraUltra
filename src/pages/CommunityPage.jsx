import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Hash, Users, Tv, Bell, UserPlus, AtSign, MessageCircle, X } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '@/lib/AuthContext';
import ChatMessage from '../components/community/ChatMessage.jsx';
import NotificationPanel from '../components/community/NotificationPanel.jsx';
import DMPanel from '../components/community/DMPanel.jsx';
import { Avatar, StatusDot } from '../components/community/UserProfilePopup.jsx';
import UserProfilePopup from '../components/community/UserProfilePopup.jsx';

const CHANNELS = [
  { id: 'general', label: 'general', desc: 'General anime talk' },
  { id: 'recommendations', label: 'recommendations', desc: 'Find your next watch' },
  { id: 'seasonal', label: 'seasonal', desc: 'Currently airing anime' },
  { id: 'spoilers', label: 'spoilers', desc: '⚠️ Spoilers ahead' },
  { id: 'off-topic', label: 'off-topic', desc: 'Anything goes' },
];

export default function CommunityPage() {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState('general');
  const [input, setInput] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [dmTarget, setDmTarget] = useState(null); // { email, name }
  const [profileTarget, setProfileTarget] = useState(null); // { email, name, anchorEl }
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const notifRef = useRef(null);
  const bellRef = useRef(null);

  // Listen for DM open events from profile popups
  useEffect(() => {
    const handler = (e) => setDmTarget({ email: e.detail.email, name: e.detail.name });
    window.addEventListener('openDM', handler);
    return () => window.removeEventListener('openDM', handler);
  }, []);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter({ channel: activeChannel }, '-created_date', 100),
    refetchInterval: 2500,
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: () => base44.entities.UserProfile.list('-updated_date', 50),
    refetchInterval: 8000,
  });

  const onlineUsers = allProfiles.filter(u => u.status !== 'offline');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => user ? base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 30) : [],
    refetchInterval: 5000,
    enabled: !!user,
  });

  const { data: pendingFriendRequests = [] } = useQuery({
    queryKey: ['friend-requests', user?.email],
    queryFn: () => user ? base44.entities.FriendRequest.filter({ to_email: user.email, status: 'pending' }) : [],
    refetchInterval: 8000,
    enabled: !!user,
  });

  // Upsert own profile as online — run once on mount only
  const profileUpserted = useRef(false);
  useEffect(() => {
    if (!user || profileUpserted.current) return;
    profileUpserted.current = true;
    const upsertProfile = async () => {
      const existing = await base44.entities.UserProfile.filter({ user_email: user.email }, null, 1);
      const data = { user_email: user.email, user_name: user.full_name || user.email.split('@')[0], status: 'online' };
      if (existing.length > 0) {
        await base44.entities.UserProfile.update(existing[0].id, data);
      } else {
        await base44.entities.UserProfile.create(data);
      }
    };
    upsertProfile();
  }, [user]);

  // Sort oldest first
  const sortedMessages = [...messages].reverse();
  const groupedMessages = sortedMessages.reduce((acc, msg, i) => {
    const prev = sortedMessages[i - 1];
    const grouped = prev && prev.user_email === msg.user_email &&
      (new Date(msg.created_date) - new Date(prev.created_date)) < 5 * 60 * 1000;
    acc.push({ ...msg, grouped });
    return acc;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length]);

  const sendMessage = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.ChatMessage.create({
        content,
        channel: activeChannel,
        user_name: user?.full_name || user?.email?.split('@')[0] || 'Anonymous',
        user_email: user?.email || '',
      });
      // Detect @mentions and create notifications
      const mentions = content.match(/@(\w[\w\d_-]*)/g) || [];
      for (const mention of mentions) {
        const name = mention.slice(1);
        const target = allProfiles.find(p => (p.user_name || '').toLowerCase() === name.toLowerCase());
        if (target && target.user_email !== user.email) {
          await base44.entities.Notification.create({
            user_email: target.user_email,
            type: 'mention',
            title: `${user.full_name || user.email.split('@')[0]} mentioned you`,
            body: content.slice(0, 80),
            from_email: user.email,
            from_name: user.full_name,
            read: false,
          });
        }
      }
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', activeChannel] });
      setInput('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(input.trim());
  };

  const handleMention = (name) => {
    setInput(prev => prev + `@${name} `);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    // Mention autocomplete
    const match = val.match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      const suggestions = allProfiles
        .filter(p => p.user_email !== user?.email && (p.user_name || '').toLowerCase().startsWith(query))
        .slice(0, 5);
      setMentionSuggestions(suggestions);
    } else {
      setMentionSuggestions([]);
    }
  };

  const insertMention = (name) => {
    setInput(prev => prev.replace(/@\w*$/, `@${name} `));
    setMentionSuggestions([]);
    inputRef.current?.focus();
  };

  const markNotifRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter(n => !n.read).map(n => base44.entities.Notification.update(n.id, { read: true })));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const acceptFriendRequest = async (req) => {
    await base44.entities.FriendRequest.update(req.id, { status: 'accepted' });
    await base44.entities.Notification.create({ user_email: req.from_email, type: 'friend_accepted', title: 'Friend Request Accepted', body: `${user.full_name || user.email.split('@')[0]} accepted your friend request`, from_email: user.email, from_name: user.full_name, read: false });
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
  };

  const declineFriendRequest = async (req) => {
    await base44.entities.FriendRequest.update(req.id, { status: 'declined' });
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const currentChannel = CHANNELS.find(c => c.id === activeChannel);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Left Sidebar */}
        <div className="w-60 bg-[#0d0d14] border-r border-white/5 flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-black text-sm tracking-widest text-violet-400 uppercase">Community</h2>
              <p className="text-gray-600 text-xs mt-0.5">{onlineUsers.length} online</p>
            </div>
            {user && (
              <div className="flex items-center gap-1.5">
                {/* Friend Requests */}
                <div className="relative">
                  <button
                    onClick={() => setShowFriendRequests(v => !v)}
                    className="relative p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    {pendingFriendRequests.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-500 text-white text-[8px] flex items-center justify-center font-bold">
                        {pendingFriendRequests.length}
                      </span>
                    )}
                  </button>
                </div>
                {/* Notifications */}
                <div className="relative">
                  <button
                    ref={bellRef}
                    onClick={() => setShowNotifications(v => !v)}
                    className="relative p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotifications && (
                      <div ref={notifRef} className="absolute left-0 top-full z-50" style={{ width: 320 }}>
                        <NotificationPanel
                          notifications={notifications}
                          onClose={() => setShowNotifications(false)}
                          onMarkRead={markNotifRead}
                          onMarkAllRead={markAllRead}
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Friend Requests Panel */}
          <AnimatePresence>
            {showFriendRequests && pendingFriendRequests.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-white/5 overflow-hidden">
                <div className="p-3">
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">Friend Requests</p>
                  {pendingFriendRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-2 mb-2">
                      <Avatar name={req.from_name} email={req.from_email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{req.from_name || req.from_email.split('@')[0]}</p>
                      </div>
                      <button onClick={() => acceptFriendRequest(req)} className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-green-400/10 transition-colors" title="Accept">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => declineFriendRequest(req)} className="text-gray-600 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors" title="Decline">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Channels */}
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 py-2">Text Channels</p>
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 text-left ${activeChannel === ch.id ? 'bg-violet-600/20 text-violet-300 font-semibold' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
              >
                <Hash className="w-4 h-4 flex-shrink-0" />
                {ch.label}
              </button>
            ))}

            {/* Online Members */}
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 py-2 mt-4">
              Online — {onlineUsers.length}
            </p>
            {onlineUsers.map(u => (
              <button
                key={u.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left relative"
                onClick={() => setProfileTarget({ email: u.user_email, name: u.user_name || u.user_email.split('@')[0] })}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={u.user_name} email={u.user_email} avatarUrl={u.avatar_url} size="sm" />
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={u.status} border="border-[#0d0d14]" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-300 truncate">{u.user_name || u.user_email?.split('@')[0]}</p>
                  {u.status === 'watching' && u.currently_watching && (
                    <p className="text-[10px] text-violet-400 truncate flex items-center gap-1">
                      <Tv className="w-2.5 h-2.5 flex-shrink-0" /> {u.currently_watching}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Own user bar */}
          {user && (
            <button
              onClick={() => setProfileTarget({ email: user.email, name: user.full_name || user.email.split('@')[0] })}
              className="p-3 border-t border-white/5 flex items-center gap-2 hover:bg-white/5 transition-colors w-full text-left"
            >
              <div className="relative">
                <Avatar name={user.full_name} email={user.email} avatarUrl={allProfiles.find(p => p.user_email === user.email)?.avatar_url} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#0d0d14]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.full_name || user.email.split('@')[0]}</p>
                <p className="text-[10px] text-green-400 truncate">● Online</p>
              </div>
            </button>
          )}
        </div>

        {/* Main Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel Header */}
          <div className="h-12 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur flex items-center px-4 gap-3 flex-shrink-0">
            <Hash className="w-5 h-5 text-gray-500" />
            <span className="font-bold text-white">{currentChannel?.label}</span>
            <span className="text-gray-600 text-sm hidden md:block">— {currentChannel?.desc}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
            {groupedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Hash className="w-7 h-7 text-violet-400" />
                </div>
                <p className="text-white font-bold text-lg">Welcome to #{currentChannel?.label}!</p>
                <p className="text-gray-500 text-sm mt-1">Be the first to say something!</p>
              </div>
            )}
            {groupedMessages.map(msg => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                currentUser={user}
                onMention={handleMention}
                profiles={allProfiles}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 flex-shrink-0 relative">
            {/* Mention suggestions */}
            <AnimatePresence>
              {mentionSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full mb-2 left-4 right-4 bg-[#111118] border border-white/10 rounded-xl overflow-hidden shadow-xl"
                >
                  {mentionSuggestions.map(p => (
                    <button
                      key={p.id}
                      onClick={() => insertMention(p.user_name)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-violet-600/20 transition-colors text-left"
                    >
                      <Avatar name={p.user_name} email={p.user_email} avatarUrl={p.avatar_url} size="sm" />
                      <span className="text-sm text-white">{p.user_name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!user ? (
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                <p className="text-gray-400 text-sm">
                  <a href="/signin" className="text-violet-400 hover:underline font-semibold">Sign in</a> to chat in #{currentChannel?.label}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex items-center gap-3 bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 transition-colors">
                <AtSign className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                    if (e.key === 'Escape') setMentionSuggestions([]);
                  }}
                  placeholder={`Message #${currentChannel?.label} — use @name to mention`}
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                />
                <button type="submit" disabled={!input.trim() || sendMessage.isPending} className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="hidden xl:flex w-56 bg-[#0d0d14] border-l border-white/5 flex-col flex-shrink-0">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Members</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {['watching', 'online'].map(statusFilter => {
              const group = onlineUsers.filter(u => u.status === statusFilter);
              if (!group.length) return null;
              return (
                <div key={statusFilter}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 ${statusFilter === 'watching' ? 'text-violet-400' : 'text-green-500'}`}>
                    {statusFilter === 'watching' ? 'Watching Now' : 'Online'} — {group.length}
                  </p>
                  {group.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setProfileTarget({ email: u.user_email, name: u.user_name || u.user_email.split('@')[0] })}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                    >
                      <div className="relative">
                        <Avatar name={u.user_name} email={u.user_email} avatarUrl={u.avatar_url} size="sm" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0d14] ${statusFilter === 'watching' ? 'bg-violet-400' : 'bg-green-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-300 truncate font-medium">{u.user_name || u.user_email?.split('@')[0]}</p>
                        {u.currently_watching && statusFilter === 'watching' && (
                          <p className="text-[9px] text-violet-400 truncate">{u.currently_watching}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Profile Popup (floating, centered) */}
      <AnimatePresence>
        {profileTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setProfileTarget(null)}>
            <div onClick={e => e.stopPropagation()} className="relative">
              <UserProfilePopup
                userEmail={profileTarget.email}
                userName={profileTarget.name}
                anchorRef={{ current: null }}
                onClose={() => setProfileTarget(null)}
                onDM={(email, name) => { setDmTarget({ email, name }); setProfileTarget(null); }}
                modal={true}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DM Panel */}
      <AnimatePresence>
        {dmTarget && user && (
          <DMPanel
            currentUser={user}
            targetEmail={dmTarget.email}
            targetName={dmTarget.name}
            onClose={() => setDmTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}