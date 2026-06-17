export const FORCED_MINIMUM_BOOKING_NOTICE_MINUTES = 5;

export const getEffectiveMinimumBookingNotice = (_minimumBookingNotice?: number | null) =>
  FORCED_MINIMUM_BOOKING_NOTICE_MINUTES;
