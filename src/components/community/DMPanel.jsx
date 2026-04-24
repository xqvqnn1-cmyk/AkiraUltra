import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Send, X } from 'lucide-react';
import { Avatar } from './UserProfilePopup.jsx';

export default function DMPanel({ currentUser, targetEmail, targetName, onClose }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['dm', currentUser.email, targetEmail],
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        base44.entities.DirectMessage.filter({ from_email: currentUser.email, to_email: targetEmail }, 'created_date', 60),
        base44.entities.DirectMessage.filter({ from_email: targetEmail, to_email: currentUser.email }, 'created_date', 60),
      ]);
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark received messages as read
  useEffect(() => {
    messages.filter(m => m.from_email === targetEmail && !m.read).forEach(m => {
      base44.entities.DirectMessage.update(m.id, { read: true });
    });
  }, [messages, targetEmail]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.DirectMessage.create({
        from_email: currentUser.email,
        from_name: currentUser.full_name || currentUser.email.split('@')[0],
        to_email: targetEmail,
        content,
        read: false,
      });
      await base44.entities.Notification.create({
        user_email: targetEmail,
        type: 'dm',
        title: `${currentUser.full_name || currentUser.email.split('@')[0]} sent you a message`,
        body: content.slice(0, 80),
        from_email: currentUser.email,
        from_name: currentUser.full_name || currentUser.email.split('@')[0],
        read: false,
      });
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm', currentUser.email, targetEmail] });
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
      className="fixed right-0 bottom-0 w-80 bg-[#0f0f18] border border-white/10 rounded-tl-2xl flex flex-col z-40 shadow-2xl"
      style={{ top: 64 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#111118] rounded-tl-2xl">
        <Avatar name={targetName} email={targetEmail} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{targetName}</p>
          <p className="text-[10px] text-violet-400">Direct Message</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-3">
              <Avatar name={targetName} email={targetEmail} size="sm" />
            </div>
            <p className="text-white font-semibold text-sm">{targetName}</p>
            <p className="text-gray-600 text-xs mt-1">Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.from_email === currentUser.email;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && <Avatar name={targetName} email={targetEmail} size="sm" />}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-white/8 text-gray-200 rounded-bl-sm border border-white/5'}`}>
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-violet-200' : 'text-gray-600'}`}>
                    {format(new Date(msg.created_date), 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 pb-3 pt-1">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-violet-500/40 transition-colors">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${targetName}...`}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMutation.isPending}
            className="text-gray-500 hover:text-violet-400 disabled:opacity-30 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}