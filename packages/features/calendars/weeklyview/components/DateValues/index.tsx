import dayjs from "@calcom/dayjs";
import { useCalendarStore } from "@calcom/features/calendars/weeklyview/state/store";
import type { BorderColor } from "@calcom/features/calendars/weeklyview/types/common";
import type { CalendarMode, CalendarResource } from "@calcom/features/calendars/weeklyview/types/state";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import type React from "react";
import { ResourceInfoButton } from "../ResourceInfoButton";

type Props = {
  showBorder: boolean;
  borderColor: BorderColor;
  days: dayjs.Dayjs[];
  containerNavRef: React.RefObject<HTMLDivElement>;
  calendarMode: CalendarMode;
  resources: CalendarResource[];
  contentWidth: string;
  scrollLeft: number;
};

export function DateValues({
  showBorder,
  borderColor,
  days,
  containerNavRef,
  calendarMode,
  resources,
  contentWidth,
  scrollLeft,
}: Props) {
  const { i18n } = useLocale();
  const timezone = useCalendarStore((state) => state.timezone);
  const showTimezone = useCalendarStore((state) => state.showTimezone ?? false);

  const getTimezoneDisplay = () => {
    if (!showTimezone || !timezone) return null;
    try {
      const timeRaw = dayjs().tz(timezone);
      const utcOffsetInMinutes = timeRaw.utcOffset();

      if (utcOffsetInMinutes === 0) {
        return "GMT";
      }

      const offsetInHours = Math.abs(utcOffsetInMinutes / 60);
      const sign = utcOffsetInMinutes < 0 ? "-" : "+";

      return `GMT ${sign}${offsetInHours}`;
    } catch {
      return timezone.split("/").pop()?.replace(/_/g, " ") || timezone;
    }
  };

  const columns =
    calendarMode === "resource"
      ? resources.map((resource) => ({
          key: `resource-${resource.id}`,
          label: resource.title,
          resource,
          subtitle: resource.length ? `${resource.length}` : undefined,
        }))
      : days.map((day) => {
          const isToday = dayjs().isSame(day, "day");
          return {
            key: day.toISOString(),
            label: new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(day.toDate()),
            subtitle: day.format("DD"),
            isToday,
          };
        });

  return (
    <div
      ref={containerNavRef}
      className={classNames(
        "bg-default dark:bg-cal-muted top-(--calendar-dates-sticky-offset,0px) z-80 sticky flex-none overflow-hidden border-b",
        borderColor === "subtle" ? "border-b-subtle" : "border-b-default",
        showBorder && (borderColor === "subtle" ? "border-r-subtle border-r" : "border-r-default border-r")
      )}>
      <div
        style={{
          minWidth: contentWidth,
          transform: `translateX(-${scrollLeft}px)`,
        }}
        className="text-subtle -mr-px hidden w-max auto-cols-fr leading-6 will-change-transform sm:flex">
        <div
          className={classNames(
            "col-end-1 flex w-16 items-center justify-center",
            showBorder &&
              (borderColor === "subtle" ? "border-l-subtle border-l" : "border-l-default border-l")
          )}>
          {showTimezone && timezone && (
            <span className="text-muted text-xs font-medium">{getTimezoneDisplay()}</span>
          )}
        </div>

        {columns.map((column) => (
          <div
            key={column.key}
            className="flex flex-1 items-center justify-center px-2 py-3 text-center text-xs font-medium uppercase">
            {calendarMode === "resource" ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-emphasis normal-case">{column.label}</span>
                  {"resource" in column && column.resource ? (
                    <ResourceInfoButton
                      title={column.resource.title}
                      slug={column.resource.slug}
                      description={column.resource.description}
                    />
                  ) : null}
                </div>
                {column.subtitle ? <span className="text-subtle text-[10px]">{column.subtitle}</span> : null}
              </div>
            ) : (
              <span>
                {column.label}{" "}
                <span
                  className={classNames(
                    "items-center justify-center p-1",
                    "isToday" in column && column.isToday && "bg-brand-default text-brand ml-1 rounded-md"
                  )}>
                  {column.subtitle}
                </span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
