import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import { useAtomsContext } from "@calcom/atoms/hooks/useAtomsContext";
import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { Timezone as PlatformTimzoneSelect } from "@calcom/atoms/timezone";
import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import DestinationCalendarSelector from "@calcom/features/calendars/components/DestinationCalendarSelector";
import { TimezoneSelect as WebTimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import type { EventNameObjectType } from "@calcom/features/eventtypes/lib/eventNaming";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import type {
  CheckboxClassNames,
  EventTypeSetupProps,
  FormValues,
  InputClassNames,
  SelectClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { BookerLayoutSelector } from "@calcom/web/modules/settings/components/BookerLayoutSelector";
import {
  DEFAULT_DARK_BRAND_COLOR,
  DEFAULT_LIGHT_BRAND_COLOR,
  MAX_SEATS_PER_TIME_SLOT,
} from "@calcom/lib/constants";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { extractHostTimezone } from "@calcom/lib/hashedLinksUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Prisma } from "@calcom/prisma/client";
import { CancellationReasonRequirement, SchedulingType } from "@calcom/prisma/enums";
import type { EditableSchema, fieldSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  CheckboxField,
  ColorPicker,
  Label,
  Select,
  SelectField,
  SettingsToggle,
  Switch,
  TextField,
} from "@calcom/ui/components/form";
import { InfoIcon, PencilIcon } from "@coss/ui/icons";
import {
  SelectedCalendarSettingsScope,
  SelectedCalendarsSettingsWebWrapper,
  SelectedCalendarsSettingsWebWrapperSkeleton,
} from "@calcom/web/modules/calendars/components/SelectedCalendarsSettingsWebWrapper";
import { MultiplePrivateLinksController } from "@calcom/web/modules/event-types/components";
import AddVerifiedEmail from "@calcom/web/modules/event-types/components/AddVerifiedEmail";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type { Dispatch, SetStateAction } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { z } from "zod";

import type { CustomEventTypeModalClassNames } from "./CustomEventTypeModal";
import CustomEventTypeModal from "./CustomEventTypeModal";
import type { EmailNotificationToggleCustomClassNames } from "./DisableAllEmailsSetting";
import { DisableAllEmailsSetting } from "./DisableAllEmailsSetting";
import type { DisableReschedulingCustomClassNames } from "./DisableReschedulingController";
import DisableReschedulingController from "./DisableReschedulingController";
import { FormBuilder } from "./FormBuilder";
import type { RequiresConfirmationCustomClassNames } from "./RequiresConfirmationController";
import RequiresConfirmationController from "./RequiresConfirmationController";

export type EventAdvancedTabCustomClassNames = {
  destinationCalendar?: SelectClassNames;
  eventName?: InputClassNames;
  customEventTypeModal?: CustomEventTypeModalClassNames;
  addToCalendarEmailOrganizer?: SettingsToggleClassNames & {
    emailSelect?: {
      container?: string;
      select?: string;
      displayEmailLabel?: string;
    };
  };
  requiresConfirmation?: RequiresConfirmationCustomClassNames;
  disableRescheduling?: DisableReschedulingCustomClassNames;
  bookerEmailVerification?: SettingsToggleClassNames;
  canSendCalVideoTranscriptionEmails?: SettingsToggleClassNames;
  calendarNotes?: SettingsToggleClassNames;
  eventDetailsVisibility?: SettingsToggleClassNames;
  bookingRedirect?: SettingsToggleClassNames & {
    children?: string;
    redirectUrlInput?: InputClassNames;
    forwardParamsCheckbox?: CheckboxClassNames;
    error?: string;
  };
  seatsOptions?: SettingsToggleClassNames & {
    children?: string;
    showAttendeesCheckbox?: CheckboxClassNames;
    showAvalableSeatCountCheckbox?: CheckboxClassNames;
    seatsInput: InputClassNames;
  };
  timezoneLock?: SettingsToggleClassNames;
  hideOrganizerEmail?: SettingsToggleClassNames;
  eventTypeColors?: SettingsToggleClassNames & {
    warningText?: string;
  };
  roundRobinReschedule?: SettingsToggleClassNames;
  customReplyToEmail?: SettingsToggleClassNames;
  emailNotifications?: EmailNotificationToggleCustomClassNames;
};

type BookingField = z.infer<typeof fieldSchema>;

export type EventAdvancedBaseProps = Pick<EventTypeSetupProps, "eventType" | "team"> & {
  user?: Partial<
    Pick<
      RouterOutputs["viewer"]["me"]["get"],
      "email" | "secondaryEmails" | "theme" | "defaultBookerLayouts" | "timeZone"
    >
  >;
  isUserLoading?: boolean;
  showToast: (message: string, variant: "success" | "warning" | "error") => void;
  orgId: number | null;
  customClassNames?: EventAdvancedTabCustomClassNames;
};

export type EventAdvancedTabProps = EventAdvancedBaseProps & {
  calendarsQuery: {
    data?: RouterOutputs["viewer"]["calendars"]["connectedCalendars"];
    isPending: boolean;
    error: unknown;
  };
  showBookerLayoutSelector: boolean;
  localeOptions?: { value: string; label: string }[];
  verifiedEmails?: string[];
};

type CalendarSettingsProps = {
  eventType: EventAdvancedTabProps["eventType"];
  customClassNames?: EventAdvancedTabCustomClassNames;
  calendarsQuery: NonNullable<EventAdvancedTabProps["calendarsQuery"]>;
  eventNameLocked: {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
  eventNamePlaceholder: string;
  setShowEventNameTip: Dispatch<SetStateAction<boolean>>;
  showToast: EventAdvancedTabProps["showToast"];
  verifiedSecondaryEmails: { label: string; value: number }[];
  userEmail: string;
  isTeamEventType: boolean;
  isChildrenManagedEventType: boolean;
};

const destinationCalendarComponents = {
  DestinationCalendarSettings({
    showConnectedCalendarSettings,
    customClassNames,
    calendarsQuery,
    eventNameLocked,
    eventNamePlaceholder,
    setShowEventNameTip,
    verifiedSecondaryEmails,
    userEmail,
    isTeamEventType,
    showToast,
  }: Omit<CalendarSettingsProps, "eventType" | "isChildrenManagedEventType"> & {
    showConnectedCalendarSettings: boolean;
  }) {
    const { t } = useLocale();
    const formMethods = useFormContext<FormValues>();
    return (
      <div className="border-subtle stack-y-6 rounded-lg border p-6">
        <div className={classNames("w-full", customClassNames?.eventName?.container)}>
          <TextField
            label={t("event_name_in_calendar")}
            labelClassName={customClassNames?.eventName?.label}
            addOnClassname={customClassNames?.eventName?.addOn}
            className={customClassNames?.eventName?.input}
            type="text"
            {...eventNameLocked}
            placeholder={eventNamePlaceholder}
            {...formMethods.register("eventName")}
            addOnSuffix={
              <Button
                color="minimal"
                size="sm"
                aria-label="edit custom name"
                className="hover:stroke-3 hover:text-emphasis py-0! -mr-1.5 min-w-fit px-1.5 hover:bg-transparent"
                onClick={() => setShowEventNameTip((old) => !old)}>
                <PencilIcon className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>
    );
  },
  DestinationCalendarSettingsSkeleton() {
    return (
      <div className="border-subtle stack-y-6 rounded-lg border p-6">
        <div className="stack-y-4 lg:stack-y-0 flex flex-col lg:flex-row lg:space-x-4">
          <div className="flex w-full flex-col">
            <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-10 w-full animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-4 w-48 animate-pulse rounded-md" />
          </div>
          <div className="w-full">
            <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-10 w-full animate-pulse rounded-md" />
          </div>
        </div>
        <div className="stack-y-2">
          <div className="bg-emphasis h-6 w-64 animate-pulse rounded-md" />
          <div className="bg-emphasis h-10 w-full animate-pulse rounded-md" />
          <div className="bg-emphasis h-4 w-48 animate-pulse rounded-md" />
        </div>
      </div>
    );
  },
};

const calendarComponents = {
  CalendarSettingsSkeleton() {
    return (
      <div>
        <destinationCalendarComponents.DestinationCalendarSettingsSkeleton />
        <SelectedCalendarsSettingsWebWrapperSkeleton />
      </div>
    );
  },

  CalendarSettings({
    eventType,
    calendarsQuery,
    verifiedSecondaryEmails,
    userEmail,
    isTeamEventType,
    isChildrenManagedEventType,
    customClassNames,
    eventNameLocked,
    eventNamePlaceholder,
    setShowEventNameTip,
    showToast,
  }: CalendarSettingsProps) {
    const formMethods = useFormContext<FormValues>();
    /**
     * Only display calendar selector if user has connected calendars AND if it's not
     * a team event. Since we don't have logic to handle each attendee calendar (for now).
     */

    const isPlatform = useIsPlatform();
    const isConnectedCalendarSettingsApplicable = !isTeamEventType || isChildrenManagedEventType;
    const isConnectedCalendarSettingsLoading = calendarsQuery.isPending;
    const showConnectedCalendarSettings =
      !!calendarsQuery.data?.connectedCalendars.length && isConnectedCalendarSettingsApplicable;

    const selectedCalendarSettingsScope = formMethods.getValues("useEventLevelSelectedCalendars")
      ? SelectedCalendarSettingsScope.EventType
      : SelectedCalendarSettingsScope.User;

    const destinationCalendar = calendarsQuery.data?.destinationCalendar;
    if (isConnectedCalendarSettingsLoading && isConnectedCalendarSettingsApplicable) {
      return <calendarComponents.CalendarSettingsSkeleton />;
    }

    return (
      <div>
        <destinationCalendarComponents.DestinationCalendarSettings
          verifiedSecondaryEmails={verifiedSecondaryEmails}
          userEmail={userEmail}
          isTeamEventType={isTeamEventType}
          calendarsQuery={calendarsQuery}
          eventNameLocked={eventNameLocked}
          eventNamePlaceholder={eventNamePlaceholder}
          setShowEventNameTip={setShowEventNameTip}
          showToast={showToast}
          showConnectedCalendarSettings={showConnectedCalendarSettings}
          customClassNames={customClassNames}
        />
      </div>
    );
  },
};

export const EventAdvancedTab = ({
  eventType,
  team,
  calendarsQuery,
  user,
  isUserLoading,
  showToast,
  showBookerLayoutSelector,
  customClassNames,
  verifiedEmails,
  orgId,
  localeOptions,
}: EventAdvancedTabProps) => {
  const isPlatform = useIsPlatform();
  const platformContext = useAtomsContext();
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  const [multiplePrivateLinksVisible, setMultiplePrivateLinksVisible] = useState(
    !!formMethods.getValues("multiplePrivateLinks") &&
      formMethods.getValues("multiplePrivateLinks")?.length !== 0
  );
  const watchedInterfaceLanguage = formMethods.watch("interfaceLanguage");
  const [interfaceLanguageVisible, setInterfaceLanguageVisible] = useState(
    watchedInterfaceLanguage !== null && watchedInterfaceLanguage !== undefined
  );

  useEffect(() => {
    setInterfaceLanguageVisible(watchedInterfaceLanguage !== null && watchedInterfaceLanguage !== undefined);
  }, [watchedInterfaceLanguage]);
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!formMethods.getValues("successRedirectUrl"));
  const [noRoutingFormRedirectUrlVisible, setNoRoutingFormRedirectUrlVisible] = useState(
    !!formMethods.getValues("redirectUrlOnNoRoutingFormResponse")
  );

  const bookingFields: Prisma.JsonObject = {};
  const workflows = eventType.workflows.map((workflowOnEventType) => workflowOnEventType.workflow);
  const selectedThemeIsDark =
    user?.theme === "dark" ||
    (!user?.theme && typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  formMethods.getValues().bookingFields.forEach(({ name }) => {
    bookingFields[name] = `${name} input`;
  });

  const nameBookingField = formMethods.getValues().bookingFields.find((field) => field.name === "name");
  const isSplit = (nameBookingField && nameBookingField.variant === "firstAndLastName") ?? false;

  const eventNameObject: EventNameObjectType = {
    attendeeName: t("scheduler"),
    eventType: formMethods.getValues("title"),
    eventName: formMethods.getValues("eventName"),
    host: formMethods.getValues("users")[0]?.name || "Nameless",
    bookingFields: bookingFields,
    eventDuration: formMethods.getValues("length"),
    t,
  };

  const [requiresConfirmation, setRequiresConfirmation] = useState(
    formMethods.getValues("requiresConfirmation")
  );
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");
  const multiLocation = (formMethods.getValues("locations") || []).length > 1;
  const noShowFeeEnabled =
    formMethods.getValues("metadata")?.apps?.stripe?.enabled === true &&
    formMethods.getValues("metadata")?.apps?.stripe?.paymentOption === "HOLD";

  const isRecurringEvent = !!formMethods.getValues("recurringEvent");
  const interfaceLanguageOptions =
    localeOptions && localeOptions.length > 0
      ? [{ label: t("visitors_browser_language"), value: "" }, ...localeOptions]
      : [];

  const isRoundRobinEventType =
    eventType.schedulingType && eventType.schedulingType === SchedulingType.ROUND_ROBIN;

  const toggleGuests = (enabled: boolean) => {
    const bookingFields = formMethods.getValues("bookingFields");
    formMethods.setValue(
      "bookingFields",
      bookingFields.map((field) => {
        if (field.name === "guests") {
          return {
            ...field,
            hidden: !enabled,
            editable: (!enabled ? "system-but-hidden" : "system-but-optional") as z.infer<
              typeof EditableSchema
            >,
          };
        }
        return field;
      }),
      { shouldDirty: true }
    );
  };

  const { isChildrenManagedEventType, isManagedEventType, shouldLockDisableProps, shouldLockIndicator } =
    useLockedFieldsManager({
      eventType,
      translate: t,
      formMethods,
    });
  const eventNamePlaceholder = getEventName({
    ...eventNameObject,
    eventName: formMethods.watch("eventName"),
  });

  const successRedirectUrlLocked = shouldLockDisableProps("successRedirectUrl");
  const seatsLocked = shouldLockDisableProps("seatsPerTimeSlotEnabled");
  const requiresBookerEmailVerificationProps = shouldLockDisableProps("requiresBookerEmailVerification");
  const sendCalVideoTranscriptionEmailsProps = shouldLockDisableProps("canSendCalVideoTranscriptionEmails");
  const hideCalendarNotesLocked = shouldLockDisableProps("hideCalendarNotes");
  const hideCalendarEventDetailsLocked = shouldLockDisableProps("hideCalendarEventDetails");
  const eventTypeColorLocked = shouldLockDisableProps("eventTypeColor");
  const lockTimeZoneToggleOnBookingPageLocked = shouldLockDisableProps("lockTimeZoneToggleOnBookingPage");
  const multiplePrivateLinksLocked = shouldLockDisableProps("multiplePrivateLinks");
  const reschedulingPastBookingsLocked = shouldLockDisableProps("allowReschedulingPastBookings");
  const hideOrganizerEmailLocked = shouldLockDisableProps("hideOrganizerEmail");
  const customReplyToEmailLocked = shouldLockDisableProps("customReplyToEmail");

  const disableCancellingLocked = shouldLockDisableProps("disableCancelling");
  const allowReschedulingCancelledBookingsLocked = shouldLockDisableProps(
    "allowReschedulingCancelledBookings"
  );

  const { isLocked: _isLocked, ...eventNameLocked } = shouldLockDisableProps("eventName");

  if (isManagedEventType) {
    multiplePrivateLinksLocked.disabled = true;
  }

  const [disableRescheduling, setDisableRescheduling] = useState(eventType.disableRescheduling || false);

  const [allowReschedulingCancelledBookings, setallowReschedulingCancelledBookings] = useState(
    eventType.allowReschedulingCancelledBookings ?? false
  );

  const showOptimizedSlotsLocked = shouldLockDisableProps("showOptimizedSlots");

  const closeEventNameTip = () => setShowEventNameTip(false);

  const [isEventTypeColorChecked, setIsEventTypeColorChecked] = useState(!!eventType.eventTypeColor);

  const customReplyToEmail = formMethods.watch("customReplyToEmail");

  const [eventTypeColorState, setEventTypeColorState] = useState(
    eventType.eventTypeColor || {
      lightEventTypeColor: DEFAULT_LIGHT_BRAND_COLOR,
      darkEventTypeColor: DEFAULT_DARK_BRAND_COLOR,
    }
  );

  const userTimeZone = extractHostTimezone({
    userId: eventType.userId,
    teamId: eventType.teamId,
    hosts: eventType.hosts,
    owner: eventType.owner,
    team: eventType.team,
  });

  let verifiedSecondaryEmails = [
    {
      label: user?.email || "",
      value: -1,
    },
    ...(user?.secondaryEmails || [])
      .filter((secondaryEmail) => !!secondaryEmail.emailVerified)
      .map((secondaryEmail) => ({ label: secondaryEmail.email, value: secondaryEmail.id })),
  ];

  const removePlatformClientIdFromEmail = (email: string, clientId: string) =>
    email.replace(`+${clientId}`, "");

  let userEmail = user?.email || "";

  if (isPlatform && platformContext.clientId) {
    verifiedSecondaryEmails = verifiedSecondaryEmails.map((email) => ({
      ...email,
      label: removePlatformClientIdFromEmail(email.label, platformContext.clientId),
    }));
    userEmail = removePlatformClientIdFromEmail(userEmail, platformContext.clientId);
  }

  const metadata = formMethods.watch("metadata");
  const paymentAppData = useMemo(() => {
    const _eventType = {
      price: 0,
      currency: "",
      metadata,
    };
    return getPaymentAppData(_eventType);
  }, [metadata]);

  const isPaidEvent = useMemo(
    () => !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0,
    [paymentAppData]
  );

  const TimezoneSelect = useMemo(() => {
    return isPlatform ? PlatformTimzoneSelect : WebTimezoneSelect;
  }, [isPlatform]);

  return (
    <div className="stack-y-4 flex flex-col">
      <calendarComponents.CalendarSettings
        verifiedSecondaryEmails={verifiedSecondaryEmails}
        userEmail={userEmail}
        calendarsQuery={calendarsQuery}
        isTeamEventType={!!team}
        isChildrenManagedEventType={isChildrenManagedEventType}
        customClassNames={customClassNames}
        eventNameLocked={eventNameLocked}
        eventNamePlaceholder={eventNamePlaceholder}
        setShowEventNameTip={setShowEventNameTip}
        showToast={showToast}
        eventType={eventType}
      />

      <div className="border-subtle bg-cal-muted rounded-lg border p-1">
        <div className="p-5">
          <div className="text-default text-sm font-semibold leading-none ltr:mr-1 rtl:ml-1">
            {t("booking_questions_title")}
          </div>
          <p className="text-subtle wrap-break-word mt-1 max-w-[280px] text-sm sm:max-w-[500px]">
            <LearnMoreLink
              t={t}
              i18nKey="booking_questions_description"
              href="https://cal.com/help/event-types/booking-questions"
            />
          </p>
        </div>
        <div className="border-subtle bg-default rounded-lg border p-5">
          <FormBuilder
            showPhoneAndEmailToggle
            title={t("confirmation")}
            description={t("what_booker_should_provide")}
            addFieldLabel={t("add_a_booking_question")}
            formProp="bookingFields"
            {...shouldLockDisableProps("bookingFields")}
            dataStore={{
              options: {
                locations: {
                  // FormBuilder doesn't handle plural for non-english languages. So, use english(Location) only. This is similar to 'Workflow'
                  source: { label: "Location" },
                  value: getLocationsOptionsForSelect(formMethods.getValues("locations") ?? [], t),
                },
              },
            }}
            shouldConsiderRequired={(field: BookingField) => {
              // Location field has a default value at backend so API can send no location but we don't allow it in UI and thus we want to show it as required to user
              return field.name === "location" ? true : field.required;
            }}
            showPriceField={isPaidEvent}
            paymentCurrency={paymentAppData?.currency || "usd"}
          />
        </div>
      </div>
      <RequiresConfirmationController
        eventType={eventType}
        seatsEnabled={seatsEnabled}
        metadata={formMethods.getValues("metadata")}
        requiresConfirmation={requiresConfirmation}
        requiresConfirmationWillBlockSlot={formMethods.getValues("requiresConfirmationWillBlockSlot")}
        onRequiresConfirmation={setRequiresConfirmation}
        customClassNames={customClassNames?.requiresConfirmation}
      />
      <Controller
        name="seatsPerTimeSlotEnabled"
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.seatsOptions?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                value && "rounded-b-none",
                customClassNames?.seatsOptions?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.seatsOptions?.children)}
              descriptionClassName={customClassNames?.seatsOptions?.description}
              data-testid="offer-seats-toggle"
              title={t("offer_seats")}
              {...seatsLocked}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="offer_seats_description"
                  href="https://cal.com/help/event-types/offer-seats"
                />
              }
              checked={value}
              disabled={noShowFeeEnabled || multiLocation || (!seatsEnabled && isRecurringEvent)}
              tooltip={
                multiLocation
                  ? t("multilocation_doesnt_support_seats")
                  : noShowFeeEnabled
                    ? t("no_show_fee_doesnt_support_seats")
                    : isRecurringEvent
                      ? t("recurring_event_doesnt_support_seats")
                      : undefined
              }
              onCheckedChange={(e) => {
                // Enabling seats will disable guests and requiring confirmation until fully supported
                if (e) {
                  toggleGuests(false);
                  formMethods.setValue("requiresConfirmation", false, { shouldDirty: true });
                  setRequiresConfirmation(false);
                  formMethods.setValue("metadata.multipleDuration", undefined, { shouldDirty: true });
                  formMethods.setValue("seatsPerTimeSlot", eventType.seatsPerTimeSlot ?? 2, {
                    shouldDirty: true,
                  });
                } else {
                  formMethods.setValue("seatsPerTimeSlot", null);
                  toggleGuests(true);
                }
                onChange(e);
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <Controller
                  name="seatsPerTimeSlot"
                  render={({ field: { value, onChange } }) => (
                    <div>
                      <TextField
                        required
                        name="seatsPerTimeSlot"
                        labelSrOnly
                        label={t("number_of_seats")}
                        type="number"
                        disabled={seatsLocked.disabled}
                        //For old events if value > MAX_SEATS_PER_TIME_SLOT
                        value={value > MAX_SEATS_PER_TIME_SLOT ? MAX_SEATS_PER_TIME_SLOT : (value ?? 1)}
                        step={1}
                        placeholder="1"
                        min={1}
                        max={MAX_SEATS_PER_TIME_SLOT}
                        containerClassName={classNames(
                          "max-w-80",
                          customClassNames?.seatsOptions?.seatsInput.container
                        )}
                        addOnClassname={customClassNames?.seatsOptions?.seatsInput.addOn}
                        className={customClassNames?.seatsOptions?.seatsInput?.input}
                        labelClassName={customClassNames?.seatsOptions?.seatsInput?.label}
                        addOnSuffix={t("seats")}
                        onChange={(e) => {
                          const enteredValue = parseInt(e.target.value);
                          onChange(Math.min(enteredValue, MAX_SEATS_PER_TIME_SLOT));
                        }}
                        data-testid="seats-per-time-slot"
                      />
                      <div
                        className={classNames(
                          "mt-4",
                          customClassNames?.seatsOptions?.showAttendeesCheckbox?.container
                        )}>
                        <Controller
                          name="seatsShowAttendees"
                          render={({ field: { value, onChange } }) => (
                            <CheckboxField
                              data-testid="show-attendees"
                              description={t("show_attendees")}
                              className={customClassNames?.seatsOptions?.showAttendeesCheckbox?.checkbox}
                              descriptionClassName={
                                customClassNames?.seatsOptions?.showAttendeesCheckbox?.description
                              }
                              disabled={seatsLocked.disabled}
                              onChange={(e) => onChange(e)}
                              checked={value}
                            />
                          )}
                        />
                      </div>
                      <div
                        className={classNames(
                          "mt-2",
                          customClassNames?.seatsOptions?.showAvalableSeatCountCheckbox?.container
                        )}>
                        <Controller
                          name="seatsShowAvailabilityCount"
                          render={({ field: { value, onChange } }) => (
                            <CheckboxField
                              description={t("show_available_seats_count")}
                              disabled={seatsLocked.disabled}
                              onChange={(e) => onChange(e)}
                              checked={value}
                              className={
                                customClassNames?.seatsOptions?.showAvalableSeatCountCheckbox?.checkbox
                              }
                              descriptionClassName={
                                customClassNames?.seatsOptions?.showAvalableSeatCountCheckbox?.description
                              }
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}
                />
              </div>
            </SettingsToggle>
            {noShowFeeEnabled && <Alert severity="warning" title={t("seats_and_no_show_fee_error")} />}
          </>
        )}
      />
      <Controller
        name="lockTimeZoneToggleOnBookingPage"
        render={({ field: { value, onChange } }) => {
          // Calculate if we should show the selector based on current form state & handle backward compatibility
          const currentLockedTimeZone = formMethods.getValues("lockedTimeZone");
          const showSelector =
            value &&
            (!(eventType.lockTimeZoneToggleOnBookingPage && !eventType.lockedTimeZone) ||
              !!currentLockedTimeZone);

          return (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.timezoneLock?.label)}
              descriptionClassName={customClassNames?.timezoneLock?.description}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                customClassNames?.timezoneLock?.container,
                showSelector && "rounded-b-none"
              )}
              title={t("lock_timezone_toggle_on_booking_page")}
              {...lockTimeZoneToggleOnBookingPageLocked}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="description_lock_timezone_toggle_on_booking_page"
                  href="https://cal.com/help/event-types/timezone-lock"
                />
              }
              checked={value}
              onCheckedChange={(e) => {
                onChange(e);
                const lockedTimeZone = e ? (eventType.lockedTimeZone ?? "Europe/London") : null;
                formMethods.setValue("lockedTimeZone", lockedTimeZone, { shouldDirty: true });
              }}
              data-testid="lock-timezone-toggle"
              childrenClassName="lg:ml-0">
              {showSelector && (
                <div className="border-subtle flex flex-col gap-6 rounded-b-lg border border-t-0 p-6">
                  <div>
                    <Controller
                      name="lockedTimeZone"
                      control={formMethods.control}
                      render={({ field: { value } }) => (
                        <>
                          <Label className="text-default mb-2 block text-sm font-medium">
                            <>{t("timezone")}</>
                          </Label>
                          <TimezoneSelect
                            id="lockedTimeZone"
                            value={value ?? "Europe/London"}
                            onChange={(event) => {
                              if (event)
                                formMethods.setValue("lockedTimeZone", event.value, { shouldDirty: true });
                            }}
                          />
                        </>
                      )}
                    />
                  </div>
                </div>
              )}
            </SettingsToggle>
          );
        }}
      />
      {showEventNameTip && (
        <CustomEventTypeModal
          close={closeEventNameTip}
          setValue={(val: string) => formMethods.setValue("eventName", val, { shouldDirty: true })}
          defaultValue={formMethods.getValues("eventName")}
          placeHolder={eventNamePlaceholder}
          isNameFieldSplit={isSplit}
          event={eventNameObject}
          customClassNames={customClassNames?.customEventTypeModal}
        />
      )}
    </div>
  );
};
