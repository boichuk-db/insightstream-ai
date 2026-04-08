import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const userProfileQuery = queryOptions({
  queryKey: ["userProfile"],
  queryFn: () => api.get("/users/me").then((r) => r.data),
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: () => api.get("/projects").then((r) => r.data),
});

export const feedbacksQuery = queryOptions({
  queryKey: ["feedbacks"],
  queryFn: () => api.get("/feedback").then((r) => r.data),
});

export const digestPreviewQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["digestPreview", projectId],
    queryFn: () =>
      api.get(`/digest/preview/${projectId}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
