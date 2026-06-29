"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { api } from "@/lib/api";
import { userProfileQuery, projectsQuery } from "@/lib/queries";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMetrics } from "@/components/billing/UsageMetrics";
import { PricingCards } from "@/components/billing/PricingCards";

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();

  const { data: userProfile } = useQuery(userProfileQuery);
  const { data: projects } = useQuery(projectsQuery);

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await api.get("/teams");
      return data;
    },
  });

  const activeTeam = teams?.[0];
  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.replace("/");
  };

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("You're now subscribed! Welcome to your new plan.");
      router.replace("/dashboard/billing");
    }
  }, [searchParams, router]);

  return (
    <div className="flex h-full bg-brand-bg overflow-hidden">
      <Sidebar
        projects={projects || []}
        activeProject={activeProject}
        onSelectProject={setSelectedProjectId}
        onCreateProject={() => router.push("/dashboard")}
        onDeleteProject={() => {}}
        isDeletingProject={false}
        userProfile={userProfile}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        teams={teams}
        activeTeam={activeTeam}
      />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="brand-page-container">
          <div className="flex flex-col gap-6 max-w-3xl">
            <h1 className="text-2xl font-bold text-white">Billing</h1>
            <CurrentPlanCard />
            <UsageMetrics />
            <PricingCards />
          </div>
        </div>
      </main>
    </div>
  );
}
