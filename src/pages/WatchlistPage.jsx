import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Play, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';

const STATUS_LABELS = {
  watching: { label: 'Watching', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  completed: { label: 'Completed', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  plan_to_watch: { label: 'Plan to Watch', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  dropped: { label: 'Dropped', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

export default function WatchlistPage() {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.WatchlistItem.list('-created_date', 200),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WatchlistItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.WatchlistItem.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="pt-24 pb-20 px-6 md:px-16 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">My List</h1>
          <p className="text-gray-500">{items.length} anime saved</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {['all', 'watching', 'completed', 'plan_to_watch', 'dropped'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              {f === 'all' ? 'All' : STATUS_LABELS[f]?.label}
              <span className="ml-2 text-xs opacity-60">
                {f === 'all' ? items.length : items.filter(i => i.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Star className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-gray-400 text-lg font-semibold">Your list is empty</p>
            <p className="text-gray-600 text-sm mt-1">Browse anime and add them to your list</p>
            <Link to="/browse" className="mt-6 inline-block bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-semibold transition-all">
              Browse Anime
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900">
                  {item.anime_image ? (
                    <img src={item.anime_image} alt={item.anime_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Star className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link
                      to={`/watch/${item.anime_id}`}
                      className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </Link>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="w-10 h-10 rounded-full bg-red-600/80 flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-white text-xs font-semibold line-clamp-2">{item.anime_title}</p>
                  <select
                    value={item.status}
                    onChange={e => updateMutation.mutate({ id: item.id, status: e.target.value })}
                    className={`mt-1 w-full text-[10px] font-medium rounded px-2 py-1 border cursor-pointer focus:outline-none bg-transparent ${STATUS_LABELS[item.status]?.color}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                      <option key={val} value={val} className="bg-[#1a1a2e] text-white">{label}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}