import { post } from "@calcom/lib/fetch-wrapper";

type CreateBatchBookingSummaryEmailBody = {
  attendeeEmail: string;
  batchGroupId: string;
  bookingReferences: {
    bookingUid: string;
    seatReferenceUid?: string | null;
  }[];
};

type CreateBatchBookingSummaryEmailResponse = {
  success: boolean;
};

export const createBatchBookingSummaryEmail = async (data: CreateBatchBookingSummaryEmailBody) => {
  return await post<CreateBatchBookingSummaryEmailBody, CreateBatchBookingSummaryEmailResponse>(
    "/api/book/summary-email",
    data
  );
};
