import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Globe, Type } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const queryClient = useQueryClient();
  const { activeTeamId } = useTeam();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/projects", {
        name,
        domain,
        teamId: activeTeamId,
      });
      return data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["planUsage"] });
      setName("");
      setDomain("");
      if (onCreated) onCreated(newProject.id);
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.data?.error === "PlanLimitExceeded") {
        alert(error.response.data.message);
      } else {
        alert("Failed to create project. Please try again.");
      }
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 bg-transparent border border-brand-muted hover:bg-brand-surface text-brand-fg"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white border-none shadow-brand-primary/30"
            onClick={() => {
              if (!name.trim()) return alert("Project name is required");
              if (!domain.trim())
                return alert("Project domain is required for security");
              createMutation.mutate();
            }}
            isLoading={createMutation.isPending}
            disabled={!name.trim() || !domain.trim() || !activeTeamId}
          >
            🚀 Create Project
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-fg ml-1">
            Project Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="e.g. My Awesome Startup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              required
            />
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-fg ml-1">
            Domain <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="e.g. my-startup.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="pl-10"
              required
            />
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>

        <p className="text-xs text-brand-muted pt-2 leading-relaxed">
          A unique API Key will be automatically generated. You can use this
          key to identify feedback from your website.
        </p>
      </div>
    </Modal>
  );
}
