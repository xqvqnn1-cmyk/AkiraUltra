import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, ExternalLink, Play, Info, List } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

const JIKAN = 'https://api.jikan.moe/v4';

export default function WatchPage() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEp, setSelectedEp] = useState(1);
  const [loading, setLoading] = useState(true);
  const [streamingLinks, setStreamingLinks] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mainRes, epRes, streamRes] = await Promise.all([
          fetch(`${JIKAN}/anime/${id}`),
          fetch(`${JIKAN}/anime/${id}/episodes`),
          fetch(`${JIKAN}/anime/${id}/streaming`),
        ]);
        const [mainData, epData, streamData] = await Promise.all([
          mainRes.json(), epRes.json(), streamRes.json()
        ]);
        setAnime(mainData.data);
        setEpisodes(epData.data || []);
        setStreamingLinks(streamData.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!anime) return null;

  const trailerUrl = anime.trailer?.embed_url;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="pt-20 max-w-7xl mx-auto px-4 md:px-8 pb-20">

        {/* Back */}
        <Link to={`/anime/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Details
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Player */}
          <div className="flex-1">
            <div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
              {trailerUrl ? (
                <iframe
                  src={trailerUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={anime.title}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-900 to-black">
                  <div className="w-20 h-20 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    <Play className="w-8 h-8 text-violet-400 fill-current ml-1" />
                  </div>
                  <p className="text-gray-500 text-sm text-center px-8">
                    Video player not available. Watch on a streaming platform below.
                  </p>
                </div>
              )}
            </div>

            {/* Anime Info */}
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold">{anime.title}</h1>
                  {anime.score && (
                    <div className="flex items-center gap-1.5 text-yellow-400 text-sm mt-1">
                      <Star className="w-3.5 h-3.5 fill-current" /> {anime.score} / 10
                    </div>
                  )}
                </div>
                <Link to={`/anime/${id}`} className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-sm flex-shrink-0">
                  <Info className="w-4 h-4" /> Details
                </Link>
              </div>
              <p className="text-gray-400 text-sm mt-3 line-clamp-3">{anime.synopsis}</p>
            </div>

            {/* Streaming Links */}
            {streamingLinks.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Available On</h3>
                <div className="flex flex-wrap gap-2">
                  {streamingLinks.map(link => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/30 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    >
                      {link.name} <ExternalLink className="w-3 h-3 text-gray-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Episode List */}
          <div className="lg:w-72 xl:w-80">
            <div className="bg-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-bold flex items-center gap-2">
                  <List className="w-4 h-4 text-violet-400" /> Episodes ({episodes.length || anime.episodes || '?'})
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[500px]">
                {episodes.length > 0 ? (
                  episodes.slice(0, 50).map(ep => (
                    <button
                      key={ep.mal_id}
                      onClick={() => setSelectedEp(ep.mal_id)}
                      className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-3 ${selectedEp === ep.mal_id ? 'bg-violet-600/10 border-l-2 border-l-violet-500' : ''}`}
                    >
                      <span className="text-xs font-mono text-gray-500 w-8 flex-shrink-0">EP{ep.mal_id}</span>
                      <span className="text-sm text-gray-200 line-clamp-1">{ep.title || `Episode ${ep.mal_id}`}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    {anime.episodes ? `${anime.episodes} episodes` : 'Episodes info unavailable'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}