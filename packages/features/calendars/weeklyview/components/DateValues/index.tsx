import dayjs from "@calcom/dayjs";
import { useCalendarStore } from "@calcom/features/calendars/weeklyview/state/store";
import type { BorderColor } from "@calcom/features/calendars/weeklyview/types/common";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Calendar } from "@calcom/platform-types";
import { CalendarEvent } from "@calcom/types/Calendar";
import classNames from "@calcom/ui/classNames";
import { EventType } from "@testing-library/react";
import type React from "react";

type Props = {
  showBorder: boolean;
  borderColor: BorderColor;
  days: dayjs.Dayjs[];
  containerNavRef: React.RefObject<HTMLDivElement>;
  events: EventType[]; // будем рисовать теперь только названия ресурса бронирования

};

export function DateValues({ showBorder, borderColor, days, containerNavRef, events }: Props) {

  const hardcodedTitles = [
    "Парикмахер",
    "Милирование",
    "Макияж",
    "Милирование2",
    "Ногти1",
    "Ногти2",
    "Парикмахер3",
  ];


  const { i18n } = useLocale();
  const timezone = useCalendarStore((state) => state.timezone);
  const showTimezone = useCalendarStore((state) => state.showTimezone ?? false);

  console.log("events", events);

  const formatDate = (date: dayjs.Dayjs): string => {
    return new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(date.toDate());
  };

  const getTimezoneDisplay = () => {
    if (!showTimezone || !timezone) return null;
    try {

      

      const timeRaw = dayjs().tz(timezone);
      const utcOffsetInMinutes = timeRaw.utcOffset();

      // Convert offset to decimal hours
      const offsetInHours = Math.abs(utcOffsetInMinutes / 60);
      const sign = utcOffsetInMinutes < 0 ? "-" : "+";

      // If offset is 0, just return "GMT"
      if (utcOffsetInMinutes === 0) {
        return "GMT";
      }

      // Format as decimal (e.g., 1.5 for 1:30, 1 for 1:00)
      const offsetFormatted = `${sign}${offsetInHours}`;

      return `GMT ${offsetFormatted}`;
    } catch {
      // Fallback to showing the timezone name if formatting fails
      return timezone.split("/").pop()?.replace(/_/g, " ") || timezone;
    }
  };

  return (
    <div
      ref={containerNavRef}
      className={classNames(
        "bg-default dark:bg-cal-muted top-(--calendar-dates-sticky-offset,0px) z-80 sticky flex-none border-b",
        borderColor === "subtle" ? "border-b-subtle" : "border-b-default",
        showBorder && (borderColor === "subtle" ? "border-r-subtle border-r" : "border-r-default border-r")
      )}>
      <div className="text-subtle flex leading-6 sm:hidden" data-dayslength={days.length}>
        {days.map((day) => {
          const isToday = dayjs().isSame(day, "day");
          return (
            <button
              key={day.toString()}
              type="button"
              className="flex flex-1 flex-col items-center pb-3 pt-2">
              {day.format("dd")}{" "}
              <span
                className={classNames(
                  "text-emphasis mt-1 flex h-8 w-8 items-center justify-center font-medium",
                  isToday && "bg-inverted text-inverted rounded-sm"
                )}>
                {day.format("D")}
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-subtle -mr-px hidden auto-cols-fr leading-6 sm:flex">
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

        {days.map((day, idx) => {
          const isToday = dayjs().isSame(day, "day");
          return (
            <div
              key={day.toString()}
              className={classNames(
                "flex flex-1 items-center justify-center py-3 text-xs font-medium uppercase"
              )}>
              <span>
                <span
                  className={classNames(
                    "items-center justify-center p-1"
                  )}>
                  {hardcodedTitles[idx] || ""}
                </span>
              </span>
            </div>
          );
        })}

      </div>
    </div>
  );
}



// {eventTypes.map((type) => (
//               <Link
//                 key={type.id}
//                 style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
//                 prefetch={false}
//                 href={{
//                   pathname: `/${user.profile.username}/${type.slug}`,
//                   query,
//                 }}
//                 passHref
//                 onClick={async () => {
//                   sdkActionManager?.fire("eventTypeSelected", {
//                     eventType: type,
//                   });
//                 }}
//                 className="bg-default border-subtle dark:bg-cal-muted dark:hover:bg-subtle hover:bg-cal-muted group relative border-b transition first:rounded-t-md last:rounded-b-md last:border-b-0"
//                 data-testid="event-type-link">
//                 <Icon
//                   name="arrow-right"
//                   className="text-emphasis absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
//                 />
//                 {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
//                 <div className="block w-full p-5">
//                   <div className="flex flex-wrap items-center">
//                     <h2 className="text-default pr-2 text-sm font-semibold">{type.title}</h2>
//                   </div>
//                   <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
//                 </div>
//               </Link>
//             ))}




// {days.map((day) => {
//           const isToday = dayjs().isSame(day, "day");
//           return (
//             <div
//               key={day.toString()}
//               className={classNames(
//                 "flex flex-1 items-center justify-center py-3 text-xs font-medium uppercase",
//                 isToday && "text-default"
//               )}>
//               <span>
//                 {formatDate(day)}{" "}
//                 <span
//                   className={classNames(
//                     "items-center justify-center p-1",
//                     isToday && "bg-brand-default text-brand ml-1 rounded-md"
//                   )}>
//                   {day.format("DD")}
//                 </span>
//               </span>
//             </div>
//           );
//         })}