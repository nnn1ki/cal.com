import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import { APP_NAME, EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent } from "@calcom/types/Calendar";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export default class BrokenIntegrationEmail extends BaseEmail {
  type: "calendar" | "video";
  calEvent: CalendarEvent;
  t: TFunction;

  constructor(calEvent: CalendarEvent, type: "calendar" | "video") {
    super();
    this.name = "SEND_BROKEN_INTEGRATION";
    this.calEvent = calEvent;
    this.t = this.calEvent.organizer.language.translate;
    this.type = type;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = [this.calEvent.organizer.email];
    const subject =
      this.type === "video"
        ? `Бронирование: ${this.calEvent.title}`
        : `[Action Required] ${this.t("confirmed_event_type_subject", {
            eventType: this.calEvent.type,
            name: this.calEvent.attendees[0].name,
            date: this.getFormattedDate(),
          })}`;

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject,
      html: await renderEmail("BrokenIntegrationEmail", {
        calEvent: this.calEvent,
        attendee: this.calEvent.organizer,
        type: this.type,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(
    title = "",
    subtitle = "emailed_you_and_any_other_attendees",
    extraInfo = "",
    callToAction = ""
  ): string {
    if (this.type === "video") {
      const bookingDate = dayjs(this.calEvent.startTime)
        .tz(this.calEvent.organizer.timeZone)
        .locale("ru")
        .format("D MMMM YYYY");
      const bookingTime = `${dayjs(this.calEvent.startTime)
        .tz(this.calEvent.organizer.timeZone)
        .locale("ru")
        .format("HH:mm")} - ${dayjs(this.calEvent.endTime)
        .tz(this.calEvent.organizer.timeZone)
        .locale("ru")
        .format("HH:mm")}`;

      return `Бронирование оформлено

Что забронировано: ${this.calEvent.title}
Когда: ${bookingDate}, ${bookingTime}
Адрес места: г. Иркутск, TODO: укажите адрес

${APP_NAME}`.trim();
    }

    return `
${this.t(
  title || this.calEvent.recurringEvent?.count ? "new_event_scheduled_recurring" : "new_event_scheduled"
)}
${this.t(subtitle)}
${extraInfo}
${getRichDescription(this.calEvent, this.t, true)}
${callToAction}
`.trim();
  }

  protected getTimezone(): string {
    return this.calEvent.organizer.timeZone;
  }

  protected getLocale(): string {
    return this.calEvent.organizer.language.locale;
  }

  protected getOrganizerStart(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.startTime,
      format,
    });
  }

  protected getOrganizerEnd(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.endTime,
      format,
    });
  }

  protected getFormattedDate() {
    const organizerTimeFormat = this.calEvent.organizer.timeFormat || TimeFormat.TWELVE_HOUR;
    return `${this.getOrganizerStart(organizerTimeFormat)} - ${this.getOrganizerEnd(
      organizerTimeFormat
    )}, ${this.t(this.getOrganizerStart("dddd").toLowerCase())}, ${this.t(
      this.getOrganizerStart("MMMM").toLowerCase()
    )} ${this.getOrganizerStart("D, YYYY")}`;
  }
}
