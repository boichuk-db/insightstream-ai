"use client";

import { useState } from "react";
import { Globe, Type } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";

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
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/teams/${teamId}/projects`, {
        name,
        domain,
      });
      return data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["planUsage"] });
      setName("");
      setDomain("");
      onCreated?.(newProject.id);
      onClose();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to create project");
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Team Project"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 bg-transparent border border-brand-border hover:bg-brand-surface-hover text-brand-fg-muted"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white border-none shadow-brand-primary/30"
            onClick={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
            disabled={!name.trim() || !domain.trim()}
          >
            🚀 Create Project
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormField
          label="Project Name"
          required
          icon={Type}
          htmlFor="create-team-project-name"
        >
          <Input
            id="create-team-project-name"
            type="text"
            placeholder="e.g. My Awesome App"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </FormField>

        <FormField
          label="Domain"
          required
          icon={Globe}
          htmlFor="create-team-project-domain"
        >
          <Input
            id="create-team-project-domain"
            type="text"
            placeholder="e.g. my-app.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}
