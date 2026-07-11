import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedbackStatus, type IFeedback } from "@insightstream/shared-types";
import { FeedbackFeed } from "./FeedbackFeed";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  } as unknown as typeof api,
}));

const feedbackFixtures: IFeedback[] = [
  {
    id: "1",
    content: "Login button is broken on Safari",
    source: "widget",
    sentimentScore: 0.2,
    category: "Bug",
    status: FeedbackStatus.NEW,
    tags: ["ui"],
    userId: "u1",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "2",
    content: "Love the new dashboard design",
    source: "widget",
    sentimentScore: 0.9,
    category: "Feedback",
    status: FeedbackStatus.NEW,
    tags: ["ui"],
    userId: "u1",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
  },
  {
    id: "3",
    content: "Please add SSO support",
    source: "email",
    sentimentScore: 0.5,
    category: "Feature",
    status: FeedbackStatus.IN_REVIEW,
    tags: [],
    userId: "u1",
    createdAt: "2026-07-03T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z",
  },
  {
    id: "4",
    content: "Old ticket, no longer relevant",
    source: "widget",
    sentimentScore: 0.5,
    category: "Other",
    status: FeedbackStatus.ARCHIVED,
    tags: [],
    userId: "u1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  },
];

function mockApiGet(url: string) {
  if (url === "/feedback") {
    return Promise.resolve({ data: feedbackFixtures });
  }
  if (url === "/feedback/last-seen") {
    return Promise.resolve({ data: { seenAt: null } });
  }
  if (url === "/feedback/trends") {
    return Promise.resolve({ data: [] });
  }
  return Promise.reject(new Error(`Unhandled GET ${url}`));
}

function renderFeedbackFeed() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FeedbackFeed projectId="proj-1" />
    </QueryClientProvider>,
  );
}

describe("FeedbackFeed", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockClear().mockImplementation(mockApiGet);
  });

  it("shows non-archived feedback by default and hides archived items", async () => {
    renderFeedbackFeed();

    expect(
      await screen.findByText("Login button is broken on Safari"),
    ).toBeInTheDocument();
    expect(screen.getByText("Love the new dashboard design")).toBeInTheDocument();
    expect(screen.getByText("Please add SSO support")).toBeInTheDocument();
    expect(
      screen.queryByText("Old ticket, no longer relevant"),
    ).not.toBeInTheDocument();
  });

  it("filters to a single status when its tab is clicked", async () => {
    const user = userEvent.setup();
    renderFeedbackFeed();
    await screen.findByText("Login button is broken on Safari");

    await user.click(screen.getByRole("button", { name: /^In Review\d+$/ }));

    await waitFor(() => {
      expect(screen.getByText("Please add SSO support")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Login button is broken on Safari"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Love the new dashboard design"),
    ).not.toBeInTheDocument();
  });

  it("shows archived items only on the Archived tab", async () => {
    const user = userEvent.setup();
    renderFeedbackFeed();
    await screen.findByText("Login button is broken on Safari");

    await user.click(screen.getByRole("button", { name: /^Archived\d+$/ }));

    await waitFor(() => {
      expect(screen.getByText("Old ticket, no longer relevant")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Login button is broken on Safari"),
    ).not.toBeInTheDocument();
  });

  it("filters to negative sentiment when the sentiment chip is clicked", async () => {
    const user = userEvent.setup();
    renderFeedbackFeed();
    await screen.findByText("Login button is broken on Safari");

    await user.click(screen.getByRole("button", { name: /^😞 Negative$/ }));

    await waitFor(() => {
      expect(
        screen.queryByText("Love the new dashboard design"),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText("Login button is broken on Safari"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Please add SSO support")).not.toBeInTheDocument();
  });
});
