import type {
  CalendarAvailableTimeslotsByResource,
  CalendarResource,
} from "@calcom/features/calendars/weeklyview/types/state";

export type CalendarSelectionCell = {
  resourceId: number;
  resourceSlug: string;
  dateKey: string;
  isoTime: string;
};

export type SelectedDatesAndTimes = Record<string, Record<string, string[]>>;

export const getCalendarSelectionKey = ({
  resourceId,
  isoTime,
}: Pick<CalendarSelectionCell, "resourceId" | "isoTime">) => `${resourceId}|${isoTime}`;

export const createSelectableCells = ({
  resources,
  resourceTimeSlots,
}: {
  resources: CalendarResource[];
  resourceTimeSlots: CalendarAvailableTimeslotsByResource;
}): Map<string, CalendarSelectionCell> => {
  const selectableCells = new Map<string, CalendarSelectionCell>();

  for (const resource of resources) {
    const slotsByDate = resourceTimeSlots[String(resource.id)] ?? {};

    for (const [dateKey, slots] of Object.entries(slotsByDate)) {
      for (const slot of slots) {
        const isoTime = slot.start.toISOString();
        selectableCells.set(
          getCalendarSelectionKey({
            resourceId: resource.id,
            isoTime,
          }),
          {
            resourceId: resource.id,
            resourceSlug: resource.slug,
            dateKey,
            isoTime,
          }
        );
      }
    }
  }

  return selectableCells;
};

export const getRangeSelectionCells = ({
  anchorCell,
  targetCell,
  resources,
  selectableCells,
}: {
  anchorCell: CalendarSelectionCell;
  targetCell: CalendarSelectionCell;
  resources: CalendarResource[];
  selectableCells: Map<string, CalendarSelectionCell>;
}): CalendarSelectionCell[] => {
  const resourceIndexes = new Map(resources.map((resource, index) => [resource.id, index]));
  const orderedTimes = Array.from(
    new Set(Array.from(selectableCells.values()).map((cell) => cell.isoTime))
  ).sort();

  const anchorColumnIndex = resourceIndexes.get(anchorCell.resourceId);
  const targetColumnIndex = resourceIndexes.get(targetCell.resourceId);
  const anchorRowIndex = orderedTimes.indexOf(anchorCell.isoTime);
  const targetRowIndex = orderedTimes.indexOf(targetCell.isoTime);

  if (
    anchorColumnIndex === undefined ||
    targetColumnIndex === undefined ||
    anchorRowIndex === -1 ||
    targetRowIndex === -1
  ) {
    return [anchorCell];
  }

  const columnStart = Math.min(anchorColumnIndex, targetColumnIndex);
  const columnEnd = Math.max(anchorColumnIndex, targetColumnIndex);
  const timeStart = Math.min(anchorRowIndex, targetRowIndex);
  const timeEnd = Math.max(anchorRowIndex, targetRowIndex);
  const allowedTimes = new Set(orderedTimes.slice(timeStart, timeEnd + 1));

  return Array.from(selectableCells.values())
    .filter((cell) => {
      const resourceIndex = resourceIndexes.get(cell.resourceId);

      if (resourceIndex === undefined) {
        return false;
      }

      return (
        cell.dateKey === anchorCell.dateKey &&
        resourceIndex >= columnStart &&
        resourceIndex <= columnEnd &&
        allowedTimes.has(cell.isoTime)
      );
    })
    .sort((cellA, cellB) => {
      if (cellA.isoTime !== cellB.isoTime) {
        return cellA.isoTime.localeCompare(cellB.isoTime);
      }

      return cellA.resourceId - cellB.resourceId;
    });
};

export const applySelectionCells = ({
  currentSelections,
  cells,
  mode,
}: {
  currentSelections: SelectedDatesAndTimes;
  cells: CalendarSelectionCell[];
  mode: "add" | "remove";
}): SelectedDatesAndTimes => {
  const nextSelections: SelectedDatesAndTimes = Object.fromEntries(
    Object.entries(currentSelections).map(([resourceSlug, selectionsByDate]) => [
      resourceSlug,
      Object.fromEntries(Object.entries(selectionsByDate).map(([dateKey, slots]) => [dateKey, [...slots]])),
    ])
  );

  for (const cell of cells) {
    const resourceSelections = nextSelections[cell.resourceSlug] ?? {};
    const currentSlots = resourceSelections[cell.dateKey] ?? [];
    const slotExists = currentSlots.includes(cell.isoTime);

    resourceSelections[cell.dateKey] =
      mode === "add"
        ? slotExists
          ? currentSlots
          : [...currentSlots, cell.isoTime].sort()
        : currentSlots.filter((slot) => slot !== cell.isoTime);

    if (resourceSelections[cell.dateKey].length === 0) {
      delete resourceSelections[cell.dateKey];
    }

    if (Object.keys(resourceSelections).length === 0) {
      delete nextSelections[cell.resourceSlug];
    } else {
      nextSelections[cell.resourceSlug] = resourceSelections;
    }
  }

  return nextSelections;
};
