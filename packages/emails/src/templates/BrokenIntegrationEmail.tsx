import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseEmailHtml, Info } from "../components";
import { BaseScheduledEmail } from "./BaseScheduledEmail";
const BOOKING_PHYSICAL_LOCATION = "г. Иркутск, TODO: укажите адрес";

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

const BrokenVideoBookingSummary = (props: { calEvent: CalendarEvent }) => {
  const organizerTimeZone = props.calEvent.organizer.timeZone;
  const formattedDate = dayjs(props.calEvent.startTime)
    .tz(organizerTimeZone)
    .locale("ru")
    .format("D MMMM YYYY");
  const formattedTime = `${dayjs(props.calEvent.startTime)
    .tz(organizerTimeZone)
    .locale("ru")
    .format("HH:mm")} - ${dayjs(props.calEvent.endTime).tz(organizerTimeZone).locale("ru").format("HH:mm")}`;

  return (
    <BaseEmailHtml
      subject={`Бронирование: ${props.calEvent.title}`}
      title="Бронирование оформлено"
      subtitle={`Детали записи в ${APP_NAME}`}>
      <Info label="Что забронировано" description={props.calEvent.title} withSpacer />
      <Info label="Когда" description={`${formattedDate}, ${formattedTime}`} withSpacer />
      <Info label="Адрес места" description={BOOKING_PHYSICAL_LOCATION} withSpacer />
    </BaseEmailHtml>
  );
};

export const BrokenIntegrationEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    type: "video" | "calendar";
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { calEvent, type } = props;
  const t = calEvent.organizer.language.translate;
  const locale = calEvent.organizer.language.locale;
  const timeFormat = calEvent.organizer?.timeFormat;

  if (type === "video") {
    return <BrokenVideoBookingSummary calEvent={calEvent} />;
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
