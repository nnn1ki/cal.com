"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { DatePicker } from "@calcom/ui/components/form";
import { ChevronLeftIcon, ChevronRightIcon } from "@coss/ui/icons";
import { useEffect, useMemo } from "react";
import { useBookingFilters } from "../hooks/useBookingFilters";
import { useBookingStatusTab } from "../hooks/useBookingStatusTab";
import { useCalendarAutoSelector } from "../hooks/useCalendarAutoSelector";
import { useCurrentBookingTableDate } from "../hooks/useCurrentBookingTableDate";
import {
  BookingDetailsSheetStoreProvider,
  useBookingDetailsSheetStore,
} from "../store/bookingDetailsSheetStore";
import type { BookingListingStatus, BookingsGetOutput } from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingTableView } from "./BookingTableView";
import { ViewToggleButton } from "./ViewToggleButton";
import { ToggleGroup } from "@calcom/ui/components/form";
import { useRouter } from "next/navigation";

interface BookingTableContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  bookingsV3Enabled: boolean;
}

interface BookingTableInnerProps extends BookingTableContainerProps {
  bookings: BookingsGetOutput["bookings"];
  hasError: boolean;
  errorMessage?: string;
  hasNextPage: boolean;
  isFetched: boolean;
  isFetchingNextPage: boolean;
}

function BookingTableInner({
  status,
  bookings,
  bookingsV3Enabled,
  hasError,
  errorMessage,
  hasNextPage,
  isFetched,
  isFetchingNextPage,
}: BookingTableInnerProps) {
  const { t, i18n } = useLocale();
  const user = useMeQuery().data;
  const router = useRouter();
  const { currentTableDate, setCurrentTableDate } = useCurrentBookingTableDate();
  const { currentTab, tabOptions } = useBookingStatusTab();

  useCalendarAutoSelector(bookings, hasNextPage, isFetched, isFetchingNextPage);

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => dayjs(booking.startTime).isSame(currentTableDate, "day")),
    [bookings, currentTableDate]
  );

  const ErrorView = errorMessage ? (
    <Alert severity="error" title={t("something_went_wrong")} message={errorMessage} />
  ) : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full md:w-auto">
          <div className="overflow-x-auto md:overflow-visible">
            <ToggleGroup
              value={currentTab}
              onValueChange={(value) => {
                if (!value) return;
                const selectedTab = tabOptions.find((tab) => tab.value === value);
                if (selectedTab?.href) {
                  router.push(selectedTab.href);
                }
              }}
              options={tabOptions}
            />
          </div>
        </div>

        <div className="hidden grow md:block" />

        <DatePicker
          date={currentTableDate.toDate()}
          onDatesChange={(date) => setCurrentTableDate(dayjs(date).startOf("day"))}
          minDate={null}
          label={currentTableDate.locale(i18n.language).format("D MMMM YYYY")}
        />

        <Button color="secondary" onClick={() => setCurrentTableDate(dayjs().startOf("day"))} className="capitalize">
          {t("today")}
        </Button>
        <ButtonGroup combined>
          <Button color="secondary" onClick={() => setCurrentTableDate(currentTableDate.subtract(1, "day"))}>
            <span className="sr-only">{t("view_previous_day")}</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button color="secondary" onClick={() => setCurrentTableDate(currentTableDate.add(1, "day"))}>
            <span className="sr-only">{t("view_next_day")}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </ButtonGroup>
        <ViewToggleButton bookingsV3Enabled={bookingsV3Enabled} />
      </div>

      <div className="mt-4">
        {hasError && ErrorView ? (
          ErrorView
        ) : (
          <BookingTableView bookings={visibleBookings} currentDate={currentTableDate} />
        )}
      </div>

      <BookingDetailsSheet
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
      />
    </>
  );
}

export function BookingTableContainer(props: BookingTableContainerProps) {
  const { currentTableDate } = useCurrentBookingTableDate();
  const { eventTypeIds, teamIds, userIds, attendeeName, attendeeEmail, bookingUid } = useBookingFilters();

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 100,
      filters: {
        statuses: [props.status],
        eventTypeIds,
        teamIds,
        userIds,
        attendeeName,
        attendeeEmail,
        bookingUid,
        afterStartDate: currentTableDate.startOf("day").toISOString(),
        beforeEndDate: currentTableDate.endOf("day").toISOString(),
      },
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    }
  );

  const { isFetched, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookings = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.bookings);
  }, [query.data?.pages]);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingTableInner
        {...props}
        bookings={bookings}
        hasError={!!query.error}
        errorMessage={query.error?.message}
        hasNextPage={hasNextPage}
        isFetched={isFetched}
        isFetchingNextPage={isFetchingNextPage}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
