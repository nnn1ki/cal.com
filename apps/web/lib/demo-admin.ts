import { WEBAPP_URL } from "@calcom/lib/constants";

const DEMO_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const DEMO_ADMIN_BOOKING_URL = process.env.NEXT_PUBLIC_DEMO_ADMIN_BOOKING_URL?.trim() ?? "";
const DEMO_ADMIN_PUBLIC_PAGE_URL = process.env.NEXT_PUBLIC_DEMO_ADMIN_PUBLIC_PAGE_URL?.trim() ?? "";
const DEMO_ADMIN_USERNAME = process.env.NEXT_PUBLIC_DEMO_ADMIN_USERNAME?.trim() ?? "";

export const isDemoAdminRestrictionsEnabled = () => DEMO_ADMIN_EMAIL.length > 0;

export const isDemoAdminEmail = (email?: string | null) => {
  if (!DEMO_ADMIN_EMAIL || !email) return false;
  return email.trim().toLowerCase() === DEMO_ADMIN_EMAIL;
};

export const isRestrictedDemoUser = (email?: string | null) => {
  if (!isDemoAdminRestrictionsEnabled()) return false;
  if (!email) return false;
  return !isDemoAdminEmail(email);
};

export const getDemoAdminBookingUrl = () => {
  if (DEMO_ADMIN_BOOKING_URL) return DEMO_ADMIN_BOOKING_URL;
  if (DEMO_ADMIN_USERNAME) return `${WEBAPP_URL}/${DEMO_ADMIN_USERNAME}`;
  return "";
};

export const getDemoAdminPublicPageUrl = () => {
  if (DEMO_ADMIN_PUBLIC_PAGE_URL) return DEMO_ADMIN_PUBLIC_PAGE_URL;
  return getDemoAdminBookingUrl();
};
