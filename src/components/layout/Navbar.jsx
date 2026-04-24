import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, List, X, Menu, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserSettingsModal from '../community/UserSettingsModal.jsx';
import UserProfileModal from '../community/UserProfileModal.jsx';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Browse', path: '/browse' },
  { label: 'Community', path: '/community' },
  { label: 'Schedule', path: '/schedule' },
  { label: 'My List', path: '/watchlist' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.UserProfile.filter({ user_email: user.email }, null, 1).then(r => {
      if (r[0]?.avatar_url) setAvatarUrl(r[0].avatar_url);
    });
    const handler = (e) => { if (e.detail.email === user.email) setAvatarUrl(e.detail.avatarUrl); };
    window.addEventListener('avatarUpdated', handler);
    return () => window.removeEventListener('avatarUpdated', handler);
  }, [user?.email]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/5 shadow-xl' : 'bg-gradient-to-b from-black/60 to-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="https://media.base44.com/images/public/69eaec00027d7dc32aaa376a/43ed0279b_ChatGPTImageApr24202612_30_57AM.png" alt="AkiraPlus" className="w-8 h-8 object-contain" />
          <span className="font-black text-xl tracking-tight text-white">Akira<span className="text-violet-400">+</span></span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === link.path ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {searchOpen ? (
              <motion.form
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                onSubmit={handleSearch}
                className="flex items-center gap-2 overflow-hidden"
              >
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search anime..."
                  className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-white flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            )}
          </AnimatePresence>

          <Link to="/watchlist" className="hidden md:flex p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <List className="w-4 h-4" />
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white">
                    {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-300 max-w-[100px] truncate">{user?.full_name || user?.email?.split('@')[0]}</span>
              </button>
            </div>
          ) : (
            <Link
              to={`/signin?next=${encodeURIComponent(window.location.href)}`}
              className="hidden md:flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <UserProfileModal
            onClose={() => setShowProfile(false)}
            onOpenSettings={() => { setShowProfile(false); setShowSettings(true); }}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && <UserSettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0a0a0f]/98 border-t border-white/5 px-4 pb-4"
          >
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-sm font-medium border-b border-white/5 last:border-0 ${location.pathname === link.path ? 'text-violet-400' : 'text-gray-400'}`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-3 text-sm text-red-400 font-medium">
                Sign Out
              </button>
            ) : (
              <Link to="/signin" className="block py-3 text-sm text-violet-400 font-semibold">
                Sign In
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}