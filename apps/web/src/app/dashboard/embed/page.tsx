'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { CreateProjectModal } from '@/components/dashboard/CreateProjectModal';
import { useTeam } from '@/hooks/useTeam';
import { useRouter } from 'next/navigation';
import { 
  Code, Sparkles, Check, Copy, Type, Maximize, 
  LayoutTemplate, Key, ArrowLeft, Menu, Globe, 
  Settings as SettingsIcon, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Sky', value: '#0ea5e9' },
];

const SHAPES = ['circle', 'square', 'rounded'] as const;
const POSITIONS = ['bottom-right', 'bottom-left'] as const;
const FRAMEWORKS = ['html', 'react', 'angular'] as const;

export default function EmbedPage() {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedShape, setSelectedShape] = useState<typeof SHAPES[number]>('rounded');
  const [selectedPosition, setSelectedPosition] = useState<typeof POSITIONS[number]>('bottom-right');
  const [selectedFramework, setSelectedFramework] = useState<typeof FRAMEWORKS[number]>('html');
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const { teams, activeTeam, switchTeam, userRole } = useTeam();

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data;
    },
  });

  const activeProject = projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];
  const apiKey = activeProject?.apiKey || 'LOADING...';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getSnippet = () => {
    const scriptUrl = process.env.NEXT_PUBLIC_WIDGET_URL || 'http://localhost:8080/dist/widget.iife.js';
    const keyPlaceholder = apiKey;

    if (selectedFramework === 'react') {
      return `import { useEffect } from 'react';

const INSIGHT_STREAM_API_KEY = '${keyPlaceholder}';

export default function InsightStreamWidget() {
  useEffect(() => {
    // 1. Set configuration
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };

    // 2. Load the widget script
    const script = document.createElement('script');
    script.src = "${scriptUrl}";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}`;
    }

    if (selectedFramework === 'angular') {
      return `import { Component, OnInit, OnDestroy } from '@angular/core';

const INSIGHT_STREAM_API_KEY = '${keyPlaceholder}';

@Component({
  selector: 'app-insight-stream',
  template: '',
  standalone: true
})
export class InsightStreamComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit() {
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };

    this.scriptElement = document.createElement('script');
    this.scriptElement.src = "${scriptUrl}";
    this.scriptElement.async = true;
    document.body.appendChild(this.scriptElement);
  }

  ngOnDestroy() {
    if (this.scriptElement && document.body.contains(this.scriptElement)) {
      document.body.removeChild(this.scriptElement);
    }
  }
}`;
    }

    return `<!-- InsightStream AI Widget -->
<script id="insight-stream-config">
  window.InsightStreamConfig = {
    apiKey: '${keyPlaceholder}',
    color: '${selectedColor.value}',
    shape: '${selectedShape}',
    position: '${selectedPosition}'
  };
</script>
<script src="${scriptUrl}"></script>`;
  };

  const snippet = getSnippet();

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.replace('/');
  };

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden text-brand-text">
      <Sidebar
        projects={projects || []}
        activeProject={activeProject}
        onSelectProject={setSelectedProjectId}
        onCreateProject={() => setIsCreateProjectModalOpen(true)}
        onDeleteProject={() => {}} // Disabled here
        isDeletingProject={false}
        userProfile={userProfile}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        teams={teams}
        activeTeam={activeTeam}
        onSwitchTeam={switchTeam}
        userRole={userRole}
      />

      <main className="flex-1 overflow-hidden flex flex-col bg-brand-bg/20">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="brand-page-container flex flex-col gap-10">
            
            {/* Header */}
            <header className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-white transition-colors"
                >
                  <Menu size={20} />
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-white transition-all hover:scale-105 active:scale-95 shadow-lg group"
                  title="Back to Dashboard"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Code className="text-indigo-400 h-8 w-8" /> Embed Widget
                  </h1>
                  <p className="text-brand-muted text-sm mt-1">Configure and install the feedback widget on your website.</p>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-20">
            
            {/* Configuration Column */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* Visual Config */}
              <section className="bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                <h2 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-indigo-400" /> Visual Configuration
                </h2>

                <div className="flex flex-col gap-12">
                  {/* Row 1: Colors (Full Width) */}
                  <div>
                    <h3 className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-4">Brand Color</h3>
                    <div className="flex gap-4 flex-wrap items-center">
                      <div className="flex gap-3 flex-wrap">
                        {COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                              "w-10 h-10 rounded-full transition-all flex items-center justify-center relative",
                              selectedColor.value === color.value 
                                ? "ring-2 ring-indigo-500 ring-offset-4 ring-offset-brand-surface bg-opacity-100 scale-110" 
                                : "opacity-60 hover:opacity-100 hover:scale-105"
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          >
                            {selectedColor.value === color.value && (
                              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                                <Check strokeWidth={4} className="text-white w-5 h-5 drop-shadow-md" />
                              </motion.div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10 ml-2">
                        <Info className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-tight">Launcher & Primary Accents</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-brand-border/20 w-full" />

                  {/* Row 2: Shape & Position (Side by side with more gap) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-4">Button Shape</h4>
                      <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit max-w-full overflow-x-auto no-scrollbar">
                        {SHAPES.map(shape => (
                          <button 
                            key={shape} 
                            onClick={() => setSelectedShape(shape)}
                            className={cn(
                              "min-w-[80px] px-3 py-2 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap",
                              selectedShape === shape 
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm" 
                                : "text-brand-muted hover:text-zinc-300 border border-transparent"
                            )}
                          >
                            {shape}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-4">Screen Position</h3>
                      <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit max-w-full overflow-x-auto no-scrollbar">
                        {POSITIONS.map(pos => (
                          <button 
                            key={pos} 
                            onClick={() => setSelectedPosition(pos)}
                            className={cn(
                              "min-w-[100px] px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap",
                              selectedPosition === pos 
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm" 
                                : "text-brand-muted hover:text-zinc-300 border border-transparent"
                            )}
                          >
                            {pos.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Implementation Snippet */}
              <section className="bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <LayoutTemplate className="h-5 w-5 text-indigo-400" /> Implementation Code
                  </h2>
                  <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit">
                    {FRAMEWORKS.map(fw => (
                      <button 
                        key={fw} 
                        onClick={() => setSelectedFramework(fw)}
                        className={cn(
                          "min-w-[70px] px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                          selectedFramework === fw 
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm" 
                            : "text-brand-muted hover:text-zinc-300 border border-transparent"
                        )}
                      >
                        {fw === 'html' ? 'HTML' : fw}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group/snippet">
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/snippet:opacity-100 transition-opacity z-10">
                    <Button
                      onClick={handleCopy}
                      className="h-8 px-3 text-[10px] bg-brand-surface border-brand-border hover:bg-zinc-800"
                    >
                      {copied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                      {copied ? 'Copied' : 'Copy Code'}
                    </Button>
                  </div>
                  <pre className="bg-brand-bg border border-brand-border p-5 rounded-xl overflow-x-auto text-sm text-indigo-200/80 font-mono leading-relaxed max-h-[400px] custom-scrollbar focus:ring-1 focus:ring-indigo-500/50 outline-none">
                    <code>{snippet}</code>
                  </pre>
                </div>

                <div className="mt-4 flex items-start gap-3 p-4 bg-brand-bg/50 rounded-xl border border-brand-border/50">
                  <Globe className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-brand-muted leading-relaxed">
                    {selectedFramework === 'html' && <>Paste this script into the <code>&lt;body&gt;</code> tag of your website. It handles loading and initialization automatically.</>}
                    {selectedFramework === 'react' && <>Import and use this component in your React <code>App.tsx</code> or layout wrapper. Make sure to install dependencies if needed.</>}
                    {selectedFramework === 'angular' && <>Use this standalone component in your Angular application at the root level for global feedback collection.</>}
                  </p>
                </div>
              </section>
            </div>

            {/* Sidebar / Info Column */}
            <div className="xl:col-span-5 space-y-6">
              
              {/* API Key Box */}
              <section className="bg-indigo-500 border border-indigo-400 rounded-2xl p-6 shadow-[0_0_30px_rgba(99,102,241,0.2)] text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Key className="h-5 w-5" /> Project API Key
                </h2>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-sm font-mono truncate">
                    {apiKey}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    className="shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all active:scale-95"
                  >
                    {copiedKey ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-xs text-indigo-100 leading-relaxed italic opacity-80">
                  * Keeping your API Key secure is important. Do not expose it in public repositories.
                </p>
              </section>

              {/* Instructions / Best Practices */}
              <section className="bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-6 shadow-xl space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400" /> Quick Installation Guide
                </h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-brand-bg flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-brand-border shrink-0">1</div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Select Project</h4>
                      <p className="text-xs text-brand-muted mt-1 leading-relaxed">Make sure you've selected the correct project in the sidebar before copying the code.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-brand-bg flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-brand-border shrink-0">2</div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Copy & Paste</h4>
                      <p className="text-xs text-brand-muted mt-1 leading-relaxed">Copy the generated code snippet and place it in your application's root component or HTML file.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-brand-bg flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-brand-border shrink-0">3</div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-200">Verify Connection</h3>
                      <p className="text-xs text-brand-muted mt-1 leading-relaxed">After installation, submit a test feedback. It should appear on your Kanban board instantly.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          </div>
        </div>
      </main>

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreated={(id) => setSelectedProjectId(id)}
      />
    </div>
  );
}
