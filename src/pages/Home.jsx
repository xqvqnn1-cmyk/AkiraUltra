import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Plus, Star, ChevronRight, TrendingUp, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimeCard from '../components/anime/AnimeCard';
import AnimeRow from '../components/anime/AnimeRow';
import Navbar from '../components/layout/Navbar';

// Using Jikan API (MAL public API) - no key needed
const JIKAN = 'https://api.jikan.moe/v4';

export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [popRes, topRes, newRes] = await Promise.all([
          fetch(`${JIKAN}/top/anime?filter=bypopularity&limit=12`),
          fetch(`${JIKAN}/top/anime?filter=favorite&limit=12`),
          fetch(`${JIKAN}/seasons/now?limit=12`),
        ]);
        const [popData, topData, newData] = await Promise.all([
          popRes.json(), topRes.json(), newRes.json()
        ]);
        setPopular(popData.data || []);
        setTopRated(topData.data || []);
        setNewReleases(newData.data || []);
        setFeatured((popData.data || [])[0] || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero */}
      {featured && (
        <div className="relative h-[85vh] min-h-[600px] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${featured.images?.jpg?.large_image_url || featured.images?.jpg?.image_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/20" />

          <div className="relative z-10 flex flex-col justify-end h-full pb-16 px-6 md:px-16 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-violet-600 text-white text-xs font-bold rounded tracking-widest uppercase">Featured</span>
                {featured.score && (
                  <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" /> {featured.score}
                  </span>
                )}
                {featured.rating && <span className="text-gray-400 text-xs">{featured.rating}</span>}
              </div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2 leading-none">
                {featured.title}
              </h1>
              {featured.title_japanese && (
                <p className="text-gray-400 text-sm mb-4 font-mono">{featured.title_japanese}</p>
              )}
              <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 line-clamp-3 max-w-xl">
                {featured.synopsis}
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {(featured.genres || []).slice(0, 5).map(g => (
                  <span key={g.name || g} className="text-xs text-gray-400 border border-gray-700 rounded px-2 py-0.5">
                    {g.name || g}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/watch/${featured.mal_id}`}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 shadow-lg shadow-violet-900/50"
                >
                  <Play className="w-5 h-5 fill-current" /> Start Watching
                </Link>
                <Link
                  to={`/anime/${featured.mal_id}`}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg font-semibold transition-all border border-white/10"
                >
                  <Info className="w-4 h-4" /> Details
                </Link>
                <button className="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg border border-white/10 transition-all">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {loading && !featured && (
        <div className="h-[85vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4 text-sm">Loading anime...</p>
          </div>
        </div>
      )}

      {/* Content Rows */}
      <div className="pb-20 space-y-10 -mt-4 relative z-10">
        <AnimeRow title="Popular" icon={<TrendingUp className="w-4 h-4 text-orange-400" />} anime={popular} />
        <AnimeRow title="New This Season" icon={<Sparkles className="w-4 h-4 text-cyan-400" />} anime={newReleases} />
        <AnimeRow title="Top Rated" icon={<Star className="w-4 h-4 text-yellow-400 fill-current" />} anime={topRated} />
      </div>
    </div>
  );
}