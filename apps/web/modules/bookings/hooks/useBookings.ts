"use client";

import process from "node:process";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { useHandleBookEvent } from "@calcom/atoms/hooks/bookings/useHandleBookEvent";
import dayjs from "@calcom/dayjs";
import { sdkActionManager } from "@calcom/embed-core/embed-iframe";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import type { UseBookingFormReturnType } from "@calcom/features/bookings/Booker/hooks/useBookingForm";
import type { BookableResource } from "@calcom/features/bookings/Booker/types";
import { getQueryParam, updateQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { mapBookingToMutationInput } from "@calcom/features/bookings/lib";
import { useBookingSuccessRedirect } from "@calcom/features/bookings/lib/bookingSuccessRedirect";
import { storeDecoyBooking } from "@calcom/features/bookings/lib/client/decoyBookingStore";
import { createBooking } from "@calcom/features/bookings/lib/create-booking";
import { createInstantBooking } from "@calcom/features/bookings/lib/create-instant-booking";
import { createRecurringBooking } from "@calcom/features/bookings/lib/create-recurring-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { getFullName } from "@calcom/features/form-builder/utils";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { shallow } from "zustand/shallow";

export interface IUseBookings {
  event: {
    data?:
      | (Pick<
          BookerEvent,
          | "id"
          | "slug"
          | "subsetOfHosts"
          | "requiresConfirmation"
          | "isDynamic"
          | "metadata"
          | "forwardParamsSuccessRedirect"
          | "successRedirectUrl"
          | "length"
          | "recurringEvent"
          | "schedulingType"
        > & {
          subsetOfUsers: Pick<
            BookerEvent["subsetOfUsers"][number],
            "name" | "username" | "avatarUrl" | "weekStart" | "profile" | "bookerUrl"
          >[];
        })
      | null;
  };
  hashedLink?: string | null;
  bookingForm: UseBookingFormReturnType["bookingForm"];
  metadata: Record<string, string>;
  teamMemberEmail?: string | null;
  isBookingDryRun?: boolean;
  allEventTypes?: BookableResource[];
}

export type SelectedBookingEntry = {
  bookableResourceId?: number;
  bookableResourceSlug: string;
  eventTypeId: number;
  eventTypeSlug: string;
  title: string;
  length: number;
  schedulingType: BookableResource["schedulingType"];
  start: string;
  dateKey: string;
};

const buildSelectedBookingEntries = ({
  allEventTypes,
  selectedDatesAndTimes,
  selectedDuration,
}: {
  allEventTypes?: BookableResource[];
  selectedDatesAndTimes: { [key: string]: { [key: string]: string[] } } | null;
  selectedDuration: number | null;
}): SelectedBookingEntry[] => {
  if (!selectedDatesAndTimes || !allEventTypes?.length) {
    return [];
  }

  return allEventTypes
    .flatMap((resource) => {
      const selectionsByDate = selectedDatesAndTimes[resource.slug] ?? {};

      return Object.entries(selectionsByDate).flatMap(([dateKey, slots]) =>
        slots.map((slot) => ({
          bookableResourceId: resource.bookableResourceId,
          bookableResourceSlug: resource.slug,
          eventTypeId: resource.eventTypeId ?? resource.id,
          eventTypeSlug: resource.eventTypeSlug ?? resource.slug,
          title: resource.title,
          length: selectedDuration ?? resource.length,
          schedulingType: resource.schedulingType,
          start: slot,
          dateKey,
        }))
      );
    })
    .sort((entryA, entryB) => {
      const startDiff = dayjs(entryA.start).valueOf() - dayjs(entryB.start).valueOf();

      if (startDiff !== 0) {
        return startDiff;
      }

      return entryA.title.localeCompare(entryB.title);
    });
};

const buildBookingInputForEntry = ({
  entry,
  values,
  timezone,
  language,
  username,
  metadata,
  hashedLink,
  teamMemberEmail,
  crmOwnerRecordType,
  crmAppSlug,
  crmRecordId,
  orgSlug,
  verificationCode,
  isBookingDryRun,
}: {
  entry: SelectedBookingEntry;
  values: ReturnType<UseBookingFormReturnType["bookingForm"]["getValues"]>;
  timezone: string;
  language: string;
  username: string | null;
  metadata: Record<string, string>;
  hashedLink?: string | null;
  teamMemberEmail?: string | null;
  crmOwnerRecordType?: string | null;
  crmAppSlug?: string | null;
  crmRecordId?: string | null;
  orgSlug?: string | null;
  verificationCode?: string | null;
  isBookingDryRun?: boolean;
}) => {
  return {
    values,
    event: {
      id: entry.eventTypeId,
      length: entry.length,
      slug: entry.eventTypeSlug,
      schedulingType: entry.schedulingType,
      recurringEvent: null,
    },
    bookableResourceId: entry.bookableResourceId,
    date: entry.start,
    duration: entry.length,
    timeZone: timezone,
    language,
    rescheduleUid: undefined,
    rescheduledBy: undefined,
    username: username || "",
    metadata,
    hashedLink,
    teamMemberEmail,
    crmOwnerRecordType,
    crmAppSlug,
    crmRecordId,
    orgSlug: orgSlug || undefined,
    verificationCode: verificationCode || undefined,
    isDryRunProp: isBookingDryRun,
  };
};

const getBaseBookingEventPayload = (booking: {
  title?: string;
  startTime: string;
  endTime: string;
  eventTypeId?: number | null;
  status?: BookingStatus;
  paymentRequired: boolean;
  isRecurring: boolean;
  videoCallUrl?: string;
}) => {
  return {
    title: booking.title,
    startTime: booking.startTime,
    endTime: booking.endTime,
    eventTypeId: booking.eventTypeId,
    status: booking.status,
    paymentRequired: booking.paymentRequired,
    isRecurring: booking.isRecurring,
    videoCallUrl: booking.videoCallUrl,
  };
};

const getBookingSuccessfulEventPayload = (booking: {
  title?: string;
  startTime: string;
  endTime: string;
  eventTypeId?: number | null;
  status?: BookingStatus;
  paymentRequired: boolean;
  uid?: string;
  isRecurring: boolean;
  videoCallUrl?: string;
}) => {
  return {
    uid: booking.uid,
    ...getBaseBookingEventPayload(booking),
  };
};

const getRescheduleBookingSuccessfulEventPayload = getBookingSuccessfulEventPayload;

export const getDryRunBookingSuccessfulEventPayload = getBaseBookingEventPayload;

export const getDryRunRescheduleBookingSuccessfulEventPayload = getDryRunBookingSuccessfulEventPayload;
export interface IUseBookingLoadingStates {
  creatingBooking: boolean;
  creatingRecurringBooking: boolean;
  creatingInstantBooking: boolean;
}

export interface IUseBookingErrors {
  hasDataErrors: boolean;
  dataErrors: unknown;
}
export type UseBookingsReturnType = ReturnType<typeof useBookings>;

const STORAGE_KEY = "instantBookingData";
const COOLDOWN_STORAGE_KEY = "instantBookingCooldownByEvent";
const COOLDOWN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

type InstantBookingCooldownMap = Record<string, number>;

const readInstantCooldownMap = (): InstantBookingCooldownMap => {
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InstantBookingCooldownMap) : {};
  } catch {
    return {};
  }
};

