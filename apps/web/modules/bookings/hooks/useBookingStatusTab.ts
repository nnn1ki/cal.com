import { useSearchParams, usePathname } from "next/navigation";
import { useMemo } from "react";
import { useSession } from "next-auth/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isRestrictedDemoUser } from "@calcom/web/lib/demo-admin";

export function useBookingStatusTab() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isRestrictedUser = isRestrictedDemoUser(session?.user?.email);

  const tabOptions = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    const baseTabConfigs = [
      {
        value: "upcoming",
        label: "upcoming",
        path: "/bookings/upcoming",
        dataTestId: "upcoming",
      },
      {
        value: "unconfirmed",
        label: "unconfirmed",
        path: "/bookings/unconfirmed",
        dataTestId: "unconfirmed",
      },
      {
        value: "recurring",
        label: "recurring",
        path: "/bookings/recurring",
        dataTestId: "recurring",
      },
      {
        value: "past",
        label: "past",
        path: "/bookings/past",
        dataTestId: "past",
      },
      {
        value: "cancelled",
        label: "cancelled",
        path: "/bookings/cancelled",
        dataTestId: "cancelled",
      },
    ];

    const visibleTabs = isRestrictedUser
      ? baseTabConfigs.filter((tabConfig) => tabConfig.value !== "recurring")
      : baseTabConfigs;

    return visibleTabs.map((tabConfig) => ({
      value: tabConfig.value,
      label: t(tabConfig.label),
      dataTestId: tabConfig.dataTestId,
      href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
    }));
  }, [isRestrictedUser, searchParams, t]);

  const currentTab = useMemo(() => {
    const pathMatch = pathname?.match(/\/bookings\/(\w+)/);
    return pathMatch?.[1] || "upcoming";
  }, [pathname]);

  return {
    currentTab,
    tabOptions,
  };
}
