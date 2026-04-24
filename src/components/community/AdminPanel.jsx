import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Eye, Ban, Plus, Shield, Settings, Film, Clock } from 'lucide-react';
import { Avatar } from './UserProfilePopup';

const TABS = [
  { id: 'users', label: 'Manage Users', icon: Users },
  { id: 'anime', label: 'Manage Anime', icon: Film },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPanel({ isOwner, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.UserProfile.list('-updated_date', 100)
      .then(setProfiles)
      .catch(() => {});
  }, []);

  const handleChangeRole = async (email, newRole) => {
    const profile = profiles.find(p => p.user_email === email);
    if (!profile) return;
    await base44.entities.UserProfile.update(profile.id, { role: newRole });
    setProfiles(prev => prev.map(p => p.user_email === email ? { ...p, role: newRole } : p));
  };

  const handleBanUser = async (email) => {
    // Implement ban logic via BlockedUser entity
    const profile = profiles.find(p => p.user_email === email);
    if (!profile) return;
    await base44.entities.BlockedUser.create({
      user_email: 'system',
      blocked_email: email,
      blocked_name: profile.user_name,
      reason: 'ban'
    });
    setProfiles(prev => prev.filter(p => p.user_email !== email));
  };

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="w-full max-w-5xl max-h-[90vh] bg-[#0f1115] rounded-2xl shadow-2xl border border-white/8 flex overflow-hidden pointer-events-auto flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-violet-400" />
              <h2 className="text-white font-bold text-lg">
                {isOwner ? 'Owner Panel' : 'Admin Panel'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-48 bg-[#111318] border-r border-white/5 flex flex-col p-3 space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {/* Users Tab */}
              {activeTab === 'users' && (
                <div>
                  <h3 className="text-white font-bold text-lg mb-4">Community Members</h3>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {profiles.map(profile => (
                      <div key={profile.user_email} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <Avatar name={profile.user_name} email={profile.user_email} avatarUrl={profile.avatar_url} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{profile.user_name || profile.user_email.split('@')[0]}</p>
                          <p className="text-xs text-gray-500">{profile.user_email}</p>
                        </div>
                        {isOwner ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={profile.role || 'user'}
                              onChange={e => handleChangeRole(profile.user_email, e.target.value)}
                              className="bg-[#1a1d23] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500/50"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="owner">Owner</option>
                            </select>
                            <button
                              onClick={() => handleBanUser(profile.user_email)}
                              className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Ban user"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 px-2 py-1 bg-white/5 rounded capitalize">
                            {profile.role || 'user'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anime Tab */}
              {activeTab === 'anime' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg">Manage Anime</h3>
                    <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                      <Plus className="w-4 h-4" /> Add Anime
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm">Anime management features coming soon...</p>
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div>
                  <h3 className="text-white font-bold text-lg mb-4">Schedule Anime</h3>
                  <p className="text-gray-500 text-sm">Schedule management features coming soon...</p>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div>
                  <h3 className="text-white font-bold text-lg mb-4">Community Settings</h3>
                  {isOwner && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Lock Community Chats</p>
                          <p className="text-xs text-gray-500">Prevent new messages from being posted</p>
                        </div>
                        <button className="w-11 h-6 rounded-full bg-white/10 relative flex-shrink-0">
                          <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}