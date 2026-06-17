import { BookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { createBatchBookingSummaryEmail } from "@calcom/features/bookings/lib/create-batch-booking-summary-email";
import { createBooking } from "@calcom/features/bookings/lib/create-booking";
import { SUCCESS_BOOKING_CART_STORAGE_KEY } from "@calcom/features/bookings/lib/success-booking-cart-storage";
import { localStorage } from "@calcom/lib/webstorage";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookings } from "./useBookings";

const mockBookingMetadataSchema = vi.mocked(bookingMetadataSchema);

// Mock dependencies
vi.mock("@calcom/features/bookings/Booker/utils/query-param", () => ({
  getQueryParam: vi.fn(),
  updateQueryParam: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/create-booking", () => ({
  createBooking: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/create-batch-booking-summary-email", () => ({
  createBatchBookingSummaryEmail: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/create-instant-booking", () => ({
  createInstantBooking: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/create-recurring-booking", () => ({
  createRecurringBooking: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/bookingSuccessRedirect", () => ({
  useBookingSuccessRedirect: () => vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    i18n: { language: "en" },
    t: (text: string) => text,
  }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@calcom/atoms/hooks/bookings/useHandleBookEvent", () => ({
  useHandleBookEvent: () => vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@calcom/features/bookings/Booker/hooks/useBookingForm", () => ({
  useBookingForm: () => ({
    bookingForm: {
      watch: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn().mockReturnValue({ responses: {} }),
    },
    formEmail: "",
    bookerFormErrorRef: { current: null },
    key: "test-key",
  }),
}));

vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@calcom/embed-core/embed-iframe", () => ({
  sdkActionManager: {
    fire: vi.fn(),
  },
  useIsEmbed: () => false,
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: () => new URLSearchParams(),
}));

vi.mock("@calcom/features/bookings/lib/client/decoyBookingStore", () => ({
  storeDecoyBooking: vi.fn(),
}));

vi.mock("@calcom/app-store/stripepayment/lib/client", () => ({
  createPaymentLink: vi.fn(),
}));

// Create mock function that can be accessed after vi.mock hoisting
const mockUseQuery = vi.fn();
vi.mock("@calcom/trpc/react", () => {
  const mockUseQueryFn = vi.fn();
  // Store reference globally so we can access it in tests
  (globalThis as any).__mockUseQuery = mockUseQueryFn;
  return {
    trpc: {
      viewer: {
        bookings: {
          getInstantBookingLocation: {
            useQuery: mockUseQueryFn,
          },
        },
      },
    },
  };
});

// Get the mock function reference after module is loaded
const getMockUseQuery = () => (globalThis as any).__mockUseQuery as ReturnType<typeof vi.fn>;

// Mock bookingMetadataSchema.parse
vi.mock("@calcom/prisma/zod-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma/zod-utils")>();
  return {
    ...actual,
    bookingMetadataSchema: {
      ...actual.bookingMetadataSchema,
      parse: vi.fn(),
    },
  };
});

const createMockStore = (isInstantMeeting: boolean) => {
  const state: {
    eventSlug: string;
    eventId: number;
    isInstantMeeting: boolean;
    username: string;
    timezone: string;
    org: null;
    crmOwnerRecordType: null;
    crmAppSlug: null;
    crmRecordId: null;
    rescheduleUid: null;
    rescheduledBy: null;
    bookingData: null;
    seatedEventData: {
      seatsPerTimeSlot?: number | null;
      attendees?: number;
      bookingUid?: string;
      showAvailableSeatsCount?: boolean | null;
    };
    selectedTimeslot: string | null;
    selectedDatesAndTimes: { [key: string]: { [key: string]: string[] } } | null;
    selectedDuration: null;
    verificationCode: null;
    setRescheduleUid: ReturnType<typeof vi.fn>;
    setBookingData: ReturnType<typeof vi.fn>;
    setSelectedDatesAndTimes: ReturnType<typeof vi.fn>;
    setFormValues: ReturnType<typeof vi.fn>;
  } = {
    eventSlug: "test-event",
    eventId: 1,
    isInstantMeeting,
    username: "testuser",
    timezone: "UTC",
    org: null,
    crmOwnerRecordType: null,
    crmAppSlug: null,
    crmRecordId: null,
    rescheduleUid: null,
    rescheduledBy: null,
    bookingData: null,
    seatedEventData: {},
    selectedTimeslot: null,
    selectedDatesAndTimes: null,
    selectedDuration: null,
    verificationCode: null,
    setRescheduleUid: vi.fn(),
    setBookingData: vi.fn(),
    setSelectedDatesAndTimes: vi.fn(),
    setFormValues: vi.fn(),
  };

  return {
    getState: () => state,
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };
};

