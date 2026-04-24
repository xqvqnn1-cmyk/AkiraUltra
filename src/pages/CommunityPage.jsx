import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Users, Bell, Settings, ChevronDown, Send,
  Plus, Check, X, MessageCircle, AtSign, UserPlus, Tv, Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { Avatar } from '../components/community/UserProfilePopup.jsx';
import ChatMessage from '../components/community/ChatMessage.jsx';
import NotificationPanel from '../components/community/NotificationPanel.jsx';
import SelfProfilePopup from '../components/community/SelfProfilePopup.jsx';
import { format } from 'date-fns';

const CHANNELS = [
  { id: 'general', label: 'general' },
  { id: 'recommendations', label: 'recommendations' },
  { id: 'spoilers', label: 'spoilers' },
  { id: 'seasonal', label: 'seasonal' },
  { id: 'off-topic', label: 'off-topic' },
];

const STATUS_COLORS = {
  online: 'bg-green-500',
  watching: 'bg-violet-500',
  idle: 'bg-yellow-400',
  offline: 'bg-gray-600',
};

function groupMessages(msgs) {
  return msgs.map((msg, i) => {
    const prev = msgs[i - 1];
    const grouped =
      prev &&
      prev.user_email === msg.user_email &&
      new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
    return { ...msg, grouped };
  });
}

