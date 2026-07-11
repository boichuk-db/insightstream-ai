import { describe, it, expect } from "vitest";
import { applyFilters } from "./KanbanBoard";

const feedbacks = [
  { id: "1", content: "Login button broken", category: "Bug", tags: ["ui"], sentimentScore: 0.9 },
  { id: "2", content: "Add dark mode please", category: "Feature", tags: ["ui", "theme"], sentimentScore: 0.3 },
  { id: "3", content: "Great app overall", category: "Other", tags: [], sentimentScore: 0.8 },
];

describe("applyFilters", () => {
  it("filters by search text across content and aiSummary", () => {
    const result = applyFilters(feedbacks, "dark mode", [], false, []);
    expect(result.map((f) => f.id)).toEqual(["2"]);
  });

  it("filters by selected categories", () => {
    const result = applyFilters(feedbacks, "", ["Bug"], false, []);
    expect(result.map((f) => f.id)).toEqual(["1"]);
  });

  it("filters by selected tags", () => {
    const result = applyFilters(feedbacks, "", [], false, ["theme"]);
    expect(result.map((f) => f.id)).toEqual(["2"]);
  });

  it("sorts by sentiment ascending when sortBySentiment is true", () => {
    const result = applyFilters(feedbacks, "", [], true, []);
    expect(result.map((f) => f.id)).toEqual(["2", "3", "1"]);
  });

  it("does not mutate the input array", () => {
    const original = [...feedbacks];
    applyFilters(feedbacks, "", [], true, []);
    expect(feedbacks).toEqual(original);
  });
});