const mockEvent = {
  data: {
    id: 1,
    slug: "test-event",
    length: 30,
    requiresConfirmation: false,
    recurringEvent: null,
    schedulingType: null,
    metadata: {},
    successRedirectUrl: null,
    forwardParamsSuccessRedirect: false,
    subsetOfHosts: [],
    isDynamic: false,
    subsetOfUsers: [],
    owner: null,
    seatsPerTimeSlot: null,
    title: "Test Event",
  },
  isSuccess: true,
  isPending: false,
};

const createTestWrapper = (mockStore: ReturnType<typeof createMockStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BookerStoreContext.Provider value={mockStore as any}>{children}</BookerStoreContext.Provider>
    </QueryClientProvider>
  );
};

describe("useBookings - Instant Booking Query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createBatchBookingSummaryEmail).mockResolvedValue({ success: true });
    const mockUseQueryFn = getMockUseQuery();
    mockUseQueryFn.mockReturnValue({
      data: undefined,
      isPending: false,
    });
  });

  it("should NOT enable instant booking query when bookingUid exists but isInstantMeeting is false (seated event scenario - THE BUG)", () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockStore = createMockStore(false);

    renderHook(() => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }), {
      wrapper: createTestWrapper(mockStore),
    });

    const mockUseQueryFn = getMockUseQuery();
    expect(mockUseQueryFn).toHaveBeenCalledWith(
      {
        bookingUid: "test-booking-uid",
      },
      expect.objectContaining({
        enabled: false, // FIX: Should be false when isInstantMeeting is false
      })
    );
  });

  it("should enable instant booking query when bookingUid exists AND isInstantMeeting is true", () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockStore = createMockStore(true);

    renderHook(() => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }), {
      wrapper: createTestWrapper(mockStore),
    });

    const mockUseQueryFn = getMockUseQuery();
    expect(mockUseQueryFn).toHaveBeenCalledWith(
      {
        bookingUid: "test-booking-uid",
      },
      expect.objectContaining({
        enabled: true, // Should be true when isInstantMeeting is true
      })
    );
  });

  it("should NOT set instantVideoMeetingUrl when query returns data but isInstantMeeting is false (prevents redirect bug)", async () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockBookingData = {
      booking: {
        uid: "test-booking-uid",
        metadata: {
          videoCallUrl: "http://localhost:3000/video/test-booking-uid",
        },
      },
    };

    const mockUseQueryFn = getMockUseQuery();
    mockUseQueryFn.mockReturnValue({
      data: mockBookingData,
      isPending: false,
    });

    mockBookingMetadataSchema.parse.mockReturnValue({
      videoCallUrl: "http://localhost:3000/video/test-booking-uid",
    });

    const mockStore = createMockStore(false);

    const { result } = renderHook(
      () => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }),
      {
        wrapper: createTestWrapper(mockStore),
      }
    );

    await waitFor(() => {
      // FIX: instantVideoMeetingUrl should remain undefined when isInstantMeeting is false
      // This prevents the redirect to /video/[uid] for seated events
      expect(result.current.instantVideoMeetingUrl).toBeUndefined();
    });
  });

  it("should set instantVideoMeetingUrl when query returns data AND isInstantMeeting is true", async () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockBookingData = {
      booking: {
        uid: "test-booking-uid",
        metadata: {
          videoCallUrl: "http://localhost:3000/video/test-booking-uid",
        },
      },
    };

    const mockUseQueryFn = getMockUseQuery();
    mockUseQueryFn.mockReturnValue({
      data: mockBookingData,
      isPending: false,
    });

    mockBookingMetadataSchema.parse.mockReturnValue({
      videoCallUrl: "http://localhost:3000/video/test-booking-uid",
    });

    const mockStore = createMockStore(true);

    const { result } = renderHook(
      () => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }),
      {
        wrapper: createTestWrapper(mockStore),
      }
    );

    await waitFor(() => {
      // instantVideoMeetingUrl should be set when isInstantMeeting is true
      expect(result.current.instantVideoMeetingUrl).toBe("http://localhost:3000/video/test-booking-uid");
    });
  });

  it("should create a single resource booking with the selected event type instead of falling back to the base event", async () => {
    vi.mocked(getQueryParam).mockReturnValue(null);
    vi.mocked(createBooking).mockResolvedValue({
      uid: "booking-uid",
      title: "Resource booking",
      startTime: "2024-01-01T10:00:00.000Z",
      endTime: "2024-01-01T10:30:00.000Z",
      eventTypeId: 77,
      paymentRequired: false,
      isDryRun: false,
      user: { email: "host@example.com", timeZone: "UTC" },
      attendees: [],
      status: "ACCEPTED",
    } as never);

    const mockStore = createMockStore(false);
    mockStore.getState().selectedDatesAndTimes = {
      "resource-event": {
        "2024-01-01": ["2024-01-01T10:00:00.000Z"],
      },
    };

    const bookingForm = {
      getValues: vi.fn((path?: string) => {
        if (path === "responses.name") return "Jane Doe";
        if (path === "responses.email") return "jane@example.com";
        return {
          responses: {
            name: "Jane Doe",
            email: "jane@example.com",
          },
        };
      }),
      clearErrors: vi.fn(),
    };

    const { result } = renderHook(
      () =>
        useBookings({
          event: mockEvent,
          bookingForm: bookingForm as never,
          metadata: {},
          allEventTypes: [
            {
              id: 42,
              bookableResourceId: 42,
              slug: "resource-event",
              title: "Resource Event",
              length: 30,
              schedulingType: null,
              eventTypeId: 77,
              eventTypeSlug: "parent-event",
            },
          ],
        }),
      {
        wrapper: createTestWrapper(mockStore),
      }
    );

    result.current.handleBookEvent();

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTypeId: 77,
          eventTypeSlug: "parent-event",
          bookableResourceId: 42,
          user: "testuser",
          start: "2024-01-01T10:00:00+00:00",
        })
      );
    });
  });

  it("should let the owner reserve multiple seats for the same seated slot in one submit", async () => {
    vi.mocked(getQueryParam).mockReturnValue(null);
    vi.mocked(createBooking).mockResolvedValue({
      uid: "booking-uid",
      title: "Owner booking",
      startTime: "2024-01-01T10:00:00.000Z",
      endTime: "2024-01-01T10:30:00.000Z",
      eventTypeId: 1,
      paymentRequired: false,
      isDryRun: false,
      user: { email: "owner@example.com", timeZone: "UTC" },
      attendees: [],
      status: "ACCEPTED",
    } as never);

    const mockStore = createMockStore(false);
    mockStore.getState().selectedTimeslot = "2024-01-01T10:00:00.000Z";
    mockStore.getState().seatedEventData = {
      seatsPerTimeSlot: 12,
      attendees: 3,
    };

    const bookingForm = {
      watch: vi.fn((path?: string) => (path === "responses.email" ? "owner@example.com" : undefined)),
      getValues: vi.fn((path?: string) => {
        if (path === "responses.name") return "Owner";
        if (path === "responses.email") return "owner@example.com";
        return {
          responses: {
            name: "Owner",
            email: "owner@example.com",
          },
        };
      }),
      clearErrors: vi.fn(),
    };

    const { result } = renderHook(
      () =>
        useBookings({
          event: {
            ...mockEvent,
            data: {
              ...mockEvent.data,
              owner: {
                id: 99,
                username: "owner",
                name: "Owner",
                avatarUrl: null,
                weekStart: "Sunday",
                theme: null,
                defaultScheduleId: null,
                brandColor: null,
                darkBrandColor: null,
                metadata: null,
                organization: null,
                nonProfileUsername: "owner",
                profile: {
                  id: null,
                  upId: "usr-99",
                  username: "owner",
                  organizationId: null,
                  organization: null,
                },
              },
              seatsPerTimeSlot: 12,
            },
          },
          currentUser: {
            id: 99,
            email: "owner@example.com",
          },
          bookingForm: bookingForm as never,
          metadata: {},
        }),
      {
        wrapper: createTestWrapper(mockStore),
      }
    );

    act(() => {
      result.current.setOwnerSeatCount(4);
    });

    result.current.handleBookEvent();

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledTimes(4);
    });

    expect(createBooking).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        start: "2024-01-01T10:00:00+00:00",
        metadata: expect.objectContaining({ _ownerSeatBatchIndex: "1" }),
      })
    );
    expect(createBooking).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        start: "2024-01-01T10:00:00+00:00",
        metadata: expect.objectContaining({ _ownerSeatBatchIndex: "4" }),
      })
    );

    expect(createBatchBookingSummaryEmail).toHaveBeenCalledWith({
      attendeeEmail: "owner@example.com",
      batchGroupId: expect.any(String),
      bookingReferences: [
        { bookingUid: "booking-uid", seatReferenceUid: null },
        { bookingUid: "booking-uid", seatReferenceUid: null },
        { bookingUid: "booking-uid", seatReferenceUid: null },
        { bookingUid: "booking-uid", seatReferenceUid: null },
      ],
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      SUCCESS_BOOKING_CART_STORAGE_KEY,
      expect.stringContaining('"primaryBookingUid":"booking-uid"')
    );
  });
});
