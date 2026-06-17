import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import dayjs from "@calcom/dayjs";
import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { getCancelLink, getRescheduleLink } from "@calcom/lib/CalEventParser";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

type SummaryItem = {
  attendee: Person;
  calEvent: CalendarEvent;
};

const stripBookingTitle = (value: string) => value.replace(/\s+between\s+.*$/i, "").trim();

export default class AttendeeBatchScheduledSummaryEmail extends BaseEmail {
  private readonly attendee: Person;
  private readonly items: SummaryItem[];

  constructor(input: { attendee: Person; items: SummaryItem[] }) {
    super();
    this.name = "SEND_BATCH_BOOKING_CONFIRMATION";
    this.attendee = input.attendee;
    this.items = input.items;
  }

  private getRecipientAddress() {
    return this.attendee.name?.trim()
      ? `${this.attendee.name} <${this.attendee.email}>`
      : this.attendee.email;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.getRecipientAddress(),
      subject: "Подтверждение бронирования",
      html: await renderEmail("AttendeeBatchScheduledSummaryEmail", {
        attendee: this.attendee,
        items: this.items,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody() {
    const groupedLines = [...this.items]
      .sort(
        (left, right) =>
          dayjs(left.calEvent.startTime).valueOf() - dayjs(right.calEvent.startTime).valueOf() ||
          stripBookingTitle(left.calEvent.title).localeCompare(
            stripBookingTitle(right.calEvent.title),
            "ru"
          )
      )
      .map(({ calEvent, attendee }) => {
        const dateLabel = new Intl.DateTimeFormat("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: attendee.timeZone,
        }).format(new Date(calEvent.startTime));
        const timeLabel = new Intl.DateTimeFormat("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: attendee.timeZone,
        }).format(new Date(calEvent.startTime));
        const cancelLink = calEvent.disableCancelling ? "" : getCancelLink(calEvent, attendee);
        const rescheduleLink = calEvent.disableRescheduling
          ? ""
          : getRescheduleLink({ calEvent, attendee });

        return [
          `${dateLabel} года`,
          `${stripBookingTitle(calEvent.title)} - ${timeLabel}`,
          rescheduleLink ? `Перенести: ${rescheduleLink}` : "",
          cancelLink ? `Отменить: ${cancelLink}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      });

    return `Бронирование оформлено\n\n${groupedLines.join("\n\n")}`.trim();
  }
}
