"use client";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { Calendar } from "@calcom/features/calendars/weeklyview/components/Calendar";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import type { CalendarResource } from "@calcom/features/calendars/weeklyview/types/state";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { useBanners } from "@calcom/web/modules/shell/banners/useBanners";
import { useMemo } from "react";
import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingOutput } from "../types";

type BookingCalendarViewProps = {
  bookings: BookingOutput[];
  currentDate: dayjs.Dayjs;
};

export function BookingCalendarView({ bookings, currentDate }: BookingCalendarViewProps) {
  const { t } = useLocale();
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const selectedBookingUid = useBookingDetailsSheetStore((state) => state.selectedBookingUid);
  const { timezone } = useTimePreferences();
  const { resolvedTheme, forcedTheme } = useGetTheme();
  const { bannersHeight } = useBanners();
  const eventTypesQuery = trpc.viewer.eventTypes.listWithTeam.useQuery();

  const startDate = useMemo(() => currentDate.toDate(), [currentDate]);
  const endDate = useMemo(() => currentDate.toDate(), [currentDate]);

  const getAttendeeDisplayName = (booking: BookingOutput) => {
    const attendee = booking.attendees[0];
    if (!attendee) {
      return t("booking").toLowerCase();
    }

    const displayName = attendee.name || attendee.email || attendee.phoneNumber || t("booking").toLowerCase();
    return attendee.name ? displayName : displayName.split("@")[0];
  };

  const events = useMemo<CalendarEvent[]>(() => {
    const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";

    return bookings
      .filter((booking) => dayjs(booking.startTime).isSame(currentDate, "day"))
      .sort((a, b) => {
        const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (startDiff !== 0) return startDiff;
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      })
      .map((booking, idx) => {
        // Parse eventTypeColor and extract the appropriate color based on theme
        const eventTypeColor =
          booking.eventType?.eventTypeColor &&
          booking.eventType.eventTypeColor[hasDarkTheme ? "darkEventTypeColor" : "lightEventTypeColor"];

        return {
          id: idx,
          title: `${booking.eventType?.title ?? booking.title} бронь ${getAttendeeDisplayName(booking)}`,
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          resourceId: booking.eventType?.id,
          options: {
            status: booking.status,
            ...(eventTypeColor && { color: eventTypeColor }),
            bookingUid: booking.uid,
          },
        };
      });
  }, [bookings, currentDate, forcedTheme, resolvedTheme, t]);

  const resources = useMemo<CalendarResource[]>(() => {
    const eventTypes = Array.from(new Map((eventTypesQuery.data ?? []).map((eventType) => [eventType.id, eventType])).values());

    return eventTypes
      .filter(
        (
          eventType
        ): eventType is typeof eventType & {
          id: number;
          slug: string;
          title: string;
        } => Boolean(eventType.id && eventType.slug && eventType.title)
      )
      .map((eventType) => ({
        id: eventType.id,
        slug: eventType.slug,
        title: eventType.title,
        length: eventType.length,
      }));
  }, [eventTypesQuery.data]);

  return (
    <>
      <div
        className="border-subtle flex flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-2xl border"
        style={{ height: `calc(100vh - 6rem - ${bannersHeight}px)` }}>
        <Calendar
          calendarMode="resource"
          timezone={timezone}
          sortEvents
          startHour={0}
          endHour={23}
          events={events}
          resources={resources}
          startDate={startDate}
          endDate={endDate}
          gridCellsPerHour={4}
          hoverEventDuration={0}
          showBackgroundPattern={false}
          showBorder={false}
          borderColor="subtle"
          selectedBookingUid={selectedBookingUid}
          allowVerticalScroll
          onEventClick={(event) => {
            const bookingUid = event.options?.bookingUid;
            if (bookingUid) {
              setSelectedBookingUid(bookingUid);
            }
          }}
          showTimezone
          hideHeader
          updateCurrentTimeOnFocus
        />
      </div>
    </>
  );
}
