"use client";

import dayjs from "@calcom/dayjs";
import { formatDateInRussian } from "@calcom/lib/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { Calendar } from "@calcom/features/calendars/weeklyview/components/Calendar";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { DatePicker, Select, ToggleGroup } from "@calcom/ui/components/form";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { useBanners } from "@calcom/web/modules/shell/banners/useBanners";
import { useEffect, useMemo, useState } from "react";

import { useCurrentBookingTableDate } from "../hooks/useCurrentBookingTableDate";
import {
  BookingDetailsSheetStoreProvider,
  useBookingDetailsSheetStore,
} from "../store/bookingDetailsSheetStore";
import type { BookingListingStatus, BookingsGetOutput } from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { ViewToggleButton } from "./ViewToggleButton";

const BOOKING_STATUSES: BookingListingStatus[] = ["upcoming", "unconfirmed", "recurring", "past"];

type ResourceOption = {
  label: string;
  value: number;
};

type Period = "week" | "month" | "threeMonths";

type ResourceOccupancyContainerProps = {
  bookingsV3Enabled: boolean;
};

function getPeriodEndDate(startDate: dayjs.Dayjs, period: Period) {
  if (period === "week") return startDate.add(6, "day").endOf("day");
  if (period === "month") return startDate.add(1, "month").subtract(1, "day").endOf("day");
  return startDate.add(3, "month").subtract(1, "day").endOf("day");
}

function ResourceOccupancyCalendar({
  bookings,
  startDate,
  endDate,
  period,
  isPending,
}: {
  bookings: BookingsGetOutput["bookings"];
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  period: Period;
  isPending: boolean;
}) {
  const { t } = useLocale();
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const selectedBookingUid = useBookingDetailsSheetStore((state) => state.selectedBookingUid);
  const { timezone } = useTimePreferences();
  const { resolvedTheme, forcedTheme } = useGetTheme();
  const { bannersHeight } = useBanners();

  const events = useMemo<CalendarEvent[]>(() => {
    const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";

    return [...bookings]
      .sort((firstBooking, secondBooking) => {
        const startDifference =
          dayjs(firstBooking.startTime).valueOf() - dayjs(secondBooking.startTime).valueOf();
        if (startDifference !== 0) return startDifference;
        return dayjs(firstBooking.endTime).valueOf() - dayjs(secondBooking.endTime).valueOf();
      })
      .map((booking, index) => {
        const eventTypeColor =
          booking.eventType?.eventTypeColor &&
          booking.eventType.eventTypeColor[hasDarkTheme ? "darkEventTypeColor" : "lightEventTypeColor"];
        const totalSeats = booking.eventType?.seatsPerTimeSlot;
        const occupiedSeats = booking.attendees.length;
        const title = totalSeats && totalSeats > 0 ? `${occupiedSeats}/${totalSeats}` : t("occupied");

        return {
          id: index,
          title,
          description: booking.eventType?.title ?? booking.title,
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          options: {
            status: booking.status,
            ...(eventTypeColor && { color: eventTypeColor }),
            bookingUid: booking.uid,
          },
        };
      });
  }, [bookings, forcedTheme, resolvedTheme, t]);

  return (
    <div
      className="border-subtle flex flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-2xl border"
      style={{ height: `calc(100vh - 6rem - ${bannersHeight}px)` }}>
      <Calendar
        calendarMode="date"
        timezone={timezone}
        sortEvents
        startHour={0}
        endHour={23}
        events={events}
        startDate={startDate.toDate()}
        endDate={endDate.toDate()}
        maxVisibleDays={period === "week" ? 7 : period === "month" ? 31 : 92}
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
        isPending={isPending}
        updateCurrentTimeOnFocus
      />
    </div>
  );
}

