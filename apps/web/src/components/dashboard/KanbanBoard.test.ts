import { describe, it, expect } from "vitest";
import { applyFilters, reorderColumns } from "./KanbanBoard";

const feedbacks = [
  {
    id: "1",
    content: "Login button broken",
    category: "Bug",
    tags: ["ui"],
    sentimentScore: 0.9,
  },
  {
    id: "2",
    content: "Add dark mode please",
    category: "Feature",
    tags: ["ui", "theme"],
    sentimentScore: 0.3,
  },
  {
    id: "3",
    content: "Great app overall",
    category: "Other",
    tags: [],
    sentimentScore: 0.8,
    aiSummary: "Users want a darker color scheme",
  },
];

describe("applyFilters", () => {
  it("filters by search text across content and aiSummary", () => {
    const byContent = applyFilters(feedbacks, "DARK Mode", [], false, []);
    expect(byContent.map((f) => f.id)).toEqual(["2"]);

    const byAiSummary = applyFilters(feedbacks, "color scheme", [], false, []);
    expect(byAiSummary.map((f) => f.id)).toEqual(["3"]);
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

describe("reorderColumns", () => {
  const columns = {
    New: [{ id: "a", status: "New" }, { id: "b", status: "New" }],
    Done: [{ id: "c", status: "Done" }],
  };

  it("reorders within the same column without a cross-column move", () => {
    const result = reorderColumns(
      columns,
      { droppableId: "New", index: 0 },
      { droppableId: "New", index: 1 },
    );
    expect(result.crossColumnMove).toBe(false);
    expect(result.columns.New.map((f: any) => f.id)).toEqual(["b", "a"]);
    expect(result.columns.Done).toEqual(columns.Done);
  });

  it("moves an item to a different column and flags crossColumnMove", () => {
    const result = reorderColumns(
      columns,
      { droppableId: "New", index: 0 },
      { droppableId: "Done", index: 1 },
    );
    expect(result.crossColumnMove).toBe(true);
    expect(result.columns.New.map((f: any) => f.id)).toEqual(["b"]);
    expect(result.columns.Done.map((f: any) => f.id)).toEqual(["c", "a"]);
  });

  it("updates the moved item's status to the destination column id", () => {
    const result = reorderColumns(
      columns,
      { droppableId: "New", index: 0 },
      { droppableId: "Done", index: 0 },
    );
    const moved = result.columns.Done.find((f: any) => f.id === "a");
    expect(moved.status).toBe("Done");
  });
});
