import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Star } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

const JIKAN = 'https://api.jikan.moe/v4';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SchedulePage() {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${JIKAN}/schedules/${activeDay}?limit=25`);
        const data = await res.json();
        setSchedule(prev => ({ ...prev, [activeDay]: data.data || [] }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (!schedule[activeDay]) load();
    else setLoading(false);
  }, [activeDay]);

  const animeList = schedule[activeDay] || [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="pt-24 pb-20 px-6 md:px-16 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3 mb-1">
            <Calendar className="w-8 h-8 text-violet-400" /> Airing Schedule
          </h1>
          <p className="text-gray-500">Currently airing anime by day</p>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {DAYS.map((day, i) => {
            const isToday = day === DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${activeDay === day ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
              >
                {DAY_LABELS[i]}
                {isToday && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {animeList.map(anime => {
              const image = anime.images?.jpg?.image_url;
              return (
                <Link key={anime.mal_id} to={`/anime/${anime.mal_id}`} className="group flex gap-4 p-4 bg-white/5 hover:bg-white/8 rounded-xl border border-white/5 hover:border-violet-500/20 transition-all">
                  <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                    {image && <img src={image} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-violet-300 transition-colors">{anime.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(anime.genres || []).slice(0, 2).map(g => (
                        <span key={g.name} className="text-[10px] text-violet-300 bg-violet-600/10 border border-violet-500/20 rounded px-1.5 py-0.5">{g.name}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {anime.score && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3 fill-current" /> {anime.score}
                        </span>
                      )}
                      {anime.episodes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {anime.episodes} eps</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}