import { useEventTypeById } from "@calcom/atoms/hooks/event-types/private/useEventTypeById";
import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import { FromTime } from "@calcom/features/bookings/Booker/utils/dates";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { DialogContent } from "@calcom/ui/components/dialog";
import { useEvent } from "@calcom/web/modules/schedules/hooks/useEvent";
import type { ReactNode } from "react";
import type { SelectedBookingEntry } from "../../hooks/useBookings";
import { getDurationFormatted } from "../event-meta/Duration";

const BookEventFormWrapper = ({
  children,
  selectedBookingEntries,
}: {
  children: ReactNode;
  selectedBookingEntries: SelectedBookingEntry[];
}): JSX.Element => {
  const { data } = useEvent();

  return (
    <BookEventFormWrapperComponent
      child={children}
      eventLength={data?.length}
      selectedBookingEntries={selectedBookingEntries}
    />
  );
};

const PlatformBookEventFormWrapper = ({
  children,
  selectedBookingEntries,
}: {
  children: ReactNode;
  selectedBookingEntries: SelectedBookingEntry[];
}): JSX.Element => {
  const eventId = useBookerStoreContext((state) => state.eventId);
  const { data } = useEventTypeById(eventId);

  return (
    <BookEventFormWrapperComponent
      child={children}
      eventLength={data?.lengthInMinutes}
      selectedBookingEntries={selectedBookingEntries}
    />
  );
};

export const BookEventFormWrapperComponent = ({
  child,
  eventLength,
  selectedBookingEntries,
}: {
  child: ReactNode;
  eventLength?: number;
  selectedBookingEntries: SelectedBookingEntry[];
}): JSX.Element | null => {
  const { i18n, t } = useLocale();
  const selectedTimeslot = useBookerStoreContext((state) => state.selectedTimeslot);
  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);
  const recurringEventCount = useBookerStoreContext((state) => state.recurringEventCount);
  const { timeFormat, timezone } = useBookerTime();

  if (!selectedTimeslot && !selectedBookingEntries.length) {
    return null;
  }

  let bookingDetails: JSX.Element;

  if (selectedBookingEntries.length) {
    bookingDetails = (
      <div className="my-4 space-y-2">
        <Badge variant="grayWithoutHover" startIcon="calendar" size="lg">
          <span>{t("number_selected", { count: selectedBookingEntries.length })}</span>
        </Badge>
        <div className="space-y-2">
          {selectedBookingEntries.map((entry) => (
            <div
              key={`${entry.bookableResourceId ?? entry.eventTypeId}-${entry.start}`}
              className="flex flex-wrap items-center gap-2 rounded-md bg-subtle p-3 leading-none">
              <Badge variant="grayWithoutHover" size="sm">
                <span>{entry.title}</span>
              </Badge>
              <Badge variant="grayWithoutHover" startIcon="calendar" size="sm">
                <FromTime
                  date={entry.start}
                  timeFormat={timeFormat}
                  timeZone={timezone}
                  language={i18n.language}
                />
              </Badge>
              <Badge variant="grayWithoutHover" startIcon="clock" size="sm">
                <span>{getDurationFormatted(entry.length, t)}</span>
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    bookingDetails = (
      <div className="my-4 flex flex-wrap gap-2 rounded-md leading-none">
        <Badge variant="grayWithoutHover" startIcon="calendar" size="lg">
          <FromTime
            date={selectedTimeslot ?? ""}
            timeFormat={timeFormat}
            timeZone={timezone}
            language={i18n.language}
          />
        </Badge>
        {(selectedDuration || eventLength) && (
          <Badge variant="grayWithoutHover" startIcon="clock" size="lg">
            <span>{getDurationFormatted(selectedDuration || eventLength, t)}</span>
          </Badge>
        )}

        {recurringEventCount && recurringEventCount > 1 && (
          <Badge variant="grayWithoutHover" startIcon="refresh-ccw" size="lg">
            <span>
              {t("repeats_num_times", {
                count: recurringEventCount,
              })}
            </span>
          </Badge>
        )}
      </div>
    );
  }

  return (
    <>
      <h1 className="font-cal text-emphasis text-xl leading-5">{t("confirm_your_details")}</h1>
      {bookingDetails}
      {child}
    </>
  );
};

export const BookFormAsModal = ({
  visible,
  onCancel,
  selectedBookingEntries,
  children,
}: {
  visible: boolean;
  onCancel: () => void;
  selectedBookingEntries: SelectedBookingEntry[];
  children: ReactNode;
}): JSX.Element => {
  const isPlatform = useIsPlatform();

  let formWrapper: JSX.Element;

  if (!isPlatform) {
    formWrapper = (
      <BookEventFormWrapper selectedBookingEntries={selectedBookingEntries}>{children}</BookEventFormWrapper>
    );
  } else {
    formWrapper = (
      <PlatformBookEventFormWrapper selectedBookingEntries={selectedBookingEntries}>
        {children}
      </PlatformBookEventFormWrapper>
    );
  }

  return (
    <Dialog open={visible} onOpenChange={onCancel}>
      <DialogContent
        type={undefined}
        enableOverflow
        className="max-h-[80vh] pb-0 [&_.modalsticky]:sticky [&_.modalsticky]:right-0 [&_.modalsticky]:bottom-0 [&_.modalsticky]:left-0 [&_.modalsticky]:-mx-8 [&_.modalsticky]:border-t [&_.modalsticky]:border-t-subtle [&_.modalsticky]:bg-default [&_.modalsticky]:px-8 [&_.modalsticky]:py-4">
        {formWrapper}
      </DialogContent>
    </Dialog>
  );
};
