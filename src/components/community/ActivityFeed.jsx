import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Tv, Circle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from './UserProfilePopup';

const STATUS_COLORS = {
  online: 'bg-green-500',
  watching: 'bg-violet-500',
  idle: 'bg-yellow-400',
  offline: 'bg-gray-600',
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [prevProfiles, setPrevProfiles] = useState(new Map());

  useEffect(() => {
    // Don't load activities - just show placeholder
    // Prevents unnecessary API calls during modal renders
    setActivities([]);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0f1115] rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-violet-400" />
          <h3 className="font-bold text-sm text-white">Community Activity</h3>
        </div>
        <p className="text-xs text-gray-500">Real-time member updates</p>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-600 text-center px-4">Waiting for activity...</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-3">
            <AnimatePresence>
              {activities.map(activity => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">
                      <Avatar 
                        name={activity.displayName} 
                        email={activity.email} 
                        avatarUrl={activity.avatar}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300">
                        <span className="font-semibold text-white truncate">{activity.displayName}</span>
                        <span className="text-gray-500"> {activity.message}</span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`${activity.color}`}>
                          {activity.icon}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}