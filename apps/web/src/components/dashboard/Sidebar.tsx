import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Plus, Sparkles, User, LayoutDashboard, ChevronDown, Check, Trash2, Settings, Users, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlanConfig, isPaidPlan, PlanType } from '@/lib/plans';

export function Sidebar({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  isDeletingProject,
  userProfile,
  onLogout,
  isOpen,
  onClose,
  teams,
  activeTeam,
  onSwitchTeam,
  userRole,
}: {
  projects: any[];
  activeProject: any;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  isDeletingProject: boolean;
  userProfile: any;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  teams?: any[];
  activeTeam?: any;
  onSwitchTeam?: (teamId: string) => void;
  userRole?: string | null;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed inset-y-0 left-0 w-64 h-screen bg-neutral-900 border-r border-neutral-800 shrink-0 z-50 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Brand & Team/Project Switcher */}
      <div className="p-5 flex flex-col gap-6 border-b border-neutral-800/50">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          InsightStream
        </div>

        {/* Team Switcher */}
        {teams && teams.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
              className="w-full flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 px-2">
                <Users className="h-4 w-4 text-neutral-400" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Team</span>
                  <span className="text-sm font-semibold text-neutral-200 truncate max-w-[130px]">
                    {activeTeam?.name || 'Select team'}
                  </span>
                </div>
              </div>
              {teams.length > 1 && (
                <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform", isTeamDropdownOpen && "rotate-180")} />
              )}
            </button>

            <AnimatePresence>
              {isTeamDropdownOpen && teams.length > 1 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTeamDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 w-full mt-2 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-20 overflow-hidden"
                  >
                    <div className="max-h-48 overflow-y-auto p-1">
                      {teams.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            onSwitchTeam?.(t.id);
                            setIsTeamDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-lg text-left text-sm transition-colors",
                            activeTeam?.id === t.id
                              ? "bg-indigo-500/10 text-indigo-400"
                              : "text-neutral-300 hover:bg-neutral-900"
                          )}
                        >
                          <span className="truncate pr-2">{t.name}</span>
                          {activeTeam?.id === t.id && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rx-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors group"
          >
            <div className="flex flex-col items-start px-2">
              <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-0.5">Active Project</span>
              <span className="text-sm font-semibold text-neutral-200 truncate max-w-[140px]">
                {activeProject?.name || 'Loading...'}
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform", isDropdownOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 w-full mt-2 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-20 overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto p-1">
                    {projects?.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p.id);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-lg text-left text-sm transition-colors",
                          activeProject?.id === p.id 
                            ? "bg-indigo-500/10 text-indigo-400" 
                            : "text-neutral-300 hover:bg-neutral-900"
                        )}
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        {activeProject?.id === p.id && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="p-1 border-t border-neutral-800">
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onCreateProject();
                      }}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Create New Project
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        <Link href="/dashboard" className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium text-sm transition-colors">
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </Link>
        <Link href="/settings" className="flex items-center gap-3 w-full p-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 font-medium text-sm transition-colors">
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <Link href="/dashboard/archive" className="flex items-center gap-3 w-full p-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 font-medium text-sm transition-colors">
          <Archive className="h-4 w-4" /> Archive
        </Link>
        {activeTeam && (
          <Link href="/settings/team" className="flex items-center gap-3 w-full p-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 font-medium text-sm transition-colors">
            <Users className="h-4 w-4" /> Team Settings
          </Link>
        )}

        <div className="my-2 border-t border-neutral-800/50 mx-2" />
        <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
          Project Actions
        </div>
        
        <button 
          onClick={() => {
            if (activeProject && confirm(`Delete project "${activeProject.name}" and ALL its feedback? This cannot be undone.`)) {
              onDeleteProject(activeProject.id);
            }
          }}
          disabled={isDeletingProject || projects.length <= 1}
          title={projects.length <= 1 ? "Cannot delete the last remaining project" : "Delete the active project"}
          className="flex items-center gap-3 w-full p-2.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 font-medium text-sm transition-colors disabled:opacity-50 disabled:hover:text-neutral-500 disabled:hover:bg-transparent disabled:cursor-not-allowed group"
        >
          <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" /> Delete Project
        </button>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-neutral-800/50 bg-neutral-900/50 mt-auto">
        <Link href="/settings" className="flex items-center gap-3 mb-4 group cursor-pointer rounded-lg p-1.5 -m-1.5 hover:bg-neutral-800/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 overflow-hidden text-neutral-400 group-hover:border-neutral-600 transition-colors">
            <User size={16} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-neutral-200 truncate group-hover:text-white transition-colors">
              {userProfile?.email || 'User'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                userProfile?.plan === PlanType.BUSINESS
                  ? "bg-amber-500/20 text-amber-400"
                  : userProfile?.plan === PlanType.PRO
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-neutral-800 text-neutral-500"
              )}>
                {getPlanConfig(userProfile?.plan || 'FREE').name}
              </span>
              {userRole && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  {userRole}
                </span>
              )}
              {!isPaidPlan(userProfile?.plan || 'FREE') && (
                <span className="text-[10px] text-indigo-400 font-medium">
                  Upgrade
                </span>
              )}
            </div>
          </div>
        </Link>
        <Button
          onClick={onLogout} 
          className="w-full bg-transparent border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 h-8 px-3 text-xs justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
      </div>
    </>
  );
}
