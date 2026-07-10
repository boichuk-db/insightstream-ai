"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Globe, Type } from "lucide-react";

export function EditProjectModal({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: { id: string; name: string; domain: string | null } | null;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && project) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(project.name);
      setDomain(project.domain ?? "");
    }
  }, [isOpen, project]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project selected");
      const { data } = await api.patch(`/projects/${project.id}`, {
        name,
        domain,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || "Failed to update project. Please try again.");
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Project"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 bg-transparent border border-brand-muted hover:bg-brand-surface text-brand-fg"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white border-none shadow-brand-primary/30"
            onClick={() => {
              if (!name.trim()) return alert("Project name is required");
              if (!domain.trim())
                return alert("Project domain is required for security");
              updateMutation.mutate();
            }}
            isLoading={updateMutation.isPending}
            disabled={!name.trim() || !domain.trim()}
          >
            Save Changes
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
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-fg-muted" />
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
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-fg-muted" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
