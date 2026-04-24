import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Smile, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { Avatar } from './UserProfilePopup.jsx';
import UserProfileModal from './UserProfileModal.jsx';
import { base44 } from '@/api/base44Client';

function parseContent(content, currentUserName) {
  // Highlight @mentions
  const parts = content.split(/(@\w[\w\d_-]*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const isMe = currentUserName && part.slice(1).toLowerCase() === currentUserName.toLowerCase();
      return (
        <span key={i} className={`font-semibold rounded px-0.5 ${isMe ? 'bg-yellow-400/20 text-yellow-300' : 'text-violet-400'}`}>
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function ChatMessage({ msg, currentUser, onMention, onReply, profiles = [] }) {
  const [showProfile, setShowProfile] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState([]);
  const avatarRef = useRef(null);
  const nameRef = useRef(null);
  const displayName = msg.user_name || msg.user_email?.split('@')[0] || 'Anonymous';
  const senderProfile = profiles.find(p => p.user_email === msg.user_email);
  const avatarUrl = senderProfile?.avatar_url;

  const addReaction = async (emoji) => {
    await base44.entities.MessageReaction.create({
      message_id: msg.id,
      message_type: 'chat',
      user_email: currentUser?.email,
      emoji,
    });
    setShowReactions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex items-start gap-3 group hover:bg-white/[0.02] px-2 py-0.5 rounded-lg transition-colors relative ${msg.grouped ? 'pl-14' : 'pt-3'}`}
    >
      {!msg.grouped && (
        <div ref={avatarRef} className="relative flex-shrink-0">
          <Avatar
            name={displayName}
            email={msg.user_email}
            avatarUrl={avatarUrl}
            onClick={() => setShowProfile(v => !v)}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        {msg.reply_to_user && (
          <div className="text-xs text-gray-500 mb-1 pl-2 border-l border-gray-600">
            Replying to <span className="text-gray-300 font-semibold">{msg.reply_to_user}</span>
          </div>
        )}
        {!msg.grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <button
              ref={nameRef}
              onClick={() => setShowProfile(v => !v)}
              className="font-semibold text-sm text-white hover:underline cursor-pointer"
            >
              {displayName}
            </button>
            <span className="text-gray-600 text-[10px]">
              {format(new Date(msg.created_date), 'MMM d, h:mm a')}
            </span>
          </div>
        )}
        <p className="text-gray-300 text-sm leading-relaxed break-words">
          {parseContent(msg.content, currentUser?.full_name || currentUser?.email?.split('@')[0])}
        </p>
        {msg.image_url && (
          <img src={msg.image_url} alt="attachment" className="mt-2 max-w-xs rounded-lg max-h-48 object-cover" />
        )}
        {msg.gif_url && (
          <img src={msg.gif_url} alt="gif" className="mt-2 max-w-xs rounded-lg max-h-48 object-cover" />
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            title="React"
          >
            <Smile className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 bg-[#1a1d23] border border-white/10 rounded-lg p-2 flex gap-1 z-50"
              >
                {['👍', '❤️', '😂', '🔥', '🎉', '😢'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addReaction(emoji)}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {currentUser && (
          <button
            onClick={() => onReply?.(msg)}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            title="Reply"
          >
            <MessageSquare className="w-3 h-3" />
          </button>
        )}
        {currentUser && msg.user_email !== currentUser.email && (
          <button
            onClick={() => onMention(displayName)}
            className="p-1 rounded bg-white/5 hover:bg-violet-500/20 text-gray-500 hover:text-violet-400 transition-colors"
            title="Mention"
          >
            <AtSign className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <UserProfileModal
            targetEmail={msg.user_email}
            targetName={displayName}
            onClose={() => setShowProfile(false)}
            onDM={(email, name) => {
              setShowProfile(false);
              window.dispatchEvent(new CustomEvent('openDM', { detail: { email, name } }));
            }}
            onOpenSettings={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}