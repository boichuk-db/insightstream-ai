'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Type } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateTeamProjectModal({
  isOpen,
  onClose,
  teamId,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onCreated?: (projectId: string) => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/teams/${teamId}/projects`, { name, domain });
      return data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['teamProjects', teamId] });
      setName('');
      setDomain('');
      onCreated?.(newProject.id);
      onClose();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to create project');
    },
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-brand-bg border border-brand-border rounded-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <h3 className="text-xl font-bold text-white">Create Team Project</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">
                Project Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. My Awesome App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">
                Domain <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. my-app.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="pl-10"
                />
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
              </div>
            </div>
          </div>

          <div className="p-6 pt-0 flex gap-3">
            <Button
              className="flex-1 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              onClick={() => createMutation.mutate()}
              isLoading={createMutation.isPending}
              disabled={!name.trim() || !domain.trim()}
            >
              🚀 Create Project
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