function ResourceOccupancyInner({
  bookings,
  eventTypeOptions,
  isPending,
  errorMessage,
  bookingsV3Enabled,
  period,
  periodEndDate,
  selectedEventTypeId,
  onPeriodChange,
  onSelectedEventTypeChange,
}: {
  bookings: BookingsGetOutput["bookings"];
  eventTypeOptions: ResourceOption[];
  isPending: boolean;
  errorMessage?: string;
  bookingsV3Enabled: boolean;
  period: Period;
  periodEndDate: dayjs.Dayjs;
  selectedEventTypeId: number | null;
  onPeriodChange: (period: Period) => void;
  onSelectedEventTypeChange: (eventTypeId: number | null) => void;
}) {
  const { t } = useLocale();
  const user = useMeQuery().data;
  const { currentTableDate, setCurrentTableDate } = useCurrentBookingTableDate();

  const selectedEventType =
    eventTypeOptions.find((eventType) => eventType.value === selectedEventTypeId) ?? null;

  if (errorMessage) {
    return <Alert severity="error" title={t("something_went_wrong")} message={errorMessage} />;
  }

  if (eventTypeOptions.length === 0 && !isPending) {
    return (
      <EmptyScreen
        Icon="calendar"
        headline={t("no_booking")}
        description={t("no_bookings_in_selected_period")}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-64 grow sm:max-w-sm">
          <Select<ResourceOption>
            options={eventTypeOptions}
            value={selectedEventType}
            onChange={(option) => onSelectedEventTypeChange(option?.value ?? null)}
            placeholder={t("select_booking_resource")}
            isLoading={isPending}
          />
        </div>
        <ToggleGroup
          value={period}
          onValueChange={(value: Period) => {
            if (value) onPeriodChange(value);
          }}
          options={[
            { value: "week", label: t("resource_calendar_week") },
            { value: "month", label: t("resource_calendar_month") },
            { value: "threeMonths", label: t("three_months") },
          ]}
        />
        <div className="hidden grow lg:block" />
        <DatePicker
          date={currentTableDate.toDate()}
          onDatesChange={(date) => setCurrentTableDate(dayjs(date).startOf("day"))}
          minDate={null}
          label={formatDateInRussian(currentTableDate)}
        />
        <ViewToggleButton bookingsV3Enabled={bookingsV3Enabled} />
      </div>
      <ResourceOccupancyCalendar
        bookings={bookings}
        startDate={currentTableDate.startOf("day")}
        endDate={periodEndDate}
        period={period}
        isPending={isPending}
      />
      <BookingDetailsSheet
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
      />
    </>
  );
}

export function ResourceOccupancyContainer({ bookingsV3Enabled }: ResourceOccupancyContainerProps) {
  const { currentTableDate } = useCurrentBookingTableDate();
  const [period, setPeriod] = useState<Period>("week");
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const eventTypesQuery = trpc.viewer.eventTypes.listWithTeam.useQuery();

  const eventTypeOptions = useMemo<ResourceOption[]>(
    () =>
      (eventTypesQuery.data ?? []).map((eventType) => ({
        label: eventType.title,
        value: eventType.id,
      })),
    [eventTypesQuery.data]
  );

  useEffect(() => {
    if (eventTypeOptions.length > 0 && selectedEventTypeId === null) {
      setSelectedEventTypeId(eventTypeOptions[0].value);
    }
  }, [eventTypeOptions, selectedEventTypeId]);

  const periodEndDate = useMemo(
    () => getPeriodEndDate(currentTableDate.startOf("day"), period),
    [currentTableDate, period]
  );

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 100,
      filters: {
        statuses: BOOKING_STATUSES,
        eventTypeIds: selectedEventTypeId ? [selectedEventTypeId] : undefined,
        afterStartDate: currentTableDate.startOf("day").toISOString(),
        beforeEndDate: periodEndDate.toISOString(),
      },
    },
    {
      enabled: selectedEventTypeId !== null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage]);

  const bookings = useMemo(
    () => query.data?.pages.flatMap((page) => page.bookings) ?? [],
    [query.data?.pages]
  );

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <ResourceOccupancyInner
        bookings={bookings}
        eventTypeOptions={eventTypeOptions}
        isPending={eventTypesQuery.isPending || query.isPending}
        errorMessage={query.error?.message}
        bookingsV3Enabled={bookingsV3Enabled}
        period={period}
        periodEndDate={periodEndDate}
        selectedEventTypeId={selectedEventTypeId}
        onPeriodChange={setPeriod}
        onSelectedEventTypeChange={setSelectedEventTypeId}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
