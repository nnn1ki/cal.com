import dayjs from "@calcom/dayjs";

import { getCancelLink, getRescheduleLink, getLocation } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseEmailHtml, CallToAction } from "../components";

type SummaryItem = {
  attendee: Person;
  calEvent: CalendarEvent;
};

const stripBookingTitle = (value: string) => value.replace(/\s+between\s+.*$/i, "").trim();

const DATE_FORMATTER_OPTIONS = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
} as const;

const TIME_FORMATTER_OPTIONS = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
} as const;

const getDateLabel = (date: string, timeZone: string) =>
  `${new Intl.DateTimeFormat("ru-RU", { ...DATE_FORMATTER_OPTIONS, timeZone }).format(new Date(date))} года`;

const getTimeLabel = (startTime: string, endTime: string, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("ru-RU", { ...TIME_FORMATTER_OPTIONS, timeZone });

  return `${formatter.format(new Date(startTime))} - ${formatter.format(new Date(endTime))}`;
};

export const AttendeeBatchScheduledSummaryEmail = ({
  attendee,
  items,
}: {
  attendee: Person;
  items: SummaryItem[];
}) => {
  const sortedItems = [...items].sort(
    (left, right) =>
      dayjs(left.calEvent.startTime).valueOf() - dayjs(right.calEvent.startTime).valueOf() ||
      stripBookingTitle(left.calEvent.title).localeCompare(stripBookingTitle(right.calEvent.title), "ru")
  );

  const groupedItems = sortedItems.reduce(
    (accumulator, item) => {
      const dateLabel = getDateLabel(item.calEvent.startTime, attendee.timeZone);

      if (!accumulator[dateLabel]) {
        accumulator[dateLabel] = [];
      }

      accumulator[dateLabel].push(item);

      return accumulator;
    },
    {} as Record<string, SummaryItem[]>
  );

  return (
    <BaseEmailHtml
      subject="Подтверждение бронирования"
      title="Бронирование оформлено"
      subtitle="Все выбранные позиции собраны в одном письме. По каждой записи доступны перенос и отмена."
      hideLogo={Boolean(items[0]?.calEvent.hideBranding)}>
      <div style={{ color: "#111827", fontFamily: "Roboto, Helvetica, sans-serif", fontSize: "14px" }}>
        {Object.entries(groupedItems).map(([dateLabel, dateItems]) => (
          <div key={dateLabel} style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>{dateLabel}</div>
            {dateItems.map(({ calEvent, attendee: itemAttendee }, index) => {
              const cancelLink = calEvent.disableCancelling ? "" : getCancelLink(calEvent, itemAttendee);
              const rescheduleLink = calEvent.disableRescheduling
                ? ""
                : getRescheduleLink({ calEvent, attendee: itemAttendee });
              const location = getLocation(calEvent);

              return (
                <div
                  key={`${calEvent.uid ?? "booking"}-${index}`}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "12px",
                    backgroundColor: "#FFFFFF",
                  }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>
                    {stripBookingTitle(calEvent.title)}
                  </div>
                  <div style={{ color: "#374151", marginBottom: "6px" }}>
                    {getTimeLabel(calEvent.startTime, calEvent.endTime, itemAttendee.timeZone)}
                  </div>
                  {location ? (
                    <div style={{ color: "#6B7280", fontSize: "13px", marginBottom: "12px" }}>{location}</div>
                  ) : null}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {rescheduleLink ? <CallToAction label="Перенести" href={rescheduleLink} secondary /> : null}
                    {cancelLink ? <CallToAction label="Отменить" href={cancelLink} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </BaseEmailHtml>
  );
};
