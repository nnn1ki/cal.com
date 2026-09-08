"use client";

import { ColumnFilterType, type SystemFilterSegment } from "@calcom/features/data-table";
import { DataTableProvider } from "~/data-table/DataTableProvider";
import { useSegments } from "~/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { isRestrictedDemoUser } from "@calcom/web/lib/demo-admin";
import { BookingListContainer } from "../components/BookingListContainer";
import { useActiveFiltersValidator } from "../hooks/useActiveFiltersValidator";
import { useBookingsView } from "../hooks/useBookingsView";
import type { validStatuses } from "../lib/validStatuses";

const BookingCalendarContainer = dynamic(() =>
  import("../components/BookingCalendarContainer").then((mod) => ({
    default: mod.BookingCalendarContainer,
  }))
);
const ResourceOccupancyContainer = dynamic(() =>
  import("../components/ResourceOccupancyContainer").then((mod) => ({
    default: mod.ResourceOccupancyContainer,
  }))
);

type BookingsProps = {
  status: (typeof validStatuses)[number];
  userId?: number;
  permissions: {
    canReadOthersBookings: boolean;
  };
  bookingsV3Enabled: boolean;
  bookingAuditEnabled: boolean;
};

function useSystemSegments(userId?: number) {
  const { t } = useLocale();

  const systemSegments: SystemFilterSegment[] = useMemo(() => {
    if (!userId) return [];

    return [
      {
        id: "my_bookings",
        name: t("my_bookings"),
        type: "system",
        activeFilters: [
          {
            f: "userId",
            v: {
              type: ColumnFilterType.MULTI_SELECT,
              data: [userId],
            },
          },
        ],
        perPage: 10,
      },
    ];
  }, [userId, t]);

  return systemSegments;
}

export default function Bookings(props: BookingsProps) {
  const pathname = usePathname();
  const systemSegments = useSystemSegments(props.userId);
  const validateActiveFilters = useActiveFiltersValidator({
    canReadOthersBookings: props.permissions.canReadOthersBookings,
  });
  if (!pathname) return null;
  return (
    <DataTableProvider
      tableIdentifier={pathname}
      useSegments={useSegments}
      systemSegments={systemSegments}
      validateActiveFilters={validateActiveFilters}>
      <BookingsContent {...props} />
    </DataTableProvider>
  );
}

function BookingsContent({ status, permissions, bookingsV3Enabled, bookingAuditEnabled }: BookingsProps) {
  const { data: session } = useSession();
  const [view] = useBookingsView({ bookingsV3Enabled });
  const isRestrictedUser = isRestrictedDemoUser(session?.user?.email);
  const resolvedView = isRestrictedUser ? "list" : view;

  return (
    <div className={classNames(resolvedView === "calendar" && "-mb-8")}>
      {resolvedView === "list" && (
        <BookingListContainer
          status={status}
          permissions={permissions}
          bookingsV3Enabled={bookingsV3Enabled}
          bookingAuditEnabled={bookingAuditEnabled}
        />
      )}
      {bookingsV3Enabled && resolvedView === "calendar" && (
        <BookingCalendarContainer
          status={status}
          permissions={permissions}
          bookingsV3Enabled={bookingsV3Enabled}
        />
      )}
      {bookingsV3Enabled && resolvedView === "filter-calendar" && (
        <ResourceOccupancyContainer bookingsV3Enabled={bookingsV3Enabled} />
      )}
    </div>
  );
}
