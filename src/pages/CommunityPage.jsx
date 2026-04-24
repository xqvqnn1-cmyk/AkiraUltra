import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Heart, Send, Flame, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Navbar from '../components/layout/Navbar';

export default function CommunityPage() {
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  const queryClient = useQueryClient();

  // Using Activity entity as community posts
  const { data: posts = [] } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => base44.entities.Activity.list('-created_date', 50),
    initialData: [],
  });

  const createPost = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      setContent('');
    },
  });

  const handlePost = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    createPost.mutate({
      type: 'task_created',
      title: content.trim(),
      description: '',
    });
  };

  const discussionTopics = [
    { title: 'Best anime of Spring 2026?', replies: 142, hot: true },
    { title: 'Jujutsu Kaisen Culling Game - Predictions', replies: 89, hot: true },
    { title: 'Recommend me isekai anime', replies: 67, hot: false },
    { title: 'One Piece vs Naruto - which is better?', replies: 203, hot: true },
    { title: 'Underrated anime that deserve more attention', replies: 54, hot: false },
    { title: 'Anime adaptations vs manga - which do you prefer?', replies: 38, hot: false },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="pt-24 pb-20 px-6 md:px-16 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3 mb-1">
            <MessageCircle className="w-8 h-8 text-violet-400" /> Community
          </h1>
          <p className="text-gray-500">Discuss anime with fellow fans</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Post Box */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <form onSubmit={handlePost}>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Share your anime thoughts..."
                  className="w-full bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none min-h-[80px]"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!content.trim() || createPost.isPending}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  >
                    <Send className="w-3.5 h-3.5" /> Post
                  </button>
                </div>
              </form>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {['recent', 'popular'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  {tab === 'popular' ? <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" />Hot</span> : <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Recent</span>}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div className="space-y-3">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 hover:bg-white/[0.07] rounded-2xl p-4 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold">
                      {(post.created_by || 'A')[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-300 font-medium">{post.created_by?.split('@')[0] || 'Anonymous'}</span>
                    <span className="text-gray-600 text-xs ml-auto">{format(new Date(post.created_date), 'MMM d')}</span>
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed">{post.title}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <button className="flex items-center gap-1.5 text-gray-600 hover:text-red-400 transition-colors text-xs">
                      <Heart className="w-3.5 h-3.5" /> Like
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-600 hover:text-violet-400 transition-colors text-xs">
                      <MessageCircle className="w-3.5 h-3.5" /> Reply
                    </button>
                  </div>
                </motion.div>
              ))}

              {posts.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No posts yet. Start the conversation!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Hot Topics */}
          <div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-sm">Hot Topics</h3>
              </div>
              <div className="divide-y divide-white/5">
                {discussionTopics.map((topic, i) => (
                  <div key={i} className="p-3 hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2">
                      {topic.hot && <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />}
                      <p className="text-sm text-gray-300 hover:text-white transition-colors leading-snug">{topic.title}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 pl-5">{topic.replies} replies</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}