function StatusDot({ status, border = 'border-[#111118]' }) {
  return <span className={`w-3 h-3 rounded-full border-2 ${border} ${STATUS_COLORS[status] || 'bg-gray-600'}`} />;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // view: 'channel' | 'friends' | 'dm'
  const [view, setView] = useState('channel');
  const [activeChannel, setActiveChannel] = useState('general');
  const [friendsTab, setFriendsTab] = useState('online');
  const [dmTarget, setDmTarget] = useState(null); // { email, name }
  const [input, setInput] = useState('');
  const [dmInput, setDmInput] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [recentDMs, setRecentDMs] = useState([]); // list of { email, name }
  const [showSelfPopup, setShowSelfPopup] = useState(false);

  const endRef = useRef(null);
  const dmEndRef = useRef(null);
  const inputRef = useRef(null);
  const notifsRef = useRef(null);

  /* ── Profiles ── */
  useEffect(() => {
    base44.entities.UserProfile.list('-updated_date', 100).then(setProfiles);
    const iv = setInterval(() => base44.entities.UserProfile.list('-updated_date', 100).then(setProfiles), 15000);
    return () => clearInterval(iv);
  }, []);

  /* ── Status ── */
  useEffect(() => {
    if (!user) return;
    const update = async (status) => {
      const ex = await base44.entities.UserProfile.filter({ user_email: user.email }, null, 1);
      if (ex[0]) await base44.entities.UserProfile.update(ex[0].id, { status });
    };
    update('online');
    const onVis = () => update(document.hidden ? 'idle' : 'online');
    window.addEventListener('beforeunload', () => update('offline'));
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      update('offline');
    };
  }, [user]);

  /* ── openDM global event ── */
  useEffect(() => {
    const h = (e) => openDM(e.detail.email, e.detail.name);
    window.addEventListener('openDM', h);
    return () => window.removeEventListener('openDM', h);
  }, []);

  /* ── Close notifs on outside click ── */
  useEffect(() => {
    const h = (e) => { if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const openDM = (email, name) => {
    setDmTarget({ email, name });
    setView('dm');
    setRecentDMs(prev => {
      const filtered = prev.filter(d => d.email !== email);
      return [{ email, name }, ...filtered].slice(0, 10);
    });
  };

  /* ── Channel messages ── */
  const { data: messages = [] } = useQuery({
    queryKey: ['chat', activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter({ channel: activeChannel }, 'created_date', 80),
    refetchInterval: 3000,
    enabled: view === 'channel',
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const mentions = (content.match(/@(\w[\w\d_-]*)/g) || []).map(m => m.slice(1));
      return base44.entities.ChatMessage.create({
        content, channel: activeChannel,
        user_name: user.full_name || user.email.split('@')[0],
        user_email: user.email, mentions,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chat', activeChannel] }); setInput(''); },
  });

  /* ── DM messages ── */
  const { data: dmMessages = [] } = useQuery({
    queryKey: ['dm', user?.email, dmTarget?.email],
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        base44.entities.DirectMessage.filter({ from_email: user.email, to_email: dmTarget.email }, 'created_date', 80),
        base44.entities.DirectMessage.filter({ from_email: dmTarget.email, to_email: user.email }, 'created_date', 80),
      ]);
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    refetchInterval: 3000,
    enabled: view === 'dm' && !!dmTarget && !!user,
  });

  useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dmMessages.length]);

  // mark received as read
  useEffect(() => {
    if (!dmTarget) return;
    dmMessages.filter(m => m.from_email === dmTarget.email && !m.read)
      .forEach(m => base44.entities.DirectMessage.update(m.id, { read: true }));
  }, [dmMessages, dmTarget]);

  const sendDMMutation = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.DirectMessage.create({
        from_email: user.email,
        from_name: user.full_name || user.email.split('@')[0],
        to_email: dmTarget.email, content, read: false,
      });
      await base44.entities.Notification.create({
        user_email: dmTarget.email, type: 'dm',
        title: `${user.full_name || user.email.split('@')[0]} sent you a message`,
        body: content.slice(0, 80),
        from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false,
      });
      return msg;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dm', user?.email, dmTarget?.email] }); setDmInput(''); },
  });

  /* ── Notifications ── */
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 30),
    enabled: !!user, refetchInterval: 10000,
  });
  const unreadCount = notifications.filter(n => !n.read).length;
  const markRead = async (id) => { await base44.entities.Notification.update(id, { read: true }); queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] }); };
  const markAllRead = async () => { await Promise.all(notifications.filter(n => !n.read).map(n => base44.entities.Notification.update(n.id, { read: true }))); queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] }); };

  /* ── Friends ── */
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
    enabled: !!user, refetchInterval: 15000,
  });

  const acceptFriend = async (req) => {
    await base44.entities.FriendRequest.update(req.id, { status: 'accepted' });
    await base44.entities.Notification.create({ user_email: req.from_email, type: 'friend_accepted', title: 'Friend Request Accepted', body: `${user.full_name || user.email.split('@')[0]} accepted your friend request`, from_email: user.email, from_name: user.full_name || user.email.split('@')[0], read: false });
    queryClient.invalidateQueries({ queryKey: ['friends', user?.email] });
  };
  const declineFriend = async (req) => { await base44.entities.FriendRequest.update(req.id, { status: 'declined' }); queryClient.invalidateQueries({ queryKey: ['friends', user?.email] }); };

  const friends = friendRequests.filter(r => r.status === 'accepted');
  const pending = friendRequests.filter(r => r.status === 'pending' && r.to_email === user?.email);
  const onlineFriends = friends.filter(r => {
    const email = r.from_email === user?.email ? r.to_email : r.from_email;
    const p = profiles.find(x => x.user_email === email);
    return p?.status === 'online' || p?.status === 'watching';
  });

  const myProfile = profiles.find(p => p.user_email === user?.email);
  const displayName = myProfile?.user_name || user?.full_name || user?.email?.split('@')[0] || 'You';

  const onlineProfiles = profiles.filter(p => p.status === 'online' || p.status === 'watching');
  const offlineProfiles = profiles.filter(p => p.status !== 'online' && p.status !== 'watching');
  const grouped = groupMessages(messages);

  const handleSend = (e) => { e.preventDefault(); if (!input.trim() || !user || sendMutation.isPending) return; sendMutation.mutate(input.trim()); };
  const handleSendDM = (e) => { e.preventDefault(); if (!dmInput.trim() || !user || sendDMMutation.isPending) return; sendDMMutation.mutate(dmInput.trim()); };

  const handleStatusChange = async (status) => {
    const ex = await base44.entities.UserProfile.filter({ user_email: user.email }, null, 1);
    if (ex[0]) {
      await base44.entities.UserProfile.update(ex[0].id, { status });
      setProfiles(prev => prev.map(p => p.user_email === user.email ? { ...p, status } : p));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0b10] text-white overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden pt-16">

        {/* ══ LEFT SIDEBAR (240px) ══ */}
        <div className="w-60 flex-shrink-0 bg-[#111118] flex flex-col border-r border-white/5">
          {/* Header */}
          <div className="h-12 flex items-center px-4 border-b border-white/5 shadow-md flex-shrink-0">
            <span className="flex-1 font-bold text-sm tracking-tight">AkiraPlus</span>
          </div>

          <div className="flex-1 overflow-y-auto py-2 scrollbar-hide space-y-0.5">

            {/* Friends */}
            <div className="px-2">
              <button
                onClick={() => setView('friends')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${view === 'friends' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Friends</span>
                {pending.length > 0 && <span className="w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">{pending.length}</span>}
              </button>
            </div>

            {/* Direct Messages */}
            <div className="px-2 mt-3">
              <div className="flex items-center justify-between px-1.5 mb-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Direct Messages</p>
              </div>
              {recentDMs.length === 0 ? (
                <p className="text-xs text-gray-700 px-2 py-1 italic">No recent DMs</p>
              ) : (
                recentDMs.map(dm => {
                  const dmProfile = profiles.find(p => p.user_email === dm.email);
                  return (
                    <button
                      key={dm.email}
                      onClick={() => openDM(dm.email, dm.name)}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors group ${view === 'dm' && dmTarget?.email === dm.email ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={dm.name} email={dm.email} avatarUrl={dmProfile?.avatar_url} size="sm" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111118] ${STATUS_COLORS[dmProfile?.status || 'offline']}`} />
                      </div>
                      <span className="flex-1 text-left truncate">{dm.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); setRecentDMs(prev => prev.filter(d => d.email !== dm.email)); if (dmTarget?.email === dm.email) setView('friends'); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white text-gray-600 transition-all"
                      ><X className="w-3 h-3" /></button>
                    </button>
                  );
                })
              )}
            </div>

            {/* Text Channels */}
            <div className="px-2 mt-3">
              <div className="flex items-center justify-between px-1.5 mb-1 group/ch">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Text Channels</p>
              </div>
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { setActiveChannel(ch.id); setView('channel'); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${view === 'channel' && activeChannel === ch.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User bar */}
          <div className="h-14 bg-[#0d0d15] border-t border-white/5 flex items-center px-2 gap-2 flex-shrink-0 relative">
            <AnimatePresence>
              {showSelfPopup && (
                <SelfProfilePopup
                  profile={myProfile}
                  onClose={() => setShowSelfPopup(false)}
                  onStatusChange={handleStatusChange}
                />
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowSelfPopup(v => !v)}
              className="flex items-center gap-2 flex-1 min-w-0 hover:bg-white/5 rounded-lg px-1 py-1 transition-colors cursor-pointer"
            >
              <div className="relative flex-shrink-0">
                <Avatar name={displayName} email={user?.email} avatarUrl={myProfile?.avatar_url} size="sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d15] ${STATUS_COLORS[myProfile?.status || 'offline']}`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-gray-500 truncate capitalize">{myProfile?.status || 'offline'}</p>
              </div>
            </button>
            <div className="flex items-center gap-0.5">
              <div className="relative" ref={notifsRef}>
                <button onClick={() => setShowNotifs(v => !v)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white border border-[#0d0d15]">{unreadCount}</span>}
                </button>
                <AnimatePresence>
                  {showNotifs && <NotificationPanel notifications={notifications} onClose={() => setShowNotifs(false)} onMarkRead={markRead} onMarkAllRead={markAllRead} />}
                </AnimatePresence>
              </div>
              <Link to="/settings" className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"><Settings className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div className="flex-1 flex min-w-0 overflow-hidden">

          {/* Channel view */}
          {view === 'channel' && (
            <>
              <div className="flex-1 flex flex-col min-w-0 bg-[#141420]">
                {/* Topbar */}
                <div className="h-12 border-b border-white/5 flex items-center px-4 gap-3 flex-shrink-0">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-white text-sm">{activeChannel}</span>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <span className="text-gray-500 text-xs hidden md:block">Community chat for #{activeChannel}</span>
                  <div className="ml-auto">
                    <button onClick={() => setShowMemberList(v => !v)} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${showMemberList ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
                  {grouped.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4"><Hash className="w-8 h-8 text-gray-600" /></div>
                      <p className="text-white font-bold text-lg">Welcome to #{activeChannel}!</p>
                      <p className="text-gray-500 text-sm mt-1">This is the beginning of the #{activeChannel} channel.</p>
                    </div>
                  )}
                  {grouped.map(msg => (
                    <ChatMessage key={msg.id} msg={msg} currentUser={user} profiles={profiles}
                      onMention={name => { setInput(v => v + `@${name} `); inputRef.current?.focus(); }} />
                  ))}
                  <div ref={endRef} />
                </div>
                {/* Input */}
                <div className="px-4 pb-4 pt-1 flex-shrink-0">
                  {user ? (
                    <form onSubmit={handleSend}>
                      <div className="flex items-center gap-2 bg-[#1e1e2e] rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-violet-500/30 transition-all">
                        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                          placeholder={`Message #${activeChannel}`}
                          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} />
                        <button type="submit" disabled={!input.trim() || sendMutation.isPending} className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors flex-shrink-0">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-[#1e1e2e] rounded-xl px-4 py-3 text-center text-sm text-gray-500">
                      <Link to="/signin" className="text-violet-400 hover:text-violet-300 font-semibold">Sign in</Link> to join the conversation
                    </div>
                  )}
                </div>
              </div>

              {/* Right member list */}
              <AnimatePresence>
                {showMemberList && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="flex-shrink-0 bg-[#111118] border-l border-white/5 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
                      {onlineProfiles.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-1 mb-2">Online — {onlineProfiles.length}</p>
                          <div className="space-y-0.5">
                            {onlineProfiles.map(p => <MemberItem key={p.user_email} profile={p} currentUser={user} onDM={() => openDM(p.user_email, p.user_name || p.user_email.split('@')[0])} />)}
                          </div>
                        </div>
                      )}
                      {offlineProfiles.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-1 mb-2">Offline — {offlineProfiles.length}</p>
                          <div className="space-y-0.5 opacity-50">
                            {offlineProfiles.slice(0, 20).map(p => <MemberItem key={p.user_email} profile={p} currentUser={user} onDM={() => openDM(p.user_email, p.user_name || p.user_email.split('@')[0])} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* DM view — full inline like Discord */}
          {view === 'dm' && dmTarget && (
            <div className="flex-1 flex flex-col min-w-0 bg-[#141420]">
              {/* DM topbar */}
              <div className="h-12 border-b border-white/5 flex items-center px-4 gap-3 flex-shrink-0">
                {(() => { const p = profiles.find(x => x.user_email === dmTarget.email); return (
                  <div className="relative flex-shrink-0">
                    <Avatar name={dmTarget.name} email={dmTarget.email} avatarUrl={p?.avatar_url} size="sm" />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#141420] ${STATUS_COLORS[p?.status || 'offline']}`} />
                  </div>
                ); })()}
                <span className="font-bold text-white text-sm">{dmTarget.name}</span>
                <span className="text-gray-600 text-xs">· Direct Message</span>
              </div>

              {/* DM Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
                {dmMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    {(() => { const p = profiles.find(x => x.user_email === dmTarget.email); return (
                      <>
                        <div className="w-20 h-20 rounded-full mb-4 overflow-hidden ring-4 ring-white/5">
                          <Avatar name={dmTarget.name} email={dmTarget.email} avatarUrl={p?.avatar_url} size="xl" />
                        </div>
                        <p className="text-white font-bold text-xl mb-1">{dmTarget.name}</p>
                        <p className="text-gray-500 text-sm">This is the beginning of your direct message history with <span className="text-gray-300 font-semibold">{dmTarget.name}</span>.</p>
                      </>
                    ); })()}
                  </div>
                )}
                {dmMessages.map((msg, i) => {
                  const isMine = msg.from_email === user.email;
                  const prev = dmMessages[i - 1];
                  const grouped = prev && prev.from_email === msg.from_email && new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
                  const senderProfile = profiles.find(p => p.user_email === msg.from_email);
                  const senderName = isMine ? displayName : dmTarget.name;
                  return (
                    <div key={msg.id} className={`flex items-start gap-3 group hover:bg-white/[0.02] px-2 py-0.5 rounded-lg ${grouped ? 'pl-14' : 'pt-3'}`}>
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
                })}
                <div ref={dmEndRef} />
              </div>

              {/* DM Input */}
              <div className="px-4 pb-4 pt-1 flex-shrink-0">
                {user ? (
                  <form onSubmit={handleSendDM}>
                    <div className="flex items-center gap-2 bg-[#1e1e2e] rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-violet-500/30 transition-all">
                      <input value={dmInput} onChange={e => setDmInput(e.target.value)}
                        placeholder={`Message ${dmTarget.name}`}
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDM(e); } }} autoFocus />
                      <button type="submit" disabled={!dmInput.trim() || sendDMMutation.isPending} className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-[#1e1e2e] rounded-xl px-4 py-3 text-center text-sm text-gray-500">
                    <Link to="/signin" className="text-violet-400 hover:text-violet-300 font-semibold">Sign in</Link> to send messages
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Friends view */}
          {view === 'friends' && (
            <div className="flex-1 flex flex-col min-w-0 bg-[#141420]">
              <div className="h-12 border-b border-white/5 flex items-center px-4 gap-3 flex-shrink-0">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-white text-sm">Friends</span>
                <div className="w-px h-5 bg-white/10 mx-1" />
                <div className="flex items-center gap-1">
                  {['online', 'all', 'pending'].map(tab => (
                    <button key={tab} onClick={() => setFriendsTab(tab)}
                      className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${friendsTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`}>
                      {tab}
                      {tab === 'pending' && pending.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 rounded-full text-[10px] font-bold">{pending.length}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {friendsTab === 'pending' ? (
                  pending.length === 0
                    ? <EmptyState icon={<UserPlus className="w-10 h-10 text-gray-600" />} title="No pending requests" sub="Friend requests will appear here." />
                    : (
                      <FriendSection title={`Pending — ${pending.length}`}>
                        {pending.map(req => (
                          <FriendRow key={req.id} email={req.from_email} name={req.from_name || req.from_email.split('@')[0]} profile={profiles.find(p => p.user_email === req.from_email)} sub="Incoming Friend Request">
                            <button onClick={() => acceptFriend(req)} className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/20 transition-colors"><Check className="w-4 h-4" /></button>
                            <button onClick={() => declineFriend(req)} className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition-colors"><X className="w-4 h-4" /></button>
                          </FriendRow>
                        ))}
                      </FriendSection>
                    )
                ) : (() => {
                  const list = friendsTab === 'online' ? onlineFriends : friends;
                  if (list.length === 0) return <EmptyState icon={<Users className="w-10 h-10 text-gray-600" />} title={friendsTab === 'online' ? 'No friends online' : 'No friends yet'} sub={friendsTab === 'online' ? 'Friends will appear here when online.' : 'Add friends to get started!'} />;
                  return (
                    <FriendSection title={`${friendsTab === 'online' ? 'Online' : 'All'} — ${list.length}`}>
                      {list.map(req => {
                        const email = req.from_email === user?.email ? req.to_email : req.from_email;
                        const name = req.from_email === user?.email ? (req.to_name || email.split('@')[0]) : (req.from_name || email.split('@')[0]);
                        const profile = profiles.find(p => p.user_email === email);
                        return (
                          <FriendRow key={req.id} email={email} name={name} profile={profile}
                            sub={profile?.status === 'watching' ? `Watching ${profile.currently_watching || '...'}` : profile?.status || 'offline'}>
                            <button onClick={() => openDM(email, name)} className="p-2 rounded-lg bg-white/5 hover:bg-violet-600/20 text-gray-400 hover:text-violet-400 transition-colors border border-white/5">
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </FriendRow>
                        );
                      })}
                    </FriendSection>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function MemberItem({ profile, currentUser, onDM }) {
  const name = profile.user_name || profile.user_email?.split('@')[0] || 'User';
  const isSelf = currentUser?.email === profile.user_email;
  return (
    <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-white/5 cursor-pointer group transition-colors" onClick={!isSelf ? onDM : undefined}>
      <div className="relative flex-shrink-0">
        <Avatar name={name} email={profile.user_email} avatarUrl={profile.avatar_url} size="sm" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111118] ${STATUS_COLORS[profile.status || 'offline']}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-300 group-hover:text-white truncate transition-colors">{name}</p>
        {profile.status === 'watching' && profile.currently_watching && (
          <p className="text-[10px] text-violet-400 truncate flex items-center gap-1"><Tv className="w-2.5 h-2.5" />{profile.currently_watching}</p>
        )}
      </div>
    </div>
  );
}

function FriendRow({ email, name, profile, sub, children }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5">
      <div className="relative flex-shrink-0">
        <Avatar name={name} email={email} avatarUrl={profile?.avatar_url} size="md" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#141420] ${STATUS_COLORS[profile?.status || 'offline']}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{name}</p>
        <p className="text-xs text-gray-500 capitalize truncate">{sub}</p>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{children}</div>
    </div>
  );
}

function FriendSection({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3 px-3">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">{icon}</div>
      <p className="text-white font-bold text-lg mb-1">{title}</p>
      <p className="text-gray-500 text-sm">{sub}</p>
    </div>
  );
}