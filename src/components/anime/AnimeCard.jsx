import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnimeCard({ anime, index = 0 }) {
  const id = anime.mal_id || anime.id;
  const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || anime.image_url;
  const title = anime.title || anime.title_english;
  const genres = (anime.genres || []).slice(0, 2).map(g => g.name || g).join(' · ');
  const year = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative flex-shrink-0 w-[160px] md:w-[180px]"
    >
      <Link to={`/anime/${id}`} className="block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 shadow-lg">
          {image && (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* NEW badge */}
          {anime.airing && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded tracking-wider">NEW</div>
          )}

          {/* Score */}
          {anime.score && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur rounded px-1.5 py-0.5">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
              <span className="text-white text-[10px] font-bold">{anime.score}</span>
            </div>
          )}

          {/* Hover actions */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Link
              to={`/watch/${id}`}
              onClick={e => e.stopPropagation()}
              className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shadow-xl transition-transform hover:scale-110"
            >
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            </Link>
          </div>
        </div>
        <div className="mt-2 px-1">
          <h3 className="text-white text-sm font-semibold line-clamp-2 leading-tight">{title}</h3>
          <p className="text-gray-500 text-xs mt-0.5">{genres}{genres && year ? ' · ' : ''}{year}</p>
        </div>
      </Link>
    </motion.div>
  );
}