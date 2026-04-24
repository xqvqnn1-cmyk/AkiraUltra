import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Copy, LogOut, Check } from 'lucide-react';
import { Avatar } from './UserProfilePopup.jsx';
import { useAuth } from '@/lib/AuthContext';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'idle', label: 'Idle', color: 'bg-yellow-400' },
  { value: 'offline', label: 'Invisible', color: 'bg-gray-600' },
];

const BANNER_GRADIENT_MAP = {
  'from-violet-600 to-purple-800': 'linear-gradient(to right, #7c3aed, #6b21a8)',
  'from-cyan-500 to-blue-700': 'linear-gradient(to right, #06b6d4, #1d4ed8)',
  'from-pink-500 to-rose-700': 'linear-gradient(to right, #ec4899, #be123c)',
  'from-orange-500 to-red-700': 'linear-gradient(to right, #f97316, #b91c1c)',
  'from-green-500 to-teal-700': 'linear-gradient(to right, #22c55e, #0f766e)',
  'from-yellow-500 to-orange-600': 'linear-gradient(to right, #eab308, #ea580c)',
  'from-indigo-500 to-violet-700': 'linear-gradient(to right, #6366f1, #7e22ce)',
  'from-fuchsia-500 to-pink-700': 'linear-gradient(to right, #d946ef, #be185d)',
};

function getBannerStyle(profile) {
  if (profile?.banner_url) return { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  const gradient = BANNER_GRADIENT_MAP[profile?.banner_color] || 'linear-gradient(to right, #7c3aed, #6b21a8)';
  return { background: gradient };
}

const STATUS_COLORS = {
  online: 'bg-green-500',
  watching: 'bg-violet-500',
  idle: 'bg-yellow-400',
  offline: 'bg-gray-600',
};

export default function SelfProfilePopup({ profile, onClose, onStatusChange, onOpenSettings }) {
  const { user, logout } = useAuth();
  const ref = useRef(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user?.email || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = profile?.user_name || user?.full_name || user?.email?.split('@')[0] || 'You';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-16 left-2 w-72 bg-[#18181f] rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50"
    >
      {/* Banner */}
      <div className="h-20 w-full" style={getBannerStyle(profile)} />

      {/* Avatar + name */}
      <div className="px-4 pb-3">
        <div className="flex items-start justify-between -mt-8 mb-2">
          <div className="relative">
            <div className="ring-4 ring-[#18181f] rounded-full">
              <Avatar name={displayName} email={user?.email} avatarUrl={profile?.avatar_url} size="xl" />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-[#18181f] ${STATUS_COLORS[profile?.status || 'offline']}`} />
          </div>
        </div>

        <p className="font-black text-white text-base leading-tight">{displayName}</p>
        {profile?.bio && <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">{profile.bio}</p>}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/8 mx-4" />

      {/* Status selector */}
      <div className="px-2 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-2 mb-1">Set Status</p>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => { onStatusChange(s.value); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${profile?.status === s.value || (s.value === 'offline' && profile?.status === 'offline') ? 'text-white' : 'text-gray-400'}`}
          >
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${s.color}`} />
            <span className="text-sm font-medium flex-1 text-left">{s.label}</span>
            {(profile?.status === s.value) && <Check className="w-3.5 h-3.5 text-green-400" />}
          </button>
        ))}
      </div>

      <div className="h-px bg-white/8 mx-2" />

      {/* Actions */}
      <div className="px-2 py-2">
        <button
          onClick={() => { onOpenSettings?.('profile'); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
        >
          <Pencil className="w-4 h-4" />
          <span className="text-sm font-medium">Edit Profile</span>
        </button>

        <button
          onClick={handleCopyId}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span className="text-sm font-medium flex-1 text-left">{copied ? 'Copied!' : 'Copy User ID'}</span>
        </button>
      </div>

      <div className="h-px bg-white/8 mx-2" />

      <div className="px-2 py-2">
        <button
          onClick={() => { logout(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}