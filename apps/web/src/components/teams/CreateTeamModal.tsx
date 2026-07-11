"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { useTeam } from "@/hooks/useTeam";

export function CreateTeamModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const { createTeam } = useTeam();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await createTeam.mutateAsync(name.trim());
      setName("");
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create team");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Team"
      icon={<Users className="h-5 w-5 text-brand-accent" />}
      footer={
        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 bg-transparent border border-brand-border hover:bg-brand-surface-hover text-brand-fg-muted"
            onClick={onClose}
            disabled={createTeam.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white border-none shadow-brand-primary/30"
            onClick={handleSubmit}
            isLoading={createTeam.isPending}
            disabled={!name.trim()}
          >
            Create Team
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Team Name" required htmlFor="create-team-name">
          <Input
            id="create-team-name"
            type="text"
            placeholder="e.g. Product Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </FormField>
      </div>
    </Modal>
  );
}
