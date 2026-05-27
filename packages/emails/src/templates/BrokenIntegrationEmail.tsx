import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseEmailHtml, Info } from "../components";
import { BaseScheduledEmail } from "./BaseScheduledEmail";
const BOOKING_PHYSICAL_LOCATION = "г. Иркутск, TODO: укажите адрес";
const stripBookingTitle = (value: string) => value.replace(/\s+between\s+.*$/i, "").trim();

const BrokenCalendarIntegration = (props: {
  calendar: string;
  eventTypeId?: number | null;
  t: TFunction;
}) => {
  const { t } = props;

  return (
    <div>
      {t("broken_calendar_action", {
        calendar: props.calendar,
        calendarSettingsLink: `${WEBAPP_URL}/apps/installed`,
        interpolation: { escapeValue: false },
      })}
    </div>
  );
};

const BrokenVideoBookingSummary = (props: { calEvents: CalendarEvent[] }) => {
  const organizerTimeZone = props.calEvents[0]?.organizer.timeZone;
  const groupedByDate = props.calEvents.reduce<Record<string, CalendarEvent[]>>((acc, calEvent) => {
    const dateKey = dayjs(calEvent.startTime).tz(organizerTimeZone).locale("ru").format("D MMMM YYYY");
    acc[dateKey] = [...(acc[dateKey] ?? []), calEvent];
    return acc;
  }, {});

  return (
    <BaseEmailHtml
      subject={
        props.calEvents.length > 1
          ? "Сводка бронирований"
          : `Бронирование: ${stripBookingTitle(props.calEvents[0]?.title ?? "")}`
      }
      title="Бронирование оформлено"
      subtitle={`Детали записи в ${APP_NAME}`}>
      {Object.entries(groupedByDate).map(([dateLabel, dateEvents], index) => (
        <div key={dateLabel}>
          <Info label="Когда забронировано" description={dateLabel} withSpacer={index > 0} />
          <Info
            label="Что забронировано"
            description={dateEvents
              .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
              .map((calEvent) => {
                const formattedTime = `${dayjs(calEvent.startTime)
                  .tz(organizerTimeZone)
                  .locale("ru")
                  .format("HH:mm")} - ${dayjs(calEvent.endTime)
                  .tz(organizerTimeZone)
                  .locale("ru")
                  .format("HH:mm")}`;
                return `${stripBookingTitle(calEvent.title)} - ${formattedTime}`;
              })
              .join("\n")}
            withSpacer
          />
        </div>
      ))}
      <Info label="Адрес места" description={BOOKING_PHYSICAL_LOCATION} withSpacer />
    </BaseEmailHtml>
  );
};

export const BrokenIntegrationEmail = (
  props: {
    calEvent: CalendarEvent;
    calEvents?: CalendarEvent[];
    attendee: Person;
    type: "video" | "calendar";
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { calEvent, type } = props;
  const t = calEvent.organizer.language.translate;
  const locale = calEvent.organizer.language.locale;
  const timeFormat = calEvent.organizer?.timeFormat;

  if (type === "video") {
    const calEvents = "calEvents" in props && props.calEvents?.length ? props.calEvents : [calEvent];
    return <BrokenVideoBookingSummary calEvents={calEvents} />;
  }

  if (type === "calendar") {
    // The calendar name is stored as name_calendar
    const [mainHostDestinationCalendar] = calEvent.destinationCalendar ?? [];
    let calendar = mainHostDestinationCalendar
      ? mainHostDestinationCalendar?.integration.split("_")
      : "calendar";

    if (Array.isArray(calendar)) {
      const calendarCap = calendar.map((name) => name.charAt(0).toUpperCase() + name.slice(1));
      calendar = `${calendarCap[0]} ${calendarCap[1]}`;
    }

    return (
      <BaseScheduledEmail
        timeZone={calEvent.organizer.timeZone}
        t={t}
        timeFormat={timeFormat}
        locale={locale}
        subject={t("broken_integration")}
        title={t("problem_updating_calendar")}
        subtitle={<BrokenCalendarIntegration calendar={calendar} eventTypeId={calEvent.eventTypeId} t={t} />}
        headerType="xCircle"
        {...props}
      />
    );
  }

  return (
    <BaseScheduledEmail
      timeZone={calEvent.organizer.timeZone}
      t={t}
      timeFormat={timeFormat}
      locale={locale}
      subject={t("broken_integration")}
      title={t("problem_updating_calendar")}
      headerType="xCircle"
      {...props}
    />
  );
};
