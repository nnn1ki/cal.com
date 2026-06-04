import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { ManageLink } from "./ManageLink";

const createPerson = (name: string, email: string): Person =>
  ({
    name,
    email,
    timeZone: "Asia/Irkutsk",
    language: {
      locale: "ru",
      translate: (key: string) => key,
    },
  }) as Person;

describe("ManageLink", () => {
  it("does not throw when bookerUrl is invalid", () => {
    const attendee = createPerson("Client", "client@example.com");
    const calEvent = {
      type: "service",
      uid: "booking-uid",
      bookerUrl: "http://[::1",
      organizer: createPerson("Owner", "owner@example.com"),
      attendees: [attendee],
    } as CalendarEvent;

    expect(() => renderToStaticMarkup(<ManageLink calEvent={calEvent} attendee={attendee} />)).not.toThrow();
    expect(renderToStaticMarkup(<ManageLink calEvent={calEvent} attendee={attendee} />)).toBe("");
  });
});
