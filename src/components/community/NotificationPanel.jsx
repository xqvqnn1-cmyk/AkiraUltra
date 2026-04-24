import React from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, UserPlus, MessageCircle, AtSign, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_ICON = {
  mention: AtSign,
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  dm: MessageCircle,
  system: Bell,
};

const TYPE_COLOR = {
  mention: 'text-cyan-400',
  friend_request: 'text-violet-400',
  friend_accepted: 'text-green-400',
  dm: 'text-pink-400',
  system: 'text-yellow-400',
};

export default function NotificationPanel({ notifications = [], onClose, onMarkRead, onMarkAllRead }) {
  const unread = notifications.filter(n => !n.read);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute -right-32 bottom-full mb-2 w-80 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="font-bold text-white text-sm">Notifications</span>
        {unread.length > 0 && (
          <button onClick={onMarkAllRead} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = TYPE_ICON[n.type] || Bell;
            const color = TYPE_COLOR[n.type] || 'text-gray-400';
            return (
              <div
                key={n.id}
                onClick={() => !n.read && onMarkRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors ${!n.read ? 'bg-violet-600/5' : ''}`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg bg-white/5 flex-shrink-0 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-gray-700 mt-1">{format(new Date(n.created_date), 'MMM d, h:mm a')}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}