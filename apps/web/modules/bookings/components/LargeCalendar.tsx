import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useOverlayCalendarStore } from "@calcom/features/bookings/Booker/components/OverlayCalendar/store";
import { useAvailableTimeSlots } from "@calcom/features/bookings/Booker/hooks/useAvailableTimeSlots";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import type { BookableEventType } from "@calcom/features/bookings/Booker/types";
import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { Calendar } from "@calcom/features/calendars/weeklyview/components/Calendar";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import type {
  CalendarAvailableTimeslots,
  CalendarAvailableTimeslotsByResource,
  CalendarResource,
} from "@calcom/features/calendars/weeklyview/types/state";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import type { useScheduleForEventReturnType } from "@calcom/web/modules/schedules/hooks/useEvent";
import { useEffect, useMemo } from "react";
import { OutOfOfficeInSlots } from "./OutOfOfficeInSlots";

export const LargeCalendar = ({
  extraDays,
  schedule,
  isLoading,
  event,
  allEventType,
}: {
  extraDays: number;
  schedule?: useScheduleForEventReturnType["data"];
  isLoading: boolean;
  event: {
    data?: Pick<BookerEvent, "length"> | null;
  };
  allEventType?: BookableEventType[];
}) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStoreContext((state) => state.setSelectedTimeslot);
  const [selectedDatesAndTimes, setSelectedDatesAndTimes] = useBookerStoreContext((state) => [
    state.selectedDatesAndTimes,
    state.setSelectedDatesAndTimes,
  ]);
  const selectedEventDuration = useBookerStoreContext((state) => state.selectedDuration);
  const overlayEvents = useOverlayCalendarStore((state) => state.overlayBusyDates);
  const displayOverlay =
    getQueryParam("overlayCalendar") === "true" || localStorage?.getItem("overlayCalendarSwitchDefault");
  const { timezone } = useBookerTime();

  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = useAvailableTimeSlots({ schedule, eventDuration });

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();
  const selectedDayStart = dayjs(startDate).startOf("day");
  const selectedDayEnd = selectedDayStart.endOf("day");
  const resources = useMemo<CalendarResource[]>(
    () =>
      (allEventType ?? []).map((resource) => ({
        id: resource.id,
        slug: resource.slug,
        title: resource.title,
        length: resource.length,
      })),
    [allEventType]
  );

  const scheduleQueries = trpc.useQueries((t) =>
    resources.map((resource) =>
      t.viewer.slots.getSchedule({
        eventTypeId: resource.id,
        startTime: selectedDayStart.toISOString(),
        endTime: selectedDayEnd.toISOString(),
        timeZone: timezone,
      })
    )
  );

  // HACK: force rerender when overlay events change
  // Sine we dont use react router here we need to force rerender (ATOM SUPPORT)
  useEffect(() => {}, [displayOverlay]);

  const resourceTimeSlots = useMemo<CalendarAvailableTimeslotsByResource>(() => {
    return resources.reduce<CalendarAvailableTimeslotsByResource>((acc, resource, index) => {
      const queryData = scheduleQueries[index]?.data;
      const slotsForResource: CalendarAvailableTimeslots = {};

      if (!queryData?.slots) {
        acc[String(resource.id)] = slotsForResource;
        return acc;
      }

      for (const day in queryData.slots) {
        slotsForResource[day] = queryData.slots[day].map((slot) => ({
          ...slot,
          start: dayjs(slot.time).toDate(),
          end: dayjs(slot.time)
            .add(resource.length ?? eventDuration, "minutes")
            .toDate(),
        }));
      }

      acc[String(resource.id)] = slotsForResource;
      return acc;
    }, {});
  }, [eventDuration, resources, scheduleQueries]);

  const selectedCellKeys = useMemo(() => {
    if (!selectedDatesAndTimes) return [];

    return resources.flatMap((resource) => {
      const eventSelections = selectedDatesAndTimes[resource.slug] ?? {};
      return Object.values(eventSelections).flatMap((timeslots) =>
        timeslots.map((timeslot) => `${resource.id}|${timeslot}`)
      );
    });
  }, [resources, selectedDatesAndTimes]);

  const overlayEventsForDate = useMemo(() => {
    if (!overlayEvents || !displayOverlay) return [];
    return overlayEvents.map((event, id) => {
      return {
        id,
        start: dayjs(event.start).toDate(),
        end: dayjs(event.end).toDate(),
        title: "Busy",
        options: {
          status: "ACCEPTED",
          borderOnly: true,
        },
      } as CalendarEvent;
    });
  }, [overlayEvents, displayOverlay]);

  const isResourceMode = resources.length > 0;

  const handleCalendarCellClick = (date: Date, resource?: CalendarResource) => {
    const isoTime = date.toISOString();

    if (!resource) {
      setSelectedTimeslot(isoTime);
      return;
    }

    const dateKey = dayjs(isoTime).format("YYYY-MM-DD");
    const currentSelections = selectedDatesAndTimes ?? {};
    const currentSelectionsForResource = currentSelections[resource.slug] ?? {};
    const currentSelectionsForDate = currentSelectionsForResource[dateKey] ?? [];
    let nextSelectionsForDate = currentSelectionsForDate;

    if (currentSelectionsForDate.includes(isoTime)) {
      nextSelectionsForDate = currentSelectionsForDate.filter((value) => value !== isoTime);
    } else {
      nextSelectionsForDate = [...currentSelectionsForDate, isoTime].sort();
    }

    const nextSelections = {
      ...currentSelections,
      [resource.slug]: {
        ...currentSelectionsForResource,
        [dateKey]: nextSelectionsForDate,
      },
    };

    if (nextSelectionsForDate.length === 0) {
      delete nextSelections[resource.slug][dateKey];
    }

    setSelectedDatesAndTimes(nextSelections);
    setSelectedTimeslot(isoTime);
  };

  const isAnyResourceSchedulePending = scheduleQueries.some((query) => query.isPending);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        isPending={isLoading || isAnyResourceSchedulePending}
        calendarMode={isResourceMode ? "resource" : "date"}
        availableTimeslots={isResourceMode ? undefined : availableSlots}
        resourceTimeSlots={isResourceMode ? resourceTimeSlots : undefined}
        resources={isResourceMode ? resources : undefined}
        startHour={0}
        endHour={23}
        events={isResourceMode ? [] : overlayEventsForDate}
        startDate={startDate}
        endDate={isResourceMode ? startDate : endDate}
        onEmptyCellClick={handleCalendarCellClick}
        gridCellsPerHour={isResourceMode ? 4 : 60 / eventDuration}
        hoverEventDuration={isResourceMode ? 15 : eventDuration}
        hideHeader
        timezone={timezone}
        renderOutOfOffice={(props) => <OutOfOfficeInSlots {...props} />}
        selectedCellKeys={selectedCellKeys}
      />
    </div>
  );
};
