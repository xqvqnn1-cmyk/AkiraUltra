import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Play, ExternalLink, List, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '@/lib/AuthContext';

const JIKAN = 'https://api.jikan.moe/v4';
const STREAMING_LINKS = [
  { name: 'Crunchyroll', url: 'https://crunchyroll.com', color: 'bg-orange-500' },
  { name: 'Funimation', url: 'https://funimation.com', color: 'bg-purple-600' },
  { name: 'Netflix', url: 'https://netflix.com', color: 'bg-red-600' },
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

        // Update watching status in user profile
        if (user && animeData.data) {
          const title = animeData.data.title;
          const existing = await base44.entities.UserProfile.filter({ user_email: user.email }, null, 1);
          const profileData = {
            user_email: user.email,
            user_name: user.full_name || user.email.split('@')[0],
            status: 'watching',
            currently_watching: title,
            currently_watching_id: String(id),
          };
          if (existing.length > 0) {
            await base44.entities.UserProfile.update(existing[0].id, profileData);
          } else {
            await base44.entities.UserProfile.create(profileData);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Reset to online when leaving
    return () => {
      if (user) {
        base44.entities.UserProfile.filter({ user_email: user.email }, null, 1).then(existing => {
          if (existing.length > 0) {
            base44.entities.UserProfile.update(existing[0].id, { status: 'online', currently_watching: '', currently_watching_id: '' });
          }
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="pt-16 max-w-7xl mx-auto px-4 md:px-8">
        <Link to={`/anime/${id}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white py-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Details
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
          {/* Player */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 flex flex-col items-center justify-center relative">
              {anime?.trailer?.embed_url ? (
                <iframe
                  src={anime.trailer.embed_url}
                  className="w-full h-full"
                  allowFullScreen
                  title="Anime Trailer"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center px-8">
                  <div className="w-20 h-20 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    <Play className="w-9 h-9 text-violet-400 fill-current" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{anime?.title}</p>
                    <p className="text-gray-500 text-sm mt-1">Stream on your preferred platform below</p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    {STREAMING_LINKS.map(link => (
                      <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                        className={`${link.color} text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity`}>
                        <ExternalLink className="w-3.5 h-3.5" /> {link.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-4">
              <h2 className="font-bold text-lg">{anime?.title} — Ep. {selectedEp}</h2>
              <div className="flex gap-2">
                <button onClick={() => setSelectedEp(Math.max(1, selectedEp - 1))} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedEp(Math.min(anime?.episodes || 999, selectedEp + 1))} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {anime?.synopsis && (
              <p className="text-gray-400 text-sm leading-relaxed mt-3">{anime.synopsis}</p>
            )}
          </div>

          {/* Episode List */}
          <div className="bg-[#0d0d14] rounded-2xl border border-white/5 overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <List className="w-4 h-4 text-gray-500" />
              <span className="font-bold text-sm">Episodes</span>
              {anime?.episodes && <span className="text-gray-600 text-xs">({anime.episodes} total)</span>}
            </div>
            <div className="flex-1 overflow-y-auto">
              {episodes.length > 0 ? episodes.map(ep => (
                <button
                  key={ep.mal_id}
                  onClick={() => setSelectedEp(ep.mal_id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${selectedEp === ep.mal_id ? 'bg-violet-600/20 border-l-2 border-l-violet-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-violet-400 font-mono text-xs w-8">EP{ep.mal_id}</span>
                    <span className="text-sm text-gray-300 truncate">{ep.title || `Episode ${ep.mal_id}`}</span>
                  </div>
                </button>
              )) : (
                Array.from({ length: Math.min(anime?.episodes || 12, 24) }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setSelectedEp(i + 1)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${selectedEp === i + 1 ? 'bg-violet-600/20 border-l-2 border-l-violet-500' : ''}`}
                  >
                    <span className="text-violet-400 font-mono text-xs">Episode {i + 1}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}