import { queryOptions } from "@tanstack/react-query";
import type { IUser, IFeedback, IProject } from "@insightstream/shared-types";
import { api } from "./api";

export const userProfileQuery = queryOptions({
  queryKey: ["userProfile"],
  queryFn: () => api.get<IUser>("/users/me").then((r) => r.data),
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: () => api.get<IProject[]>("/projects").then((r) => r.data),
});

export const feedbacksQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["feedbacks", projectId],
    queryFn: () =>
      api
        .get<IFeedback[]>("/feedback", { params: { projectId } })
        .then((r) => r.data),
  });

export const digestPreviewQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["digestPreview", projectId],
    queryFn: () =>
      api.get(`/digest/preview/${projectId}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

export interface PlanStatus {
  plan: string;
  planStatus:
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'unpaid'
    | 'paused';
  trialEndsAt: string | null;
  stripePriceId: string | null;
  stripeSubscriptionId: string | null;
}

export const planStatusQuery = queryOptions({
  queryKey: ['planStatus'],
  queryFn: () => api.get<PlanStatus>('/plans/status').then((r) => r.data),
  staleTime: 60_000,
});

export const lastSeenQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['lastSeen', projectId],
    queryFn: () =>
      api
        .get<{ seenAt: string | null }>('/feedback/last-seen', {
          params: { projectId },
        })
        .then((r) => (r.data.seenAt ? new Date(r.data.seenAt) : null)),
    enabled: !!projectId,
  });

export const feedbackTrendsQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['feedbackTrends', projectId],
    queryFn: () =>
      api
        .get<{ name: string; emoji: string; count: number }[]>(
          '/feedback/trends',
          { params: { projectId } },
        )
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  });
