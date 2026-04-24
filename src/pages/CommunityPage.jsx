import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Users, MessageCircle, Bell, Settings, ChevronDown, Send, AtSign, Smile, Plus, UserPlus, Check, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { Avatar, StatusDot } from '../components/community/UserProfilePopup.jsx';
import ChatMessage from '../components/community/ChatMessage.jsx';
import DMPanel from '../components/community/DMPanel.jsx';
import NotificationPanel from '../components/community/NotificationPanel.jsx';
import { AnimatePresence as AP } from 'framer-motion';

const CHANNELS = [
  { id: 'general', label: 'general', icon: Hash },
  { id: 'recommendations', label: 'recommendations', icon: Hash },
  { id: 'spoilers', label: 'spoilers', icon: Hash },
  { id: 'seasonal', label: 'seasonal', icon: Hash },
  { id: 'off-topic', label: 'off-topic', icon: Hash },
];

function groupMessages(messages) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const grouped = prev &&
      prev.user_email === msg.user_email &&
      new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
    return { ...msg, grouped };
  });
}

export default function CommunityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState('general');
  const [view, setView] = useState('channels'); // 'channels' | 'friends'
  const [friendsTab, setFriendsTab] = useState('online'); // 'online' | 'all' | 'pending'
  const [input, setInput] = useState('');
  const [dmTarget, setDmTarget] = useState(null); // { email, name }
  const [showNotifs, setShowNotifs] = useState(false);
  const endRef = useRef(null);
  const notifsRef = useRef(null);
  const [profiles, setProfiles] = useState([]);

  // Load all user profiles for avatars / status
  useEffect(() => {
    base44.entities.UserProfile.list('-updated_date', 100).then(setProfiles);
    const interval = setInterval(() => {
      base44.entities.UserProfile.list('-updated_date', 100).then(setProfiles);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Realtime status update
  useEffect(() => {
    if (!user) return;
    const updateStatus = async (status) => {
      const existing = await base44.entities.UserProfile.filter({ user_email: user.email }, null, 1);
      if (existing[0]) {
        await base44.entities.UserProfile.update(existing[0].id, { status });
      }
    };
    updateStatus('online');
    const onVisibility = () => updateStatus(document.hidden ? 'idle' : 'online');
    const onUnload = () => updateStatus('offline');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      updateStatus('offline');
    };
  }, [user]);

  // Listen for openDM events from chat messages
  useEffect(() => {
    const handler = (e) => setDmTarget({ email: e.detail.email, name: e.detail.name });
    window.addEventListener('openDM', handler);
    return () => window.removeEventListener('openDM', handler);
  }, []);

  // Close notifs on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Messages
  const { data: messages = [] } = useQuery({
    queryKey: ['chat', activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter({ channel: activeChannel }, 'created_date', 60),
    refetchInterval: 3000,
    enabled: view === 'channels',
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const mentions = (content.match(/@(\w[\w\d_-]*)/g) || []).map(m => m.slice(1));
      return base44.entities.ChatMessage.create({
        content,
        channel: activeChannel,
        user_name: user.full_name || user.email.split('@')[0],
        user_email: user.email,
        mentions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', activeChannel] });
      setInput('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !user || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
  };

  // Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 30),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
  };
  const markAllRead = async () => {
    await Promise.all(notifications.filter(n => !n.read).map(n => base44.entities.Notification.update(n.id, { read: true })));
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
  };

  // Friends
  const { data: friendRequests = [] } = useQuery({
    queryKey: ['friends', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const [sent, received] = await Promise.all([
        base44.entities.FriendRequest.filter({ from_email: user.email }),
        base44.entities.FriendRequest.filter({ to_email: user.email }),
      ]);
      return [...sent, ...received];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const acceptFriend = async (req) => {
    await base44.entities.FriendRequest.update(req.id, { status: 'accepted' });
    await base44.entities.Notification.create({
      user_email: req.from_email, type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${user.full_name || user.email.split('@')[0]} accepted your friend request`,
      from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false,
    });
    queryClient.invalidateQueries({ queryKey: ['friends', user?.email] });
  };

  const declineFriend = async (req) => {
    await base44.entities.FriendRequest.update(req.id, { status: 'declined' });
    queryClient.invalidateQueries({ queryKey: ['friends', user?.email] });
  };

  const friends = friendRequests.filter(r => r.status === 'accepted');
  const pending = friendRequests.filter(r => r.status === 'pending' && r.to_email === user?.email);
  const onlineFriends = friends.filter(r => {
    const email = r.from_email === user?.email ? r.to_email : r.from_email;
    const profile = profiles.find(p => p.user_email === email);
    return profile?.status === 'online' || profile?.status === 'watching';
  });

  const myProfile = profiles.find(p => p.user_email === user?.email);
  const displayName = myProfile?.user_name || user?.full_name || user?.email?.split('@')[0] || 'You';

  const grouped = groupMessages(messages);

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-60 flex-shrink-0 bg-[#0d0d14] border-r border-white/5 flex flex-col">
        {/* Server Header */}
        <div className="h-14 flex items-center px-4 border-b border-white/5 font-bold text-sm cursor-pointer hover:bg-white/5 transition-colors">
          <span className="flex-1">AkiraPlus Community</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {/* Friends */}
          <button
            onClick={() => setView('friends')}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'friends' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> Friends
            {pending.length > 0 && <span className="ml-auto w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">{pending.length}</span>}
          </button>

          {/* Channels */}
          <div className="mt-4 mb-1 px-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Text Channels</p>
          </div>
          {CHANNELS.map(ch => {
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch.id); setView('channels'); }}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${view === 'channels' && activeChannel === ch.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
              >
                <Icon className="w-4 h-4" />
                {ch.label}
              </button>
            );
          })}

          {/* Online members */}
          <div className="mt-4 mb-1 px-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Online — {profiles.filter(p => p.status === 'online' || p.status === 'watching').length}</p>
          </div>
          {profiles.filter(p => p.status === 'online' || p.status === 'watching').slice(0, 10).map(p => (
            <div key={p.user_email} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setDmTarget({ email: p.user_email, name: p.user_name || p.user_email.split('@')[0] })}>
              <div className="relative">
                <Avatar name={p.user_name || p.user_email} email={p.user_email} avatarUrl={p.avatar_url} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5"><StatusDot status={p.status} border="border-[#0d0d14]" /></div>
              </div>
              <span className="text-xs text-gray-400 truncate">{p.user_name || p.user_email.split('@')[0]}</span>
            </div>
          ))}
        </div>

        {/* User bar */}
        <div className="h-14 border-t border-white/5 bg-[#0b0b12] flex items-center px-3 gap-2">
          <div className="relative flex-shrink-0">
            <Avatar name={displayName} email={user?.email} avatarUrl={myProfile?.avatar_url} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5"><StatusDot status={myProfile?.status || 'offline'} border="border-[#0b0b12]" /></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-gray-600 capitalize">{myProfile?.status || 'offline'}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={notifsRef}>
              <button onClick={() => setShowNotifs(v => !v)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors relative">
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">{unreadCount}</span>}
              </button>
              <AnimatePresence>
                {showNotifs && (
                  <NotificationPanel
                    notifications={notifications}
                    onClose={() => setShowNotifs(false)}
                    onMarkRead={markRead}
                    onMarkAllRead={markAllRead}
                  />
                )}
              </AnimatePresence>
            </div>
            <Link to="/settings" className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {view === 'channels' ? (
          <>
            {/* Channel Header */}
            <div className="h-14 border-b border-white/5 flex items-center px-5 gap-3 bg-[#0f0f18] flex-shrink-0">
              <Hash className="w-5 h-5 text-gray-500" />
              <span className="font-bold text-white">{activeChannel}</span>
              <span className="text-gray-600 text-sm hidden md:block">·</span>
              <span className="text-gray-500 text-sm hidden md:block">Welcome to #{activeChannel}!</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
              {grouped.map(msg => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  currentUser={user}
                  profiles={profiles}
                  onMention={(name) => setInput(v => v + `@${name} `)}
                />
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            {user ? (
              <form onSubmit={handleSend} className="px-4 pb-4 pt-1 flex-shrink-0">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-violet-500/40 transition-colors">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={`Message #${activeChannel}`}
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  />
                  <button type="submit" disabled={!input.trim() || sendMutation.isPending} className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-4 pb-4 pt-1 flex-shrink-0">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-sm text-gray-500">
                  <Link to="/signin" className="text-violet-400 hover:text-violet-300">Sign in</Link> to chat
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Friends Header */}
            <div className="h-14 border-b border-white/5 flex items-center px-5 gap-4 bg-[#0f0f18] flex-shrink-0">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="font-bold text-white">Friends</span>
              <div className="flex items-center gap-1 ml-2">
                {['online', 'all', 'pending'].map(tab => (
                  <button key={tab} onClick={() => setFriendsTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${friendsTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    {tab}
                    {tab === 'pending' && pending.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 rounded-full text-[10px] font-bold">{pending.length}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto p-4">
              {friendsTab === 'pending' ? (
                pending.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">No pending requests</div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Incoming Requests — {pending.length}</p>
                    {pending.map(req => (
                      <div key={req.id} className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/5 rounded-xl border border-white/5 transition-colors">
                        <Avatar name={req.from_name || req.from_email} email={req.from_email} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm">{req.from_name || req.from_email.split('@')[0]}</p>
                          <p className="text-xs text-gray-500">Incoming Friend Request</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => acceptFriend(req)} className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/20 transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => declineFriend(req)} className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                (() => {
                  const list = friendsTab === 'online' ? onlineFriends : friends;
                  if (list.length === 0) return <div className="text-center py-16 text-gray-600">{friendsTab === 'online' ? 'No friends online' : 'No friends yet'}</div>;
                  return (
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">{friendsTab === 'online' ? 'Online' : 'All Friends'} — {list.length}</p>
                      {list.map(req => {
                        const email = req.from_email === user?.email ? req.to_email : req.from_email;
                        const name = req.from_email === user?.email ? (req.to_name || email.split('@')[0]) : (req.from_name || email.split('@')[0]);
                        const profile = profiles.find(p => p.user_email === email);
                        return (
                          <div key={req.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group">
                            <div className="relative">
                              <Avatar name={name} email={email} avatarUrl={profile?.avatar_url} size="md" />
                              <div className="absolute -bottom-0.5 -right-0.5"><StatusDot status={profile?.status || 'offline'} border="border-[#0f0f18]" /></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm">{name}</p>
                              <p className="text-xs text-gray-500 capitalize">{profile?.status === 'watching' ? `Watching ${profile.currently_watching || '...'}` : profile?.status || 'offline'}</p>
                            </div>
                            <button onClick={() => setDmTarget({ email, name })} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-violet-600/20 text-gray-400 hover:text-violet-400 transition-all">
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </>
        )}
      </div>

      {/* DM Panel */}
      <AnimatePresence>
        {dmTarget && user && (
          <DMPanel
            key={dmTarget.email}
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