const writeInstantCooldownMap = (map: InstantBookingCooldownMap) => {
  try {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // don't do anything
  }
};

const getInstantCooldownRemainingMs = (eventTypeId?: number | null): number => {
  if (!eventTypeId) return 0;
  const map = readInstantCooldownMap();
  const lastTs = map[String(eventTypeId)];
  if (!lastTs) return 0;
  const remaining = lastTs + COOLDOWN_WINDOW_MS - Date.now();
  return remaining > 0 ? remaining : 0;
};

const setInstantCooldownNow = (eventTypeId?: number | null) => {
  if (!eventTypeId) return;
  const map = readInstantCooldownMap();
  map[String(eventTypeId)] = Date.now();
  writeInstantCooldownMap(map);
};

const storeInLocalStorage = ({
  eventTypeId,
  expiryTime,
  bookingUid,
}: {
  eventTypeId: number;
  expiryTime: Date;
  bookingUid: string;
}) => {
  const value = JSON.stringify({ eventTypeId, expiryTime, bookingUid });
  localStorage.setItem(STORAGE_KEY, value);
};

export const useBookings = ({
  event,
  hashedLink,
  bookingForm,
  metadata,
  isBookingDryRun,
  allEventTypes,
  teamMemberEmail,
}: IUseBookings) => {
  const router = useRouter();
  const eventSlug = useBookerStoreContext((state) => state.eventSlug);
  const eventTypeId = useBookerStoreContext((state) => state.eventId);
  const isInstantMeeting = useBookerStoreContext((state) => state.isInstantMeeting);
  const username = useBookerStoreContext((state) => state.username);
  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);
  const setFormValues = useBookerStoreContext((state) => state.setFormValues);
  const verificationCode = useBookerStoreContext((state) => state.verificationCode);
  const orgSlug = useBookerStoreContext((state) => state.org);
  const crmOwnerRecordType = useBookerStoreContext((state) => state.crmOwnerRecordType);
  const crmAppSlug = useBookerStoreContext((state) => state.crmAppSlug);
  const crmRecordId = useBookerStoreContext((state) => state.crmRecordId);
  const [selectedDatesAndTimes, setSelectedDatesAndTimes] = useBookerStoreContext((state) => [
    state.selectedDatesAndTimes,
    state.setSelectedDatesAndTimes,
  ]);

  const [rescheduleUid, setRescheduleUid] = useBookerStoreContext(
    (state) => [state.rescheduleUid, state.setRescheduleUid],
    shallow
  );
  const rescheduledBy = useBookerStoreContext((state) => state.rescheduledBy);
  const [bookingData, setBookingData] = useBookerStoreContext(
    (state) => [state.bookingData, state.setBookingData],
    shallow
  );
  const timeslot = useBookerStoreContext((state) => state.selectedTimeslot);
  const { i18n, t } = useLocale();
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const bookerFormErrorRef = useRef<HTMLDivElement>(null);

  const [instantMeetingTokenExpiryTime, setExpiryTime] = useState<Date | undefined>();
  const [instantVideoMeetingUrl, setInstantVideoMeetingUrl] = useState<string | undefined>();
  const [isBatchBookingPending, setIsBatchBookingPending] = useState(false);
  const duration = useBookerStoreContext((state) => state.selectedDuration);
  const { timezone } = useBookerTime();

  const isRescheduling = !!rescheduleUid && !!bookingData;

  const bookingUid = getQueryParam("bookingUid") ?? "";

  useEffect(() => {
    if (!isInstantMeeting) return;

    const storedInfo = localStorage.getItem(STORAGE_KEY);

    if (storedInfo) {
      const parsedInfo = JSON.parse(storedInfo);

      const parsedInstantBookingInfo =
        parsedInfo.eventTypeId === eventTypeId &&
        isInstantMeeting &&
        new Date(parsedInfo.expiryTime) > new Date()
          ? parsedInfo
          : null;

      if (parsedInstantBookingInfo) {
        setExpiryTime(parsedInstantBookingInfo.expiryTime);
        updateQueryParam("bookingUid", parsedInstantBookingInfo.bookingUid);
      }
    }
  }, [eventTypeId, isInstantMeeting]);

  const instantConnectCooldownMs = getInstantCooldownRemainingMs(eventTypeId);

  const selectedBookingEntries = useMemo<SelectedBookingEntry[]>(() => {
    return buildSelectedBookingEntries({
      allEventTypes,
      selectedDatesAndTimes,
      selectedDuration,
    });
  }, [allEventTypes, selectedDatesAndTimes, selectedDuration]);

  const _instantBooking = trpc.viewer.bookings.getInstantBookingLocation.useQuery(
    {
      bookingUid: bookingUid,
    },
    {
      enabled: !!bookingUid && isInstantMeeting,
      refetchInterval: 2000,
      refetchIntervalInBackground: true,
    }
  );
  useEffect(
    function refactorMeWithoutEffect() {
      const data = _instantBooking.data;

      if (!data || !data.booking || !isInstantMeeting) return;
      try {
        const locationVideoCallUrl: string | undefined = bookingMetadataSchema.parse(
          data.booking?.metadata || {}
        )?.videoCallUrl;

        if (locationVideoCallUrl) {
          setInstantVideoMeetingUrl(locationVideoCallUrl);
        } else {
          showToast(t("something_went_wrong_on_our_end"), "error");
        }
      } catch {
        showToast(t("something_went_wrong_on_our_end"), "error");
      }
    },
    [_instantBooking.data, isInstantMeeting]
  );

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug("createBookingMutation success", booking);
      }

      if (booking.isDryRun) {
        if (isRescheduling) {
          sdkActionManager?.fire(
            "dryRunRescheduleBookingSuccessfulV2",
            getDryRunRescheduleBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: false,
            })
          );
        } else {
          sdkActionManager?.fire(
            "dryRunBookingSuccessfulV2",
            getDryRunBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: false,
            })
          );
        }

        router.push("/booking/dry-run-successful");
        return;
      }

      if ("isShortCircuitedBooking" in booking && booking.isShortCircuitedBooking) {
        if (!booking.uid) {
          console.error("Decoy booking missing uid");
          return;
        }

        const bookingData = {
          uid: booking.uid,
          title: booking.title ?? null,
          startTime: booking.startTime,
          endTime: booking.endTime,
          booker: booking.attendees?.[0] ?? null,
          host: booking.user ?? null,
          location: booking.location ?? null,
        };

        storeDecoyBooking(bookingData);
        router.push(`/booking-successful/${booking.uid}`);
        return;
      }

      const { uid, paymentUid } = booking;
      const fullName = getFullName(bookingForm.getValues("responses.name"));

      const users = event.data?.subsetOfHosts?.length
        ? event.data?.subsetOfHosts.map((host) => host.user)
        : event.data?.subsetOfUsers;

      const validDuration = event.data?.isDynamic
        ? duration || event.data?.length
        : duration && event.data?.metadata?.multipleDuration?.includes(duration)
          ? duration
          : event.data?.length;

      if (isRescheduling) {
        sdkActionManager?.fire("rescheduleBookingSuccessful", {
          booking: booking,
          eventType: event.data,
          date: booking?.startTime?.toString() || "",
          duration: validDuration,
          organizer: {
            name: users?.[0]?.name || "Nameless",
            email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
            timeZone: booking.user?.timeZone || "Europe/London",
          },
          confirmed: !(booking.status === BookingStatus.PENDING && event.data?.requiresConfirmation),
        });
        sdkActionManager?.fire(
          "rescheduleBookingSuccessfulV2",
          getRescheduleBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: false,
          })
        );
      } else {
        sdkActionManager?.fire("bookingSuccessful", {
          booking: booking,
          eventType: event.data,
          date: booking?.startTime?.toString() || "",
          duration: validDuration,
          organizer: {
            name: users?.[0]?.name || "Nameless",
            email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
            timeZone: booking.user?.timeZone || "Europe/London",
          },
          confirmed: !(booking.status === BookingStatus.PENDING && event.data?.requiresConfirmation),
        });

        sdkActionManager?.fire(
          "bookingSuccessfulV2",
          getBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: false,
          })
        );
      }

      if (paymentUid) {
        router.push(
          createPaymentLink({
            paymentUid,
            date: timeslot,
            name: fullName,
            email: bookingForm.getValues("responses.email"),
            absolute: false,
          })
        );
        return;
      }

      if (!uid) {
        console.error("No uid returned from createBookingMutation");
        return;
      }

      const query = {
        isSuccessBookingPage: true,
        email: bookingForm.getValues("responses.email"),
        eventTypeSlug: eventSlug,
        seatReferenceUid: "seatReferenceUid" in booking ? (booking.seatReferenceUid as string) : null,
        formerTime:
          isRescheduling && bookingData?.startTime ? dayjs(bookingData.startTime).toString() : undefined,
        rescheduledBy, // ensure further reschedules performed on the success page are recorded correctly
      };

      bookingSuccessRedirect({
        successRedirectUrl: event?.data?.successRedirectUrl || "",
        query,
        booking: booking,
        forwardParamsSuccessRedirect:
          event?.data?.forwardParamsSuccessRedirect === undefined
            ? true
            : event?.data?.forwardParamsSuccessRedirect,
      });
    },
    onError: (err) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("createBookingMutation error", err);
      }

      if (bookerFormErrorRef?.current) {
        bookerFormErrorRef.current.scrollIntoView({ behavior: "smooth" });
      }

      const error = err as Error & {
        data: { rescheduleUid: string; startTime: string; attendees: string[]; seatUid?: string };
        traceId?: string;
      };

      if (error.message === ErrorCode.BookerLimitExceededReschedule && error.data?.rescheduleUid) {
        setRescheduleUid(error.data?.seatUid ?? error.data?.rescheduleUid);
        setBookingData({
          uid: error.data?.rescheduleUid,
          startTime: error.data?.startTime,
          attendees: error.data?.attendees,
        } as unknown as GetBookingType);
      }
    },
  });

  const createInstantBookingMutation = useMutation({
    mutationFn: createInstantBooking,
    onSuccess: (responseData) => {
      if (eventTypeId) {
        storeInLocalStorage({
          eventTypeId,
          expiryTime: responseData.expires,
          bookingUid: responseData.bookingUid,
        });
        setInstantCooldownNow(eventTypeId);
      }

      updateQueryParam("bookingUid", responseData.bookingUid);
      setExpiryTime(responseData.expires);
    },
    onError: (err) => {
      console.error("Error creating instant booking", err);
      if (bookerFormErrorRef?.current) {
        bookerFormErrorRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
  });

  const createRecurringBookingMutation = useMutation({
    mutationFn: createRecurringBooking,
    onSuccess: async (bookings) => {
      const booking = bookings[0] || {};

      if (booking.isDryRun) {
        if (isRescheduling) {
          sdkActionManager?.fire("dryRunRescheduleBookingSuccessfulV2", {
            ...getDryRunRescheduleBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: true,
            }),
            allBookings: bookings.map((booking) => ({
              startTime: booking.startTime,
              endTime: booking.endTime,
            })),
          });
        } else {
          sdkActionManager?.fire("dryRunBookingSuccessfulV2", {
            ...getDryRunBookingSuccessfulEventPayload({
              ...booking,
              isRecurring: true,
            }),
            allBookings: bookings.map((booking) => ({
              startTime: booking.startTime,
              endTime: booking.endTime,
            })),
          });
        }

        router.push("/booking/dry-run-successful");
        return;
      }

      const { uid } = booking;

      if (!uid) {
        console.error("No uid returned from createRecurringBookingMutation");
        return;
      }

      const query = {
        isSuccessBookingPage: true,
        allRemainingBookings: true,
        email: bookingForm.getValues("responses.email"),
        eventTypeSlug: eventSlug,
        formerTime:
          isRescheduling && bookingData?.startTime ? dayjs(bookingData.startTime).toString() : undefined,
      };

      if (isRescheduling) {
        // NOTE: It is recommended to define the event payload in the argument itself to provide a better type safety.
        sdkActionManager?.fire("rescheduleBookingSuccessfulV2", {
          ...getRescheduleBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: true,
          }),
          allBookings: bookings.map((booking) => ({
            startTime: booking.startTime,
            endTime: booking.endTime,
          })),
        });
      } else {
        sdkActionManager?.fire("bookingSuccessfulV2", {
          ...getBookingSuccessfulEventPayload({
            ...booking,
            isRecurring: true,
          }),
          allBookings: bookings.map((booking) => ({
            startTime: booking.startTime,
            endTime: booking.endTime,
          })),
        });
      }

      bookingSuccessRedirect({
        successRedirectUrl: event?.data?.successRedirectUrl || "",
        query,
        booking,
        forwardParamsSuccessRedirect:
          event?.data?.forwardParamsSuccessRedirect === undefined
            ? true
            : event?.data?.forwardParamsSuccessRedirect,
      });
    },
    onError: (err, _, ctx) => {
      console.error("Error creating recurring booking", err);
      // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed -- It is only called when user takes an action in embed
      bookerFormErrorRef && bookerFormErrorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const handleSingleBookEvent = useHandleBookEvent({
    event,
    bookingForm,
    hashedLink,
    metadata,
    handleInstantBooking: (variables: Parameters<typeof createInstantBookingMutation.mutate>[0]) => {
      const remaining = getInstantCooldownRemainingMs(eventTypeId);
      if (remaining > 0) {
        showToast(
          t("please_try_again_later_or_book_another_slot", { remaining: Math.ceil(remaining / 60000) }),
          "error"
        );
        return;
      }
      createInstantBookingMutation.mutate(variables);
    },
    handleRecBooking: createRecurringBookingMutation.mutate,
    handleBooking: createBookingMutation.mutate,
    isBookingDryRun,
  });

  const handleBatchBookEvent = async (bookingEntries = selectedBookingEntries) => {
    const values = bookingForm.getValues();

    if (!bookingEntries.length) {
      showToast(t("error_booking_event"), "error");
      return;
    }

    if (!timezone) {
      showToast(t("error_booking_event"), "error");
      return;
    }

    try {
      setIsBatchBookingPending(true);
      setFormValues({});
      bookingForm.clearErrors();

      const createdBookings = [];

      for (const selectedBooking of bookingEntries) {
        const bookingInput = buildBookingInputForEntry({
          entry: selectedBooking,
          values,
          timezone,
          language: i18n.language,
          username,
          metadata,
          hashedLink,
          teamMemberEmail,
          crmOwnerRecordType,
          crmAppSlug,
          crmRecordId,
          orgSlug,
          verificationCode,
          isBookingDryRun,
        });

        const bookingPayload = {
          ...mapBookingToMutationInput(bookingInput),
        };
        const booking = await createBooking(bookingPayload);
        createdBookings.push(booking);
      }

      const firstBooking = createdBookings[0];

      setSelectedDatesAndTimes({});
      setFormValues({});
      bookingForm.clearErrors();

      if (firstBooking.isDryRun) {
        sdkActionManager?.fire("dryRunBookingSuccessfulV2", {
          ...getDryRunBookingSuccessfulEventPayload({
            ...firstBooking,
            isRecurring: false,
          }),
          allBookings: createdBookings.map((booking) => ({
            startTime: booking.startTime,
            endTime: booking.endTime,
            eventTypeId: booking.eventTypeId,
          })),
        });
        router.push("/booking/dry-run-successful");
        return;
      }

      if (!firstBooking?.uid) {
        console.error("No uid returned from batch createBooking");
        return;
      }

      bookingSuccessRedirect({
        successRedirectUrl: event?.data?.successRedirectUrl || "",
        query: {
          isSuccessBookingPage: true,
          email: bookingForm.getValues("responses.email"),
          eventTypeSlug: selectedBookingEntries[0]?.eventTypeSlug ?? eventSlug,
        },
        booking: firstBooking,
        forwardParamsSuccessRedirect:
          event?.data?.forwardParamsSuccessRedirect === undefined
            ? true
            : event?.data?.forwardParamsSuccessRedirect,
      });
    } catch (error) {
      console.error("Batch booking failed", {
        error,
        selectedBookingEntries: bookingEntries,
        selectedTimeslot: timeslot,
        eventSlug,
      });

      if (bookerFormErrorRef?.current) {
        bookerFormErrorRef.current.scrollIntoView({ behavior: "smooth" });
      }

      const errorMessage = error instanceof Error ? t(error.message) : t("can_you_try_again");
      showToast(errorMessage, "error");
    } finally {
      setIsBatchBookingPending(false);
    }
  };

  const handleBookEvent = (inputTimeSlot?: string) => {
    const effectiveSelectedBookingEntries =
      selectedBookingEntries.length > 0
        ? selectedBookingEntries
        : buildSelectedBookingEntries({
            allEventTypes,
            selectedDatesAndTimes,
            selectedDuration,
          });

    if (process.env.NODE_ENV !== "production") {
      console.debug("handleBookEvent called", {
        inputTimeSlot,
        selectedTimeslot: timeslot,
        effectiveSelectedBookingEntries,
      });
    }

    if (effectiveSelectedBookingEntries.length === 1) {
      if (!timezone) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Booking aborted: missing timezone", {
            selectedTimeslot: timeslot,
            effectiveSelectedBookingEntries,
          });
        }

        showToast(t("error_booking_event"), "error");
        return;
      }

      setFormValues({});
      bookingForm.clearErrors();

      const bookingPayload = mapBookingToMutationInput(
        buildBookingInputForEntry({
          entry: effectiveSelectedBookingEntries[0],
          values: bookingForm.getValues(),
          timezone,
          language: i18n.language,
          username,
          metadata,
          hashedLink,
          teamMemberEmail,
          crmOwnerRecordType,
          crmAppSlug,
          crmRecordId,
          orgSlug,
          verificationCode,
          isBookingDryRun,
        })
      );

      if (process.env.NODE_ENV !== "production") {
        console.debug("Submitting single resource booking", bookingPayload);
      }

      createBookingMutation.mutate(bookingPayload);
      return;
    }

    if (effectiveSelectedBookingEntries.length > 0) {
      void handleBatchBookEvent(effectiveSelectedBookingEntries);
      return;
    }

    handleSingleBookEvent(inputTimeSlot);
  };

  const errors = {
    hasDataErrors: Boolean(
      createBookingMutation.isError ||
        createRecurringBookingMutation.isError ||
        createInstantBookingMutation.isError
    ),
    dataErrors:
      createBookingMutation.error ||
      createRecurringBookingMutation.error ||
      createInstantBookingMutation.error,
  };

  // A redirect is triggered on mutation success, so keep the loading state while it is happening.
  const loadingStates = {
    creatingBooking:
      isBatchBookingPending || createBookingMutation.isPending || createBookingMutation.isSuccess,
    creatingRecurringBooking:
      createRecurringBookingMutation.isPending || createRecurringBookingMutation.isSuccess,
    creatingInstantBooking: createInstantBookingMutation.isPending,
  };

  return {
    handleBookEvent,
    handleBatchBookEvent,
    selectedBookingEntries,
    expiryTime: instantMeetingTokenExpiryTime,
    bookingForm,
    bookerFormErrorRef,
    errors,
    loadingStates,
    instantVideoMeetingUrl,
    instantConnectCooldownMs,
  };
};
