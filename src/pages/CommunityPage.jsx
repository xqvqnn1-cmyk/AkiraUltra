import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Send, Hash, Users, Tv, Circle } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '@/lib/AuthContext';

const CHANNELS = [
  { id: 'general', label: 'general', desc: 'General anime talk' },
  { id: 'recommendations', label: 'recommendations', desc: 'Find your next watch' },
  { id: 'seasonal', label: 'seasonal', desc: 'Currently airing anime' },
  { id: 'spoilers', label: 'spoilers', desc: '⚠️ Spoilers ahead' },
  { id: 'off-topic', label: 'off-topic', desc: 'Anything goes' },
];

const AVATAR_COLORS = [
  'from-violet-600 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-orange-500 to-red-600',
  'from-green-500 to-teal-600',
  'from-yellow-500 to-orange-600',
  'from-purple-600 to-indigo-600',
];

function getAvatarColor(email) {
  if (!email) return AVATAR_COLORS[0];
  const idx = email.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ name, email, size = 'md' }) {
  const color = getAvatarColor(email);
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {(name || email || 'A')[0].toUpperCase()}
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    online: 'bg-green-400',
    watching: 'bg-violet-400',
    idle: 'bg-yellow-400',
    offline: 'bg-gray-600',
  };
  return <span className={`w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-gray-600'} flex-shrink-0`} />;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState('general');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter({ channel: activeChannel }, '-created_date', 80),
    refetchInterval: 3000,
  });

  const { data: onlineUsers = [] } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: () => base44.entities.UserProfile.filter({ status: ['online', 'watching'] }, '-updated_date', 30),
    refetchInterval: 10000,
  });

  // Update own profile as online
  useEffect(() => {
    if (!user) return;
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

  // Sort messages oldest-first for display
  const sortedMessages = [...messages].reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length]);

  const sendMessage = useMutation({
    mutationFn: (content) => base44.entities.ChatMessage.create({
      content,
      channel: activeChannel,
      user_name: user?.full_name || user?.email?.split('@')[0] || 'Anonymous',
      user_email: user?.email || '',
    }),
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const currentChannel = CHANNELS.find(c => c.id === activeChannel);

  // Group consecutive messages from same user
  const groupedMessages = sortedMessages.reduce((groups, msg, i) => {
    const prev = sortedMessages[i - 1];
    const isGrouped = prev && prev.user_email === msg.user_email &&
      (new Date(msg.created_date) - new Date(prev.created_date)) < 5 * 60 * 1000;
    groups.push({ ...msg, grouped: isGrouped });
    return groups;
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Channels Sidebar */}
        <div className="w-60 bg-[#0d0d14] border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-black text-sm tracking-widest text-violet-400 uppercase">Akira+ Community</h2>
            <p className="text-gray-600 text-xs mt-0.5">{onlineUsers.length} members online</p>
          </div>

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest px-2 py-2">Channels</p>
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
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest px-2 py-2 mt-4">Online — {onlineUsers.length}</p>
            {onlineUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <div className="relative">
                  <Avatar name={u.user_name} email={u.user_email} size="sm" />
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={u.status} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-300 truncate">{u.user_name || u.user_email?.split('@')[0]}</p>
                  {u.status === 'watching' && u.currently_watching && (
                    <p className="text-[10px] text-violet-400 truncate flex items-center gap-1">
                      <Tv className="w-2.5 h-2.5" /> {u.currently_watching}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
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
                <p className="text-gray-500 text-sm mt-1">{currentChannel?.desc}. Be the first to say something!</p>
              </div>
            )}

            {groupedMessages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex items-start gap-3 group hover:bg-white/[0.02] px-2 py-0.5 rounded-lg transition-colors ${msg.grouped ? 'pl-14' : 'pt-3'}`}
              >
                {!msg.grouped && (
                  <Avatar name={msg.user_name} email={msg.user_email} />
                )}
                <div className="min-w-0 flex-1">
                  {!msg.grouped && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-white">
                        {msg.user_name || msg.user_email?.split('@')[0] || 'Anonymous'}
                      </span>
                      <span className="text-gray-600 text-[10px]">
                        {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                  <p className="text-gray-300 text-sm leading-relaxed break-words">{msg.content}</p>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 flex-shrink-0">
            {!user ? (
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                <p className="text-gray-400 text-sm">
                  <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="text-violet-400 hover:underline font-semibold">Sign in</button> to chat in #{currentChannel?.label}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex items-center gap-3 bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 transition-colors">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${currentChannel?.label}`}
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sendMessage.isPending}
                  className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Panel - Members */}
        <div className="hidden xl:flex w-56 bg-[#0d0d14] border-l border-white/5 flex-col flex-shrink-0">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Members</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {onlineUsers.filter(u => u.status === 'watching').length > 0 && (
              <>
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest px-2 py-1">Watching Now</p>
                {onlineUsers.filter(u => u.status === 'watching').map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="relative">
                      <Avatar name={u.user_name} email={u.user_email} size="sm" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-violet-400 border border-[#0d0d14]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 truncate font-medium">{u.user_name || u.user_email?.split('@')[0]}</p>
                      {u.currently_watching && (
                        <p className="text-[9px] text-violet-400 truncate">{u.currently_watching}</p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {onlineUsers.filter(u => u.status === 'online').length > 0 && (
              <>
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest px-2 py-1 mt-2">Online</p>
                {onlineUsers.filter(u => u.status === 'online').map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="relative">
                      <Avatar name={u.user_name} email={u.user_email} size="sm" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-[#0d0d14]" />
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.user_name || u.user_email?.split('@')[0]}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}