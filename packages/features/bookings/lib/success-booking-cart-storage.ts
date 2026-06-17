export const SUCCESS_BOOKING_CART_STORAGE_KEY = "successBookingCart";

export type SuccessBookingCartItem = {
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  seatReferenceUid?: string | null;
};

export type SuccessBookingCartSummary = {
  primaryBookingUid: string;
  items: SuccessBookingCartItem[];
};

export const parseSuccessBookingCartSummary = (raw: string | null): SuccessBookingCartSummary | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SuccessBookingCartSummary;
  } catch {
    return null;
  }
};
