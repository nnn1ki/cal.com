import type { CalendarAvailableTimeslotsByResource } from "@calcom/features/calendars/weeklyview/types/state";
import { describe, expect, it } from "vitest";
import {
  applySelectionCells,
  createSelectableCells,
  getRangeSelectionCells,
  type SelectedDatesAndTimes,
} from "./LargeCalendarSelection";

const resources = [
  { id: 1, slug: "resource-a", title: "Resource A", length: 30 },
  { id: 2, slug: "resource-b", title: "Resource B", length: 30 },
  { id: 3, slug: "resource-c", title: "Resource C", length: 30 },
];

const resourceTimeSlots: CalendarAvailableTimeslotsByResource = {
  "1": {
    "2026-05-12": [
      { start: new Date("2026-05-12T09:00:00.000Z"), end: new Date("2026-05-12T09:30:00.000Z") },
      { start: new Date("2026-05-12T09:15:00.000Z"), end: new Date("2026-05-12T09:45:00.000Z") },
    ],
  },
  "2": {
    "2026-05-12": [
      { start: new Date("2026-05-12T09:00:00.000Z"), end: new Date("2026-05-12T09:30:00.000Z") },
      { start: new Date("2026-05-12T09:15:00.000Z"), end: new Date("2026-05-12T09:45:00.000Z") },
    ],
  },
  "3": {
    "2026-05-12": [
      { start: new Date("2026-05-12T09:15:00.000Z"), end: new Date("2026-05-12T09:45:00.000Z") },
    ],
  },
};

describe("LargeCalendarSelection", () => {
  it("builds a rectangular range across resources and times", () => {
    const selectableCells = createSelectableCells({ resources, resourceTimeSlots });

    const range = getRangeSelectionCells({
      anchorCell: selectableCells.get("1|2026-05-12T09:00:00.000Z")!,
      targetCell: selectableCells.get("3|2026-05-12T09:15:00.000Z")!,
      resources,
      selectableCells,
    });

    expect(range).toEqual([
      {
        resourceId: 1,
        resourceSlug: "resource-a",
        dateKey: "2026-05-12",
        isoTime: "2026-05-12T09:00:00.000Z",
      },
      {
        resourceId: 2,
        resourceSlug: "resource-b",
        dateKey: "2026-05-12",
        isoTime: "2026-05-12T09:00:00.000Z",
      },
      {
        resourceId: 1,
        resourceSlug: "resource-a",
        dateKey: "2026-05-12",
        isoTime: "2026-05-12T09:15:00.000Z",
      },
      {
        resourceId: 2,
        resourceSlug: "resource-b",
        dateKey: "2026-05-12",
        isoTime: "2026-05-12T09:15:00.000Z",
      },
      {
        resourceId: 3,
        resourceSlug: "resource-c",
        dateKey: "2026-05-12",
        isoTime: "2026-05-12T09:15:00.000Z",
      },
    ]);
  });

  it("adds and removes range cells from the selection map", () => {
    const currentSelections: SelectedDatesAndTimes = {
      "resource-a": {
        "2026-05-12": ["2026-05-12T09:00:00.000Z"],
      },
    };

    const nextSelections = applySelectionCells({
      currentSelections,
      cells: [
        {
          resourceId: 2,
          resourceSlug: "resource-b",
          dateKey: "2026-05-12",
          isoTime: "2026-05-12T09:00:00.000Z",
        },
        {
          resourceId: 2,
          resourceSlug: "resource-b",
          dateKey: "2026-05-12",
          isoTime: "2026-05-12T09:15:00.000Z",
        },
      ],
      mode: "add",
    });

    expect(nextSelections).toEqual({
      "resource-a": {
        "2026-05-12": ["2026-05-12T09:00:00.000Z"],
      },
      "resource-b": {
        "2026-05-12": ["2026-05-12T09:00:00.000Z", "2026-05-12T09:15:00.000Z"],
      },
    });

    const afterRemove = applySelectionCells({
      currentSelections: nextSelections,
      cells: [
        {
          resourceId: 2,
          resourceSlug: "resource-b",
          dateKey: "2026-05-12",
          isoTime: "2026-05-12T09:00:00.000Z",
        },
      ],
      mode: "remove",
    });

    expect(afterRemove).toEqual({
      "resource-a": {
        "2026-05-12": ["2026-05-12T09:00:00.000Z"],
      },
      "resource-b": {
        "2026-05-12": ["2026-05-12T09:15:00.000Z"],
      },
    });
  });
});
