import type { NextApiRequest } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { BookingForCalEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { sendBatchAttendeeScheduledSummaryEmail } from "@calcom/emails/email-manager";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { TraceContext } from "@calcom/lib/tracing";
import { prisma } from "@calcom/prisma";

const summaryEmailBodySchema = z.object({
  attendeeEmail: z.string().email(),
  batchGroupId: z.string().min(1),
  bookingReferences: z
    .array(
      z.object({
        bookingUid: z.string().min(1),
        seatReferenceUid: z.string().nullish(),
      })
    )
    .min(1),
});

async function handler(req: NextApiRequest & { traceContext: TraceContext }) {
  await getServerSession({ req });

  const { attendeeEmail, batchGroupId, bookingReferences } = summaryEmailBodySchema.parse(req.body);
  const bookingRepository = new BookingRepository(prisma);

  const uniqueBookingUids = Array.from(new Set(bookingReferences.map((reference) => reference.bookingUid)));
  const bookingsByUid = new Map<string, BookingForCalEventBuilder>();
  const bookingEntries = await Promise.all(
    uniqueBookingUids.map(async (bookingUid) => ({
      bookingUid,
      booking: await bookingRepository.getBookingForCalEventBuilderFromUid(bookingUid),
    }))
  );

  for (const entry of bookingEntries) {
    if (entry.booking) {
      bookingsByUid.set(entry.bookingUid, entry.booking);
    }
  }

  const calendarEventsWithAttendees = await Promise.all(
    bookingReferences.map(async ({ bookingUid, seatReferenceUid }) => {
      const booking = bookingsByUid.get(bookingUid);

      if (!booking) {
        return null;
      }

      const metadata =
        booking.metadata && typeof booking.metadata === "object" && !Array.isArray(booking.metadata)
          ? booking.metadata
          : null;

      if (metadata?._bookingBatchGroupId !== batchGroupId || metadata?._bookingBatchSendSummary !== "1") {
        return null;
      }

      const matchingAttendee = booking.attendees.find((attendee) => {
        if (attendee.email !== attendeeEmail) {
          return false;
        }

        if (!seatReferenceUid) {
          return true;
        }

        return attendee.bookingSeat?.referenceUid === seatReferenceUid;
      });

      if (!matchingAttendee) {
        return null;
      }

      const calendarEvent = await CalendarEventBuilder.fromBooking(booking).then((builder) => builder.build());
      const attendee =
        calendarEvent.attendees.find((currentAttendee) => {
          if (currentAttendee.email !== attendeeEmail) {
            return false;
          }

          if (!seatReferenceUid) {
            return true;
          }

          return currentAttendee.bookingSeat?.referenceUid === seatReferenceUid;
        }) ?? calendarEvent.attendees[0];

      if (seatReferenceUid) {
        calendarEvent.attendeeSeatId = seatReferenceUid;
      }

      return attendee ? { calEvent: calendarEvent, attendee } : null;
    })
  );

  const summaryItems = calendarEventsWithAttendees.filter((item) => item !== null);

  if (!summaryItems.length) {
    return { success: false };
  }

  await sendBatchAttendeeScheduledSummaryEmail(summaryItems);

  return { success: true };
}

export default defaultResponder(handler, "/api/book/summary-email");
