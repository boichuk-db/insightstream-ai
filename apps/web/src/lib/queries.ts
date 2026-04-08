import { queryOptions } from "@tanstack/react-query";
import type { IUser, IFeedback } from "@insightstream/shared-types";
import { api } from "./api";

interface IProject {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  userId: string;
  createdAt: string;
}

export const userProfileQuery = queryOptions({
  queryKey: ["userProfile"],
  queryFn: () => api.get<IUser>("/users/me").then((r) => r.data),
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: () => api.get<IProject[]>("/projects").then((r) => r.data),
});

export const feedbacksQuery = queryOptions({
  queryKey: ["feedbacks"],
  queryFn: () => api.get<IFeedback[]>("/feedback").then((r) => r.data),
});

export const digestPreviewQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["digestPreview", projectId],
    queryFn: () =>
      api.get(`/digest/preview/${projectId}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  });
