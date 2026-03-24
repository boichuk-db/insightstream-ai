import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Globe, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CreateProjectModal({ 
  isOpen, 
  onClose,
  onCreated 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/projects', { name, domain });
      return data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setName('');
      setDomain('');
      if (onCreated) onCreated(newProject.id);
      onClose();
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Create New Project
            </h3>
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 ml-1">Project Name <span className="text-red-400">*</span></label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. My Awesome Startup"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 ml-1">Domain <span className="text-red-400">*</span></label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. my-startup.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="pl-10"
                  required
                />
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              </div>
            </div>
            
            <p className="text-xs text-neutral-500 pt-2 leading-relaxed">
              A unique API Key will be automatically generated. You can use this key to identify feedback from your website.
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 pt-0 flex gap-3">
            <Button 
              className="flex-1 bg-transparent border border-neutral-700 hover:bg-neutral-800 text-neutral-300"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              onClick={() => {
                if (!name.trim()) return alert('Project name is required');
                if (!domain.trim()) return alert('Project domain is required for security');
                createMutation.mutate();
              }}
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
