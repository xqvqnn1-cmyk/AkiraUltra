import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Send, X, ChevronLeft } from 'lucide-react';
import { Avatar, getAvatarColor } from './UserProfilePopup';

export default function DMPanel({ currentUser, targetEmail, targetName, onClose }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['dm', currentUser.email, targetEmail],
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        base44.entities.DirectMessage.filter({ from_email: currentUser.email, to_email: targetEmail }, '-created_date', 60),
        base44.entities.DirectMessage.filter({ from_email: targetEmail, to_email: currentUser.email }, '-created_date', 60),
      ]);
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark received as read
  useEffect(() => {
    if (!messages.length) return;
    messages.filter(m => m.from_email === targetEmail && !m.read).forEach(m => {
      base44.entities.DirectMessage.update(m.id, { read: true });
    });
  }, [messages, targetEmail]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.DirectMessage.create({ from_email: currentUser.email, from_name: currentUser.full_name || currentUser.email.split('@')[0], to_email: targetEmail, content, read: false });
      // Notify recipient
      await base44.entities.Notification.create({ user_email: targetEmail, type: 'dm', title: `${currentUser.full_name || currentUser.email.split('@')[0]} sent you a message`, body: content.slice(0, 80), from_email: currentUser.email, from_name: currentUser.full_name, read: false });
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm'] });
      setInput('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-[#0d0d14] border-l border-white/5 flex flex-col z-40 shadow-2xl"
      style={{ top: 64 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
        <Avatar name={targetName} email={targetEmail} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{targetName}</p>
          <p className="text-[10px] text-gray-600 truncate">{targetEmail}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((msg, i) => {
          const isMine = msg.from_email === currentUser.email;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-white/8 text-gray-200 rounded-bl-sm'}`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-violet-200' : 'text-gray-600'}`}>
                  {format(new Date(msg.created_date), 'h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">Start a conversation with {targetName}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${targetName}...`}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }}}
          />
          <button type="submit" disabled={!input.trim()} className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}