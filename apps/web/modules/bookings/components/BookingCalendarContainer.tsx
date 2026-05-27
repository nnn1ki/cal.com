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
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import React, { useEffect, useMemo } from "react";
import { useBookingCalendarData } from "~/bookings/hooks/useBookingCalendarData";
import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import { useCalendarAllowedFilters } from "~/bookings/hooks/useCalendarAllowedFilters";
import { useCalendarAutoSelector } from "~/bookings/hooks/useCalendarAutoSelector";
import { useCurrentBookingTableDate } from "~/bookings/hooks/useCurrentBookingTableDate";
import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";
import { DataTableFilters } from "~/data-table/components/filters";
import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import { BookingDetailsSheetStoreProvider } from "../store/bookingDetailsSheetStore";
import type { BookingListingStatus, BookingsGetOutput, RowData } from "../types";
import { BookingCalendarView } from "./BookingCalendarView";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { ViewToggleButton } from "./ViewToggleButton";

// For calendar view, fetch all statuses except cancelled
const STATUSES: BookingListingStatus[] = ["upcoming", "unconfirmed", "recurring", "past"];

interface BookingCalendarContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  bookingsV3Enabled: boolean;
}

interface BookingCalendarInnerProps extends BookingCalendarContainerProps {
  data?: {
    bookings: BookingsGetOutput["bookings"];
    recurringInfo: BookingsGetOutput["recurringInfo"];
    totalCount: BookingsGetOutput["totalCount"];
  };
  allowedFilterIds: string[];
  isPending: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasNextPage: boolean;
  isFetched: boolean;
  isFetchingNextPage: boolean;
}

function BookingCalendarInner({
  status,
  permissions,
  bookingsV3Enabled,
  data,
  allowedFilterIds,
  hasError,
  errorMessage,
  hasNextPage,
  isFetched,
  isFetchingNextPage,
}: BookingCalendarInnerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;
  const { currentTableDate, setCurrentTableDate } = useCurrentBookingTableDate();

  const rowData = useBookingCalendarData({ data, status });

  // Extract bookings from table data
  const bookings = useMemo(() => {
    return rowData
      .filter((row): row is Extract<RowData, { type: "data" }> => row.type === "data")
      .map((row) => row.booking);
  }, [rowData]);

  // Handle auto-selection for calendar view
  useCalendarAutoSelector(bookings, hasNextPage, isFetched, isFetchingNextPage);

  const goToPreviousDay = () => {
    setCurrentTableDate(currentTableDate.subtract(1, "day"));
  };

  const goToNextDay = () => {
    setCurrentTableDate(currentTableDate.add(1, "day"));
  };

  const goToToday = () => {
    setCurrentTableDate(dayjs().startOf("day"));
  };

  const ErrorView = errorMessage ? (
    <Alert severity="error" title={t("something_went_wrong")} message={errorMessage} />
  ) : undefined;

  const columns = useMemo(() => {
    return buildFilterColumns({ t, permissions, status }).filter((column) =>
      allowedFilterIds.includes(column.id || "")
    );
  }, [allowedFilterIds, t, permissions, status]);

  const getFacetedUniqueValues = useFacetedUniqueValues({
    canReadOthersBookings: permissions.canReadOthersBookings,
  });

  const table = useReactTable<RowData>({
    data: rowData,
    columns,
    initialState: {
      columnVisibility: getFilterColumnVisibility(),
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DatePicker
            date={currentTableDate.toDate()}
            onDatesChange={(date) => setCurrentTableDate(dayjs(date).startOf("day"))}
            minDate={null}
            label={currentTableDate.format("D MMMM YYYY")}
          />
          {allowedFilterIds.length > 0 && <DataTableFilters.FilterBar table={table} />}
        </div>

        <div className="flex items-center gap-2">
          <Button color="secondary" onClick={goToToday} className="capitalize">
            {t("today")}
          </Button>
          <ButtonGroup combined>
            <Button color="secondary" onClick={goToPreviousDay}>
              <span className="sr-only">{t("view_previous_day")}</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button color="secondary" onClick={goToNextDay}>
              <span className="sr-only">{t("view_next_day")}</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </ButtonGroup>
          <ViewToggleButton bookingsV3Enabled={bookingsV3Enabled} />
        </div>
      </div>
      {hasError && ErrorView ? (
        ErrorView
      ) : (
        <BookingCalendarView
          bookings={bookings}
          currentDate={currentTableDate}
        />
      )}

      <BookingDetailsSheet
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
      />
    </>
  );
}

export function BookingCalendarContainer(props: BookingCalendarContainerProps) {
  const { canReadOthersBookings } = props.permissions;
  const { userIds } = useBookingFilters();
  const { currentTableDate } = useCurrentBookingTableDate();

  const allowedFilterIds = useCalendarAllowedFilters({
    canReadOthersBookings,
  });

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 100, // Use max limit for calendar view
      filters: {
        statuses: STATUSES,
        userIds,
        afterStartDate: currentTableDate.startOf("day").toISOString(),
        beforeEndDate: currentTableDate.endOf("day").toISOString(),
      },
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retention time
    }
  );

  const { isFetched, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // Automatically fetch all pages until no more data
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single data object
  const data = useMemo(() => {
    if (!query.data?.pages) return undefined;

    // Combine all bookings from all pages
    const allBookings = query.data.pages.flatMap((page) => page.bookings);

    // recurringInfo is the same across all pages (queried globally by user, not per page)
    const recurringInfo = query.data.pages[0]?.recurringInfo ?? [];

    // totalCount is the same across all pages
    const totalCount = query.data.pages[0]?.totalCount ?? 0;

    return { bookings: allBookings, recurringInfo, totalCount };
  }, [query.data?.pages]);

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingCalendarInner
        {...props}
        data={data}
        allowedFilterIds={allowedFilterIds}
        isPending={query.isPending}
        hasError={!!query.error}
        errorMessage={query.error?.message}
        hasNextPage={hasNextPage}
        isFetched={isFetched}
        isFetchingNextPage={isFetchingNextPage}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
