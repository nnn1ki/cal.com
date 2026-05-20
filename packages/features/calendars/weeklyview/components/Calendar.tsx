import dayjs from "@calcom/dayjs";
import {
  CalendarStoreContext,
  createCalendarStore,
  useCalendarStore,
} from "@calcom/features/calendars/weeklyview/state/store";
import classNames from "@calcom/ui/classNames";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import "@calcom/features/calendars/weeklyview/styles/styles.css";
import type { CalendarComponentProps } from "@calcom/features/calendars/weeklyview/types/state";
import { getDaysBetweenDates, getHoursToDisplay } from "@calcom/features/calendars/weeklyview/utils";
import { CurrentTime } from "./currentTime";
import { DateValues } from "./DateValues";
import { AvailableCellsForDay, EmptyCell } from "./event/Empty";
import { EventList } from "./event/EventList";
import { SchedulerColumns } from "./grid";
import { SchedulerHeading } from "./heading/SchedulerHeading";
import { HorizontalLines } from "./horizontalLines";
import { Spinner } from "./spinner/Spinner";
import { VerticalLines } from "./verticalLines";

function CalendarInner(props: CalendarComponentProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);
  const schedulerGrid = useRef<HTMLOListElement | null>(null);

  const calendarMode = useCalendarStore((state) => state.calendarMode ?? "date");
  const resources = useCalendarStore((state) => state.resources ?? []);
  const startDate = useCalendarStore((state) => state.startDate);
  const endDate = useCalendarStore((state) => state.endDate);
  const startHour = useCalendarStore((state) => state.startHour || 0);
  const endHour = useCalendarStore((state) => state.endHour || 23);
  const usersCellsStopsPerHour = useCalendarStore((state) => state.gridCellsPerHour || 4);
  const availableTimeslots = useCalendarStore((state) => state.availableTimeslots);
  const resourceTimeSlots = useCalendarStore((state) => state.resourceTimeSlots);
  const hideHeader = useCalendarStore((state) => state.hideHeader);
  const timezone = useCalendarStore((state) => state.timezone);
  const showBackgroundPattern = useCalendarStore((state) => state.showBackgroundPattern);
  const showBorder = useCalendarStore((state) => state.showBorder ?? true);
  const borderColor = useCalendarStore((state) => state.borderColor ?? "default");
  const scrollToCurrentTime = useCalendarStore((state) => state.scrollToCurrentTime ?? true);
  const updateCurrentTimeOnFocus = useCalendarStore((state) => state.updateCurrentTimeOnFocus ?? false);
  const allowVerticalScroll = useCalendarStore((state) => state.allowVerticalScroll ?? false);
  const renderOutOfOffice = useCalendarStore((state) => state.renderOutOfOffice);

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);
  const calendarDay = useMemo(() => dayjs(startDate), [startDate]);
  const columns = calendarMode === "resource" ? resources : days;
  const horizontalContentWidth = useMemo(() => {
    const columnWidth = calendarMode === "resource" ? 220 : 180;
    return `${64 + Math.max(columns.length, 1) * columnWidth}px`;
  }, [calendarMode, columns.length]);

  const hours = useMemo(
    () => getHoursToDisplay(startHour || 0, endHour || 23, timezone),
    [startHour, endHour, timezone]
  );
  const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;
  const hourSize = 58;

  return (
    <div
      className={classNames("scheduler-wrapper flex h-full w-full flex-col")}
      style={
        {
          "--one-minute-height": `calc(${hourSize}px/60)`,
          "--gridDefaultSize": `${hourSize}px`,
        } as React.CSSProperties // This can't live in the css file because it's a dynamic value and css variable gets super
      }>
      {hideHeader !== true && <SchedulerHeading />}
      {props.isPending && <Spinner />}
      <div
        ref={container}
        className="bg-default dark:bg-cal-muted relative isolate flex h-full flex-auto flex-col overflow-hidden">
        <div
          className={classNames(
            "no-scrollbar flex-1 overflow-x-auto",
            allowVerticalScroll ? "overflow-y-auto" : "overflow-y-hidden"
          )}>
          <div
            style={{ minWidth: horizontalContentWidth }}
            className="flex h-full w-max flex-none flex-col">
            <DateValues
              containerNavRef={containerNav}
              days={days}
              showBorder={showBorder}
              borderColor={borderColor}
              calendarMode={calendarMode}
              resources={resources}
            />
            <div className="relative flex flex-auto">
              <CurrentTime
                timezone={timezone}
                scrollToCurrentTime={scrollToCurrentTime}
                updateOnFocus={updateCurrentTimeOnFocus}
              />
              <div
                className={classNames(
                  "bg-default dark:bg-cal-muted ring-muted sticky left-0 z-10 w-16 flex-none ring-1",
                  showBorder &&
                    (borderColor === "subtle"
                      ? "border-subtle border-l border-r"
                      : "border-default border-l border-r")
                )}
              />
              <div
                className="grid flex-auto grid-cols-1 grid-rows-1 [--disabled-gradient-background:#F8F9FB] [--disabled-gradient-foreground:#E6E7EB] dark:[--disabled-gradient-background:#262626] dark:[--disabled-gradient-foreground:#393939]"
                style={
                  showBackgroundPattern === false
                    ? undefined
                    : {
                        backgroundColor: "var(--disabled-gradient-background)",
                        background:
                          "repeating-linear-gradient(-45deg, var(--disabled-gradient-background), var(--disabled-gradient-background) 2.5px, var(--disabled-gradient-foreground) 2.5px, var(--disabled-gradient-foreground) 5px)",
                      }
                }>
                <HorizontalLines
                  hours={hours}
                  numberOfGridStopsPerCell={usersCellsStopsPerHour}
                  containerOffsetRef={containerOffset}
                  borderColor={borderColor}
                />
                <VerticalLines columnCount={columns.length} borderColor={borderColor} />

                <SchedulerColumns
                  offsetHeight={containerOffset.current?.offsetHeight}
                  gridStopsPerDay={numberOfGridStopsPerDay}>
                  {/*Loop over events per day  */}
                  {columns.map((column, i) => {
                    const resource = calendarMode === "resource" ? resources[i] : undefined;
                    const columnDay = calendarMode === "resource" ? calendarDay : days[i];
                    return (
                      <li
                        key={
                          calendarMode === "resource" ? `resource-${resource?.id}` : columnDay.toISOString()
                        }
                        className="relative"
                        style={{ gridColumnStart: i + 1 }}>
                        <EventList day={columnDay} resourceId={resource?.id} calendarMode={calendarMode} />
                        {/* <BlockedList day={day} containerRef={container} /> */}
                      </li>
                    );
                  })}
                </SchedulerColumns>

                {/* Empty Cells */}
                <SchedulerColumns
                  ref={schedulerGrid}
                  offsetHeight={containerOffset.current?.offsetHeight}
                  gridStopsPerDay={numberOfGridStopsPerDay}>
                  <>
                    {Array.from({ length: columns.length }).map((_, i) => {
                      const resource = calendarMode === "resource" ? resources[i] : undefined;
                      const columnDay = calendarMode === "resource" ? calendarDay : days[i];

                      return (
                        <li
                          className="relative"
                          key={i}
                          style={{
                            gridColumnStart: i + 1,
                            gridRow: `1 / span ${numberOfGridStopsPerDay}`,
                          }}>
                          {/* While startDate < endDate:  */}
                          {availableTimeslots || resourceTimeSlots ? (
                            <AvailableCellsForDay
                              key={`${columnDay.toISOString()}-${resource?.id ?? i}`}
                              timezone={timezone}
                              day={columnDay}
                              startHour={startHour}
                              availableSlots={availableTimeslots ?? {}}
                              resourceSlots={resourceTimeSlots}
                              renderOutOfOffice={renderOutOfOffice}
                              resource={resource}
                            />
                          ) : (
                            <>
                              {[...Array(numberOfGridStopsPerDay)].map((_, j) => {
                                const key = `${i}-${j}`;
                                return (
                                  <EmptyCell
                                    key={key}
                                    day={columnDay}
                                    gridCellIdx={j}
                                    totalGridCells={numberOfGridStopsPerDay}
                                    selectionLength={endHour - startHour}
                                    startHour={startHour}
                                    timezone={timezone}
                                  />
                                );
                              })}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </>
                </SchedulerColumns>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Calendar(props: CalendarComponentProps) {
  const storeRef = useRef<ReturnType<typeof createCalendarStore> | null>(null);

  if (!storeRef.current) {
    storeRef.current = createCalendarStore();
    storeRef.current.getState().initState(props);
  }

  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.getState().initState(props);
    }
  }, [props]);

  return (
    <CalendarStoreContext.Provider value={storeRef.current}>
      <CalendarInner {...props} />
    </CalendarStoreContext.Provider>
  );
}
