import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign } from 'lucide-react';
import { Avatar } from './UserProfilePopup';
import UserProfilePopup from './UserProfilePopup';

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

export default function ChatMessage({ msg, currentUser, onMention }) {
  const [showProfile, setShowProfile] = useState(false);
  const avatarRef = useRef(null);
  const nameRef = useRef(null);
  const displayName = msg.user_name || msg.user_email?.split('@')[0] || 'Anonymous';

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
            onClick={() => setShowProfile(v => !v)}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
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
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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

      {/* Profile Popup */}
      <AnimatePresence>
        {showProfile && (
          <UserProfilePopup
            userEmail={msg.user_email}
            userName={displayName}
            anchorRef={msg.grouped ? nameRef : avatarRef}
            onClose={() => setShowProfile(false)}
            onDM={(email, name) => {
              setShowProfile(false);
              // bubble up via custom event
              window.dispatchEvent(new CustomEvent('openDM', { detail: { email, name } }));
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}