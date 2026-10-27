import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import { mergeUnavailableSlots } from "./mergeUnavailableSlots";

const slot = (hour: number, attendees?: number) => ({
  time: dayjs.utc(`2026-11-02T${hour}:00:00Z`),
  attendees,
});

describe("mergeUnavailableSlots", () => {
  it("keeps occupied slots between available slots in chronological order", () => {
    const result = mergeUnavailableSlots([slot(13), slot(14), slot(15)], [slot(15), slot(13)]);

    expect(result.map(({ time, unavailable }) => [time.hour(), !!unavailable])).toEqual([
      [13, false],
      [14, true],
      [15, false],
    ]);
  });

  it("keeps every scheduled slot when the whole day is occupied", () => {
    const result = mergeUnavailableSlots([slot(13), slot(14)], []);

    expect(result).toHaveLength(2);
    expect(result.every(({ unavailable }) => unavailable)).toBe(true);
  });

  it("preserves attendance data for partially filled seated slots", () => {
    const result = mergeUnavailableSlots([slot(13), slot(14)], [slot(13, 5)]);

    expect(result[0].attendees).toBe(5);
    expect(result[0].unavailable).toBeUndefined();
    expect(result[1].unavailable).toBe(true);
  });

  it("does not invent slots outside the schedule", () => {
    expect(mergeUnavailableSlots([], [])).toEqual([]);
  });

  it("preserves available slots shifted by buffers without duplicating scheduled slots", () => {
    const result = mergeUnavailableSlots([slot(13), slot(14)], [slot(14), slot(15)]);

    expect(result.map(({ time }) => time.hour())).toEqual([13, 14, 15]);
    expect(result[0].unavailable).toBe(true);
    expect(result[2].unavailable).toBeUndefined();
  });
});
