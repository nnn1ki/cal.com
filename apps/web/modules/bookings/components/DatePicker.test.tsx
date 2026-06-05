import React from "react";
import { vi, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { DatePicker as DatePickerComponent } from "@calcom/features/calendars/components/DatePicker";

import { render } from "@calcom/features/bookings/Booker/__tests__/test-utils";
import { DatePicker } from "./DatePicker";

vi.mock("@calcom/features/calendars/components/DatePicker", () => {
  return {
    DatePicker: vi.fn(() => <div data-testid="mock-date-picker" />),
  };
});

const noop = () => {
  /* noop */
};

describe("Tests for DatePicker Component", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("It passes the loading prop to the DatePicker component", async () => {
    render(<DatePicker event={{}} isLoading={true} />);

    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        isLoading: true,
      }),
      expect.anything()
    );
  });

  test("happy path, slots in current month", async () => {
    // today current time.
    const testDate = dayjs();
    render(
      <DatePicker
        event={{}}
        slots={{
          [`${testDate.format("YYYY-MM-DD")}`]: [
            {
              time: testDate.format("YYYY-MM-DDTHH:mm:ss"),
            },
          ],
        }}
        isLoading={false}
      />
    );
    // slot date is next month, so it'll have skipped the current month
    // by setting the browsingDate to the next month.
    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        browsingDate: dayjs().startOf("month"),
      }),
      expect.anything()
    );
  });

  test("when there are only slots in the next month, keep the selected month", async () => {
    // there'll be one slot open on this day, next month.
    const slotDate = dayjs().add(1, "month");
    render(
      <DatePicker
        event={{}}
        slots={{
          [`${slotDate.format("YYYY-MM-DD")}`]: [
            {
              time: slotDate.format("YYYY-MM-DDTHH:mm:ss"),
            },
          ],
        }}
        isLoading={false}
      />,
      {
        mockStore: {
          month: slotDate.format("YYYY-MM"), // Start with next month to simulate the auto-advance
        },
      }
    );
    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        browsingDate: slotDate.startOf("month"),
      }),
      expect.anything()
    );
  });

  test("when there are no slots, keep the currently selected month", async () => {
    render(
      <DatePicker
        event={{}}
        slots={
          {
            /* no slots given at all, but not loading */
          }
        }
        isLoading={false}
      />,
      {
        mockStore: {
          month: dayjs().add(1, "month").format("YYYY-MM"),
        },
      }
    );
    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        browsingDate: dayjs().add(1, "month").startOf("month"),
      }),
      expect.anything()
    );
  });

  test("does not restrict the calendar to only included slot dates", async () => {
    render(
      <DatePicker
        event={{}}
        slots={{
          [dayjs().add(1, "day").format("YYYY-MM-DD")]: [
            {
              time: dayjs().add(1, "day").format("YYYY-MM-DDTHH:mm:ss"),
            },
          ],
        }}
        isLoading={false}
      />
    );

    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.not.objectContaining({
        includedDates: expect.anything(),
      }),
      expect.anything()
    );
  });
});
