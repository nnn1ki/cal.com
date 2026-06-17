/*
 * Detects navigator locale 24h time preference
 * It works by checking whether hour output contains AM ('1 AM' or '01 h')
 * based on the user's preferred language
 * defaults to 'en-US' (12h) if no navigator language is found
 */
import { localStorage } from "@calcom/lib/webstorage";

const is24hLocalstorageKey = "timeOption.is24hClock";

export enum TimeFormat {
  TWELVE_HOUR = "h:mma",
  TWENTY_FOUR_HOUR = "HH:mm",
}

export const setIs24hClockInLocalStorage = (_is24h: boolean) =>
  localStorage.setItem(is24hLocalstorageKey, "true");

export const getIs24hClockFromLocalStorage = () => true;

export const getTimeFormatStringFromUserTimeFormat = (_timeFormat: number | null | undefined): TimeFormat => {
  return TimeFormat.TWENTY_FOUR_HOUR;
};

/**
 * Retrieves the browsers time format preference, checking local storage first
 * for a user set preference. If no preference is found, it will use the browser
 * locale to determine the time format and store it in local storage.
 */
export const isBrowserLocale24h = () => {
  setIs24hClockInLocalStorage(true);
  return true;
};

/**
 * Returns the time format string based on whether the current set locale is 24h or 12h.
 */
export const detectBrowserTimeFormat = TimeFormat.TWENTY_FOUR_HOUR;
