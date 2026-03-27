'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTeam } from '@/hooks/useTeam';

export function CreateTeamModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const { createTeam } = useTeam();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await createTeam.mutateAsync(name.trim());
      setName('');
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create team');
    }
  };

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
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" /> Create New Team
            </h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">
                Team Name <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Product Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>
          </div>

          <div className="p-6 pt-0 flex gap-3">
            <Button
              className="flex-1 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              onClick={onClose}
              disabled={createTeam.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              onClick={handleSubmit}
              isLoading={createTeam.isPending}
              disabled={!name.trim()}
            >
              Create Team
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
