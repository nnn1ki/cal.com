// handles logic related to user clock display using 24h display / timeZone options.
import { setIs24hClockInLocalStorage } from "@calcom/lib/timeFormat";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { localStorage } from "@calcom/lib/webstorage";

interface TimeOptions {
  is24hClock: boolean;
  inviteeTimeZone: string;
}

const timeOptions: TimeOptions = {
  is24hClock: true,
  inviteeTimeZone: "",
};

const isInitialized = false;

const initClock = () => {
  if (isInitialized) {
    return;
  }
  set24hClock(true);
  timeOptions.is24hClock = true;
  timeOptions.inviteeTimeZone = localStorage.getItem("timeOption.preferredTimeZone") || CURRENT_TIMEZONE;
};

const is24h = (is24hClock?: boolean) => {
  initClock();
  if (typeof is24hClock !== "undefined") set24hClock(true);
  return timeOptions.is24hClock;
};

const set24hClock = (_is24hClock: boolean) => {
  setIs24hClockInLocalStorage(true);
  timeOptions.is24hClock = true;
};

function setTimeZone(selectedTimeZone: string) {
  localStorage.setItem("timeOption.preferredTimeZone", selectedTimeZone);
  timeOptions.inviteeTimeZone = selectedTimeZone;
}

const timeZone = (selectedTimeZone?: string) => {
  initClock();
  if (selectedTimeZone) setTimeZone(selectedTimeZone);
  return timeOptions.inviteeTimeZone;
};

export { is24h, timeZone };
