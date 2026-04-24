import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Star, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimeCard from '../components/anime/AnimeCard';
import Navbar from '../components/layout/Navbar';

const JIKAN = 'https://api.jikan.moe/v4';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'];
const STATUSES = ['airing', 'complete', 'upcoming'];
const SORTS = [
  { label: 'By Popularity', value: 'bypopularity' },
  { label: 'By Score', value: 'score' },
  { label: 'Favorites', value: 'favorite' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Airing Now', value: 'airing' },
];

export default function BrowsePage() {
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('bypopularity');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const searchQ = urlParams.get('q') || '';

  useEffect(() => {
    if (searchQ) setQuery(searchQ);
  }, [searchQ]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let url;
        if (query) {
          url = `${JIKAN}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=24&sfw=true`;
        } else {
          url = `${JIKAN}/top/anime?filter=${sort}&page=${page}&limit=24`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (page === 1) {
          setAnime(data.data || []);
        } else {
          setAnime(prev => [...prev, ...(data.data || [])]);
        }
        setHasMore(data.pagination?.has_next_page || false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query, sort, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAnime([]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="pt-24 pb-20 px-6 md:px-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Browse Anime</h1>
          <p className="text-gray-500">Discover thousands of anime series and movies</p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); setAnime([]); }}
              placeholder="Search anime, genres, studios..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </form>

          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); setAnime([]); }}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {SORTS.map(s => <option key={s.value} value={s.value} className="bg-[#1a1a2e]">{s.label}</option>)}
          </select>
        </div>

        {/* Results */}
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {anime.map((a, i) => (
                <AnimeCard key={`${a.mal_id}-${i}`} anime={a} index={i % 12} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}