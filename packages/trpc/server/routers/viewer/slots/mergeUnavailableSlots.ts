import type { Dayjs } from "@calcom/dayjs";

export function mergeUnavailableSlots<T extends { time: Dayjs }>(scheduledSlots: T[], availableSlots: T[]) {
  const slots = new Map<number, T & { unavailable?: boolean }>(
    scheduledSlots.map((slot) => [slot.time.valueOf(), { ...slot, unavailable: true }])
  );

  for (const slot of availableSlots) {
    slots.set(slot.time.valueOf(), slot);
  }

  return Array.from(slots.values()).sort((a, b) => a.time.valueOf() - b.time.valueOf());
}
