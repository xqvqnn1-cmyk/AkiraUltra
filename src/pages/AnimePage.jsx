import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Star, Clock, Tv, Calendar, ChevronLeft, Plus, Heart, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import AnimeCard from '../components/anime/AnimeCard';
import { base44 } from '@/api/base44Client';

const JIKAN = 'https://api.jikan.moe/v4';

export default function AnimePage() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mainRes, charRes] = await Promise.all([
          fetch(`${JIKAN}/anime/${id}/full`),
          fetch(`${JIKAN}/anime/${id}/characters`),
        ]);
        const [mainData, charData] = await Promise.all([mainRes.json(), charRes.json()]);
        setAnime(mainData.data);
        setCharacters((charData.data || []).slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    window.scrollTo(0, 0);
  }, [id]);

  const addToWatchlist = async () => {
    if (!anime) return;
    await base44.entities.WatchlistItem.create({
      anime_id: String(anime.mal_id),
      anime_title: anime.title,
      anime_image: anime.images?.jpg?.large_image_url,
      anime_slug: String(anime.mal_id),
      status: 'plan_to_watch',
    });
    setInWatchlist(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!anime) return null;

  const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-[50vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 blur-sm"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-[#0a0a0f]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 -mt-40 relative z-10 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <img src={image} alt={anime.title} className="w-48 md:w-64 rounded-2xl shadow-2xl ring-1 ring-white/10" />
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-16">
            <div className="flex items-center gap-3 mb-3">
              {anime.status === 'Currently Airing' && (
                <span className="px-2.5 py-1 bg-green-600/20 text-green-400 text-xs font-bold rounded-full border border-green-500/20 tracking-wider">AIRING</span>
              )}
              {anime.score && (
                <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <Star className="w-4 h-4 fill-current" /> {anime.score}
                </span>
              )}
              {anime.rating && <span className="text-gray-500 text-sm">{anime.rating}</span>}
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">{anime.title}</h1>
            {anime.title_japanese && <p className="text-gray-500 text-sm mb-4 font-mono">{anime.title_japanese}</p>}

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-5">
              {anime.episodes && (
                <span className="flex items-center gap-1.5"><Tv className="w-3.5 h-3.5" /> {anime.episodes} Episodes</span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {anime.duration}</span>
              )}
              {anime.year && (
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {anime.year}</span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(anime.genres || []).map(g => (
                <span key={g.name} className="px-3 py-1 bg-violet-600/15 text-violet-300 border border-violet-500/20 text-xs font-medium rounded-full">{g.name}</span>
              ))}
            </div>

            <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-2xl line-clamp-5">{anime.synopsis}</p>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/watch/${anime.mal_id}`}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-violet-900/40 hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current" /> Watch Now
              </Link>
              <button
                onClick={addToWatchlist}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all border ${inWatchlist ? 'bg-green-600/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
              >
                <Plus className="w-4 h-4" /> {inWatchlist ? 'Added!' : 'Add to List'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Characters */}
        {characters.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-bold mb-5">Characters</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
              {characters.map(c => (
                <div key={c.character?.mal_id} className="text-center">
                  <div className="aspect-square rounded-full overflow-hidden mb-2 ring-2 ring-white/10">
                    <img src={c.character?.images?.jpg?.image_url} alt={c.character?.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-xs text-gray-300 font-medium line-clamp-2">{c.character?.name}</p>
                  <p className="text-[10px] text-gray-600 capitalize">{c.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}