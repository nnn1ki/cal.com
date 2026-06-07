import { useCallback, useMemo } from "react";
import { shallow } from "zustand/shallow";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import dayjs from "@calcom/dayjs";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useInitializeWeekStart } from "@calcom/features/bookings/hooks/useInitializeWeekStart";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { formatDateInRussian } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { ToggleGroup } from "@calcom/ui/components/form";
import { CalendarIcon, Columns3Icon, Grid3x3Icon } from "@coss/ui/icons";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { TimeFormatToggle } from "@calcom/features/bookings/components/TimeFormatToggle";
import type { BookerLayout } from "@calcom/features/bookings/Booker/types";

export function Header({
  extraDays,
  isMobile,
  enabledLayouts,
  nextSlots,
  eventSlug,
  isMyLink,
  isCalendarView,
}: {
  extraDays: number;
  isMobile: boolean;
  enabledLayouts: BookerLayouts[];
  nextSlots: number;
  eventSlug: string;
  isMyLink: boolean;
  isCalendarView?: boolean;
}) {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  const isPlatform = useIsPlatform();
  const [layout, setLayout] = useBookerStoreContext((state) => [state.layout, state.setLayout], shallow);
  const selectedDateString = useBookerStoreContext((state) => state.selectedDate);
  const setSelectedDate = useBookerStoreContext((state) => state.setSelectedDate);
  const addToSelectedDate = useBookerStoreContext((state) => state.addToSelectedDate);
  const isMonthView = isCalendarView !== undefined ? !isCalendarView : layout === BookerLayouts.MONTH_VIEW;
  const today = dayjs();
  const selectedDate = selectedDateString ? dayjs(selectedDateString) : today;
  const selectedDateMin3DaysDifference = useMemo(() => {
    const diff = today.diff(selectedDate, "days");
    return diff > 3 || diff < -3;
  }, [today, selectedDate]);

  useInitializeWeekStart(isPlatform, isCalendarView ?? false);

  const onLayoutToggle = useCallback(
    (newLayout: string) => {
      if (layout === newLayout || !newLayout) return;
      setLayout(newLayout as BookerLayout);
    },
    [setLayout, layout]
  );

  if (!enabledLayouts) return null;

  if (isMobile) {
    if (isMonthView) {
      return null;
    }

    return (
      <div className="border-default bg-default dark:bg-cal-muted flex items-center justify-end gap-2 border-b px-4 py-3">
        <TimeFormatToggle />
        <LayoutToggleWithData
          layout={layout}
          enabledLayouts={enabledLayouts}
          onLayoutToggle={onLayoutToggle}
        />
      </div>
    );
  }
  // In month view we only show the layout toggle.
  if (isMonthView) {
    return (
      <div className="flex gap-2">
        {isMyLink && !isEmbed ? (
          <Tooltip content={t("troubleshooter_tooltip")} side="bottom">
            <Button
              color="primary"
              target="_blank"
              href={`${WEBAPP_URL}/availability/troubleshoot?eventType=${eventSlug}`}>
              {t("need_help")}
            </Button>
          </Tooltip>
        ) : null}
        <LayoutToggleWithData
          layout={layout}
          enabledLayouts={enabledLayouts}
          onLayoutToggle={onLayoutToggle}
        />
      </div>
    );
  }
  const FormattedSelectedDateRange = () => {
    return (
      <h3 className="min-w-[150px] text-base font-semibold leading-4">
        {formatDateInRussian(selectedDate)}
      </h3>
    );
  };

  return (
    <div className="border-default relative z-10 flex border-b px-5 py-4 ltr:border-l rtl:border-r">
      <div className="flex items-center gap-5 rtl:grow">
        <FormattedSelectedDateRange />
        <ButtonGroup>
          <Button
            className="group rtl:ml-1 rtl:rotate-180"
            variant="icon"
            color="minimal"
            StartIcon="chevron-left"
            aria-label="Previous Day"
            onClick={() => addToSelectedDate(layout === BookerLayouts.COLUMN_VIEW ? -nextSlots : -extraDays)}
          />
          <Button
            className="group rtl:mr-1 rtl:rotate-180"
            variant="icon"
            color="minimal"
            StartIcon="chevron-right"
            aria-label="Next Day"
            onClick={() => addToSelectedDate(layout === BookerLayouts.COLUMN_VIEW ? nextSlots : extraDays)}
          />
          {selectedDateMin3DaysDifference && (
            <Button
              className="capitalize ltr:ml-2 rtl:mr-2"
              color="secondary"
              onClick={() => {
                const selectedDate = (isCalendarView ? today.startOf("week") : today).format("YYYY-MM-DD");
                setSelectedDate({ date: selectedDate });
              }}>
              {t("today")}
            </Button>
          )}
        </ButtonGroup>
      </div>
      <div className="ml-auto flex gap-2">
        <TimeFormatToggle />
        <LayoutToggleWithData
          layout={layout}
          enabledLayouts={enabledLayouts}
          onLayoutToggle={onLayoutToggle}
        />
      </div>
    </div>
  );
}

const LayoutToggle = ({
  onLayoutToggle,
  layout,
  enabledLayouts,
}: {
  onLayoutToggle: (layout: string) => void;
  layout: string;
  enabledLayouts?: BookerLayouts[];
}) => {
  const isEmbed = useIsEmbed();
  const isPlatform = useIsPlatform();
  const { t } = useLocale();

  const layoutOptions = useMemo(() => {
    return [
      {
        value: BookerLayouts.MONTH_VIEW,
        label: (
          <>
            <CalendarIcon className="h-4 w-4" />
            <span className="sr-only">${t("switch_monthly")}</span>
          </>
        ),
        tooltip: t("switch_monthly"),
      },
      {
        value: BookerLayouts.WEEK_VIEW,
        label: (
          <>
            <Grid3x3Icon className="h-4 w-4" />
            <span className="sr-only">${t("switch_weekly")}</span>
          </>
        ),
        tooltip: t("switch_weekly"),
      },
      {
        value: BookerLayouts.COLUMN_VIEW,
        label: (
          <>
            <Columns3Icon className="h-4 w-4" />
            <span className="sr-only">${t("switch_columnview")}</span>
          </>
        ),
        tooltip: t("switch_columnview"),
      },
    ].filter((layout) => enabledLayouts?.includes(layout.value as BookerLayouts));
  }, [t, enabledLayouts]);

  // We don't want to show the layout toggle in embed mode as of now as it doesn't look rightly placed when embedded.
  // There is a Embed API to control the layout toggle from outside of the iframe.
  if (isEmbed) {
    return null;
  }

  // just like embed the layout toggle doesn't look rightly placed in platform
  // the layout can be toggled via props in the booker atom
  if (isPlatform) return null;

  return (
    <ToggleGroup
      onValueChange={onLayoutToggle}
      defaultValue={layout}
      aria-label={t("layout")}
      options={layoutOptions}
    />
  );
};

const LayoutToggleWithData = ({
  enabledLayouts,
  onLayoutToggle,
  layout,
}: {
  enabledLayouts: BookerLayouts[];
  onLayoutToggle: (layout: string) => void;
  layout: string;
}) => {
  return enabledLayouts.length <= 1 ? null : (
    <LayoutToggle onLayoutToggle={onLayoutToggle} layout={layout} enabledLayouts={enabledLayouts} />
  );
};
