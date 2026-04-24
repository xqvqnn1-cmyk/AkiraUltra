import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ExternalLink, List, ChevronLeft, ChevronRight, Star, Tv } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '@/lib/AuthContext';

const JIKAN = 'https://api.jikan.moe/v4';

const STREAMING = [
  { name: 'Crunchyroll', url: 'https://crunchyroll.com', color: 'bg-orange-500 hover:bg-orange-400', logo: '🟠' },
  { name: 'Funimation', url: 'https://funimation.com', color: 'bg-purple-600 hover:bg-purple-500', logo: '🟣' },
  { name: 'Netflix', url: 'https://netflix.com', color: 'bg-red-600 hover:bg-red-500', logo: '🔴' },
  { name: 'HiDive', url: 'https://hidive.com', color: 'bg-cyan-600 hover:bg-cyan-500', logo: '🔵' },
];

export default function WatchPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEp, setSelectedEp] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      setLoading(true);
      try {
        const [animeRes, epsRes] = await Promise.all([
          fetch(`${JIKAN}/anime/${id}/full`),
          fetch(`${JIKAN}/anime/${id}/episodes`),
        ]);
        const [animeData, epsData] = await Promise.all([animeRes.json(), epsRes.json()]);
        setAnime(animeData.data);
        setEpisodes(epsData.data || []);

        // Update watching status
        if (user && animeData.data) {
          const existing = await base44.entities.UserProfile.filter({ user_email: user.email }, null, 1);
          const profileData = { user_email: user.email, user_name: user.full_name || user.email.split('@')[0], status: 'watching', currently_watching: animeData.data.title, currently_watching_id: String(id) };
          if (existing.length > 0) await base44.entities.UserProfile.update(existing[0].id, profileData);
          else await base44.entities.UserProfile.create(profileData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => {
      if (user) {
        base44.entities.UserProfile.filter({ user_email: user.email }, null, 1).then(existing => {
          if (existing.length > 0) base44.entities.UserProfile.update(existing[0].id, { status: 'online', currently_watching: '', currently_watching_id: '' });
        });
      }
    };
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const image = anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url;
  const totalEps = anime?.episodes || episodes.length || 24;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="pt-20 max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <Link to={`/anime/${id}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Details
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Anime info card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5 bg-[#0d0d14] rounded-2xl border border-white/5 p-5">
              {image && <img src={image} alt={anime?.title} className="w-28 h-40 object-cover rounded-xl flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-white mb-1 leading-tight">{anime?.title}</h1>
                {anime?.title_japanese && <p className="text-gray-600 text-xs mb-3 font-mono">{anime.title_japanese}</p>}
                <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-3">
                  {anime?.score && <span className="flex items-center gap-1 text-yellow-400"><Star className="w-3.5 h-3.5 fill-current" /> {anime.score}</span>}
                  {anime?.episodes && <span className="flex items-center gap-1"><Tv className="w-3.5 h-3.5" /> {anime.episodes} eps</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(anime?.genres || []).slice(0, 4).map(g => (
                    <span key={g.name} className="px-2 py-0.5 bg-violet-600/15 text-violet-300 border border-violet-500/20 text-xs rounded-full">{g.name}</span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Streaming notice */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0d0d14] rounded-2xl border border-white/5 p-6">
              <h2 className="font-bold text-white mb-1">Where to Watch</h2>
              <p className="text-gray-500 text-sm mb-5">Stream <span className="text-white font-semibold">{anime?.title}</span> on your preferred platform. Episode {selectedEp} selected.</p>
              <div className="grid grid-cols-2 gap-3">
                {STREAMING.map(s => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${s.color} text-white font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm`}
                  >
                    <ExternalLink className="w-4 h-4" /> Watch on {s.name}
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Synopsis */}
            {anime?.synopsis && (
              <div className="bg-[#0d0d14] rounded-2xl border border-white/5 p-6">
                <h2 className="font-bold text-white mb-3">Synopsis</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{anime.synopsis}</p>
              </div>
            )}
          </div>

          {/* Episode List */}
          <div className="bg-[#0d0d14] rounded-2xl border border-white/5 overflow-hidden flex flex-col" style={{ maxHeight: 600 }}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-sm">Episodes</span>
                <span className="text-gray-600 text-xs">({totalEps})</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setSelectedEp(Math.max(1, selectedEp - 1))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setSelectedEp(Math.min(totalEps, selectedEp + 1))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(episodes.length > 0 ? episodes : Array.from({ length: Math.min(totalEps, 50) }, (_, i) => ({ mal_id: i + 1, title: null }))).map(ep => (
                <button
                  key={ep.mal_id}
                  onClick={() => setSelectedEp(ep.mal_id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${selectedEp === ep.mal_id ? 'bg-violet-600/20 border-l-2 border-l-violet-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-violet-400 font-mono text-xs w-10 flex-shrink-0">EP{ep.mal_id}</span>
                    <span className="text-sm text-gray-300 truncate">{ep.title || `Episode ${ep.mal_id}`}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}