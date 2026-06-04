import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import BaseEmail from "./_base-email";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export default class BasicBookingConfirmationEmail extends BaseEmail {
  calEvent: CalendarEvent;
  recipient: Person;
  isOrganizer: boolean;

  constructor({
    calEvent,
    recipient,
    isOrganizer,
  }: {
    calEvent: CalendarEvent;
    recipient: Person;
    isOrganizer: boolean;
  }) {
    super();
    this.name = "SEND_BOOKING_CONFIRMATION_FALLBACK";
    this.calEvent = calEvent;
    this.recipient = recipient;
    this.isOrganizer = isOrganizer;
  }

  protected getTimezone(): string {
    return this.recipient.timeZone || this.calEvent.organizer.timeZone;
  }

  protected getLocale(): string {
    return this.recipient.language.locale || this.calEvent.organizer.language.locale;
  }

  private getTimeFormat(): string {
    return (this.recipient.timeFormat || this.calEvent.organizer.timeFormat || TimeFormat.TWENTY_FOUR_HOUR) ===
      TimeFormat.TWELVE_HOUR
      ? "h:mma"
      : "HH:mm";
  }

  private getFormattedDateTime() {
    const timeFormat = this.getTimeFormat();
    const start = this.getFormattedRecipientTime({ time: this.calEvent.startTime, format: timeFormat });
    const end = this.getFormattedRecipientTime({ time: this.calEvent.endTime, format: timeFormat });
    const date = this.getFormattedRecipientTime({ time: this.calEvent.startTime, format: "dddd, D MMMM YYYY" });
    return `${start} - ${end}, ${date}`;
  }

  private getSubject() {
    return this.calEvent.title;
  }

  private getRecipientAddress() {
    return this.recipient.name?.trim()
      ? `${this.recipient.name} <${this.recipient.email}>`
      : this.recipient.email;
  }

  private getTextBody() {
    const t = this.recipient.language.translate;
    const lines = [
      this.isOrganizer ? t("new_event_scheduled") : t("your_event_has_been_scheduled"),
      "",
      `${t("what")}: ${this.calEvent.title}`,
      `${t("when")}: ${this.getFormattedDateTime()}`,
    ];

    if (this.calEvent.location) {
      lines.push(`${t("where")}: ${this.calEvent.location}`);
    }

    if (this.isOrganizer) {
      const attendee = this.calEvent.attendees[0];
      if (attendee) {
        lines.push(`${t("who")}: ${attendee.name}${attendee.email ? ` <${attendee.email}>` : ""}`);
      }
    } else {
      lines.push(`${t("who")}: ${this.calEvent.organizer.name}`);
    }

    return lines.join("\n");
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = this.recipient.language.translate;
    const attendee = this.calEvent.attendees[0];
    const bodyRows = [
      `<p><strong>${escapeHtml(t("what"))}:</strong> ${escapeHtml(this.calEvent.title)}</p>`,
      `<p><strong>${escapeHtml(t("when"))}:</strong> ${escapeHtml(this.getFormattedDateTime())}</p>`,
      this.calEvent.location
        ? `<p><strong>${escapeHtml(t("where"))}:</strong> ${escapeHtml(this.calEvent.location)}</p>`
        : "",
      this.isOrganizer && attendee
        ? `<p><strong>${escapeHtml(t("who"))}:</strong> ${escapeHtml(attendee.name)}${
            attendee.email ? ` &lt;${escapeHtml(attendee.email)}&gt;` : ""
          }</p>`
        : `<p><strong>${escapeHtml(t("who"))}:</strong> ${escapeHtml(this.calEvent.organizer.name)}</p>`,
    ].filter(Boolean);

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.getRecipientAddress(),
      subject: this.getSubject(),
      html: `<div>${bodyRows.join("")}</div>`,
      text: this.getTextBody(),
    };
  }
}
