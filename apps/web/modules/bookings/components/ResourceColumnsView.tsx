import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import type { BookableResource } from "@calcom/features/bookings/Booker/types";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ResourceInfoButton } from "@calcom/features/calendars/weeklyview/components/ResourceInfoButton";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { useMemo } from "react";

type ResourceColumnsViewProps = {
  allEventType?: BookableResource[];
  isLoading: boolean;
  event: {
    data?: Pick<BookerEvent, "length"> | null;
  };
};

const getResourceSelections = (
  selectedDatesAndTimes: Record<string, Record<string, string[]>> | null,
  resourceSlug: string
) => {
  return selectedDatesAndTimes?.[resourceSlug] ?? {};
};

export const ResourceColumnsView = ({
  allEventType,
  isLoading,
  event,
}: ResourceColumnsViewProps): JSX.Element => {
  const { t, i18n } = useLocale();
  const { timeFormat, timezone } = useBookerTime();
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStoreContext((state) => state.setSelectedTimeslot);
  const [selectedDatesAndTimes, setSelectedDatesAndTimes] = useBookerStoreContext((state) => [
    state.selectedDatesAndTimes,
    state.setSelectedDatesAndTimes,
  ]);
  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);

  const selectedDay = selectedDate ? dayjs(selectedDate) : dayjs();
  const selectedDayStart = selectedDay.startOf("day");
  const selectedDayEnd = selectedDay.endOf("day");
  const eventDuration = selectedDuration || event.data?.length || 30;

  const resources = useMemo(() => allEventType ?? [], [allEventType]);

  const scheduleQueries = trpc.useQueries((queryBuilder) =>
    resources.map((resource) =>
      queryBuilder.viewer.slots.getSchedule({
        eventTypeId: resource.eventTypeId ?? resource.id,
        bookableResourceId: resource.bookableResourceId,
        startTime: selectedDayStart.toISOString(),
        endTime: selectedDayEnd.toISOString(),
        timeZone: timezone,
      })
    )
  );

  const isAnySchedulePending = isLoading || scheduleQueries.some((query) => query.isPending);

  const toggleSelection = (resource: BookableResource, isoTime: string) => {
    const dateKey = dayjs(isoTime).format("YYYY-MM-DD");
    const currentSelections = selectedDatesAndTimes ?? {};
    const resourceSelections = getResourceSelections(selectedDatesAndTimes, resource.slug);
    const currentDateSelections = resourceSelections[dateKey] ?? [];
    const isSelected = currentDateSelections.includes(isoTime);

    const nextDateSelections = isSelected
      ? currentDateSelections.filter((value) => value !== isoTime)
      : [...currentDateSelections, isoTime].sort();

    const nextSelections = {
      ...currentSelections,
      [resource.slug]: {
        ...resourceSelections,
        [dateKey]: nextDateSelections,
      },
    };

    if (nextDateSelections.length === 0) {
      delete nextSelections[resource.slug][dateKey];
    }

    if (Object.keys(nextSelections[resource.slug]).length === 0) {
      delete nextSelections[resource.slug];
    }

    setSelectedDatesAndTimes(nextSelections);

    const remainingSelections = Object.values(nextSelections).flatMap((resourceValues) =>
      Object.values(resourceValues).flat()
    );
    setSelectedTimeslot(remainingSelections[0] ?? null);
  };

  return (
    <div className="h-full overflow-x-auto px-5 py-4">
      <div className="no-scrollbar grid h-full min-w-max auto-cols-[220px] grid-flow-col gap-4 overflow-x-auto overflow-y-hidden pb-4 sm:auto-cols-[minmax(220px,1fr)]">
        {resources.map((resource, index) => {
          const queryData = scheduleQueries[index]?.data;
          const dateKey = selectedDay.format("YYYY-MM-DD");
          const slots = queryData?.slots?.[dateKey] ?? [];
          const resourceSelections = getResourceSelections(selectedDatesAndTimes, resource.slug);
          const selectedSlots = new Set(resourceSelections[dateKey] ?? []);

          return (
            <section
              key={resource.bookableResourceId ?? resource.id}
              className="border-subtle bg-default flex h-full min-h-0 min-w-[220px] flex-col rounded-2xl border shadow-sm">
              <header className="border-subtle flex items-start justify-between border-b px-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-emphasis">{resource.title}</h3>
                    <ResourceInfoButton
                      title={resource.title}
                      slug={resource.slug}
                      description={resource.description}
                    />
                  </div>
                  {/* <p className="mt-1 text-xs text-subtle">
                    {selectedSlots.size > 0
                      ? t("number_selected", { count: selectedSlots.size })
                      : selectedDay.locale(i18n.language).format("D MMM")}
                  </p> */}
                </div>
              </header>
              <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
                {isAnySchedulePending &&
                  Array.from({ length: 6 }).map((_, skeletonIndex) => (
                    <div key={skeletonIndex} className="bg-subtle h-16 animate-pulse rounded-xl" />
                  ))}
                {!isAnySchedulePending && slots.length === 0 && (
                  <div className="border-subtle bg-subtle rounded-xl border px-4 py-6 text-center text-sm text-subtle">
                    {t("unavailable")}
                  </div>
                )}
                {!isAnySchedulePending &&
                  slots.map((slot) => {
                    const totalSeats = resource.seatsPerTimeSlot ?? null;
                    const bookedSeats = slot.attendees ?? 0;
                    const hasSeatCapacity = !!totalSeats && totalSeats > 0;
                    const isFullyBooked = !!(hasSeatCapacity && bookedSeats >= totalSeats);
                    const availableSeats = hasSeatCapacity ? Math.max(totalSeats - bookedSeats, 0) : null;
                    const isSelected = selectedSlots.has(slot.time);
                    const occupancyRatio = hasSeatCapacity ? bookedSeats / totalSeats : 0;
                    const occupancyColorClass =
                      occupancyRatio >= 0.83
                        ? "bg-rose-600"
                        : occupancyRatio >= 0.5
                          ? "bg-yellow-500"
                          : "bg-emerald-400";

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={isFullyBooked}
                        onClick={() => toggleSelection(resource, slot.time)}
                        className={classNames(
                          "border-subtle text-left transition-colors rounded-xl border px-3 py-3 shadow-xs",
                          isSelected && "border-brand-default bg-brand-default text-brand",
                          !isSelected && !isFullyBooked && "bg-default hover:border-brand-default",
                          isFullyBooked && "bg-subtle text-muted cursor-not-allowed"
                        )}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {dayjs(slot.time).tz(timezone).locale(i18n.language).format(timeFormat)}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-subtle">
                            {/* <span>{eventDuration}m</span> */}
                            {hasSeatCapacity && (
                              <span className="flex items-center gap-1">
                                <span
                                  className={classNames(
                                    "inline-block h-2 w-2 rounded-full",
                                    occupancyColorClass
                                  )}
                                />
                                <span>{`${availableSeats}/${totalSeats}`}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
