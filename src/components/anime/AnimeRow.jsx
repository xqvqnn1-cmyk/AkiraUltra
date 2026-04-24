import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from './AnimeCard';

export default function AnimeRow({ title, icon, anime = [], viewAllPath = '/browse' }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 600, behavior: 'smooth' });
    }
  };

  if (!anime.length) return null;

  return (
    <div className="px-6 md:px-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          {icon} {title}
        </h2>
        <div className="flex items-center gap-2">
          <Link to={viewAllPath} className="text-gray-400 hover:text-violet-400 text-sm font-medium transition-colors flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => scroll(-1)} className="hidden md:flex p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll(1)} className="hidden md:flex p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {anime.map((a, i) => (
          <AnimeCard key={a.mal_id || i} anime={a} index={i} />
        ))}
      </div>
    </div>
  );
}