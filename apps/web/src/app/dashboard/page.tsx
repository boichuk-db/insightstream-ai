'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Plus, MessageSquare, Sparkles, User, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newFeedback, setNewFeedback] = useState('');

  // Fetch feedback
  const { data: feedbacks, isLoading, isError, refetch } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const { data } = await api.get('/feedback');
      return data;
    },
  });

  // Create feedback mutation
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post('/feedback', { content, source: 'Web Dashboard' });
      return data;
    },
    onSuccess: () => {
      setNewFeedback('');
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: (error) => {
      console.error('Failed to create feedback:', error);
      alert('Failed to send feedback.');
    },
  });

  // Delete feedback mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: (error) => {
      console.error('Failed to delete feedback:', error);
      alert('Failed to delete feedback.');
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span>InsightStream Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 overflow-hidden text-neutral-400">
              <User size={18} />
            </div>
            <Button onClick={handleLogout} className="bg-transparent border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 h-8 px-3 text-xs">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Create Feedback Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
          
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-400" /> Let's test the Backend
          </h2>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (newFeedback.trim()) createMutation.mutate(newFeedback);
            }} 
            className="flex gap-4 items-start"
          >
            <Input 
              placeholder="What do you think about the platform so far?" 
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" isLoading={createMutation.isPending} disabled={!newFeedback.trim()}>
              Submit
            </Button>
          </form>
        </section>

        {/* Feedback List Section */}
        <section className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-neutral-400" /> Your Feedback
            </h2>
            <Button onClick={() => refetch()} className="bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 h-8 px-3 text-xs">
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-neutral-900/50 rounded-xl border border-neutral-800/50 animate-pulse" />
              ))
            ) : isError ? (
              <div className="col-span-full p-8 text-center border border-red-900/50 bg-red-950/20 rounded-xl text-red-400">
                Failed to load feedback. Make sure your API is running.
              </div>
            ) : feedbacks?.length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 flex flex-col items-center gap-3">
                <MessageSquare className="h-8 w-8 opacity-50" />
                No feedback submitted yet.<br/> Try creating one above!
              </div>
            ) : (
              <AnimatePresence>
                {feedbacks?.map((fb: any, index: number) => (
                  <motion.div
                    key={fb.id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                          {fb.source || 'Direct'}
                        </span>
                        {fb.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                            {fb.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-neutral-200 text-sm leading-relaxed mb-3">
                      {fb.content}
                    </p>

                    {fb.aiSummary && (
                      <div className="mb-4 p-2 bg-neutral-950/50 rounded border border-neutral-800/50">
                        <p className="text-[11px] text-neutral-400 italic leading-snug">
                          <Sparkles className="h-3 w-3 inline mr-1 text-indigo-400" />
                          {fb.aiSummary}
                        </p>
                      </div>
                    )}

                    {fb.tags && fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {fb.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-full border border-neutral-700">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-3 border-t border-neutral-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {fb.sentimentScore !== null && fb.sentimentScore !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-neutral-800 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all",
                                  fb.sentimentScore > 0.6 ? "bg-emerald-500" : fb.sentimentScore < 0.4 ? "bg-red-500" : "bg-amber-500"
                                )}
                                style={{ width: `${fb.sentimentScore * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-500 font-medium">
                              {Math.round(fb.sentimentScore * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this feedback?')) {
                            deleteMutation.mutate(fb.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-neutral-500 hover:text-red-400 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


