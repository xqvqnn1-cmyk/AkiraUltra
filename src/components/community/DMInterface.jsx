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

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch profiles
  useEffect(() => {
    if (!user?.email || !targetEmail) return;
    Promise.all([
      base44.entities.UserProfile.filter({ user_email: user.email }, null, 1),
      base44.entities.UserProfile.filter({ user_email: targetEmail }, null, 1),
    ]).then(([myProfiles, targetProfiles]) => {
      setProfile(myProfiles[0] || null);
      setTargetProfile(targetProfiles[0] || null);
    });
  }, [user?.email, targetEmail]);

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
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
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
              <div className="w-20 h-20 rounded-full mb-4 overflow-hidden ring-4 ring-white/5">
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
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="hidden lg:flex w-80 flex-shrink-0 bg-[#0f1115] border-l border-white/5 flex-col overflow-hidden">
        {/* Banner + Avatar */}
        <div className="relative h-24 flex-shrink-0 bg-cover bg-center overflow-hidden" style={bannerStyle}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] to-transparent" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-4">
        {/* Avatar + Name */}
        <div className="text-center -mt-10 mb-2 relative z-10">
          <div className="flex justify-center mb-3">
            <div className="ring-4 ring-[#0f1115] rounded-full">
              <Avatar name={displayName} email={targetEmail} avatarUrl={targetProfile?.avatar_url} size="xl" />
            </div>
          </div>
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
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors">
            <Heart className="w-3.5 h-3.5" /> Add Friend
          </button>
          <button className="flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors" title="More">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}