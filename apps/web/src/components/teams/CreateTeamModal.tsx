"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
            className="flex-1 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            onClick={onClose}
            disabled={createTeam.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white border-none shadow-[0_0_15px_rgba(99,102,241,0.3)]"
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
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">
            Team Name <span className="text-red-400">*</span>
          </label>
          <Input
            type="text"
            placeholder="e.g. Product Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}
