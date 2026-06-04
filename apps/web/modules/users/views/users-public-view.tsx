"use client";

import { useEmbedNonStylesConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import useTheme from "@calcom/lib/hooks/useTheme";
import { BookerLayouts, defaultBookerLayoutSettings } from "@calcom/prisma/zod-utils";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";
import EmptyPage from "@calcom/web/modules/event-types/components/EmptyPage";
import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import { Toaster } from "sonner";
import { BookerWebWrapper as Booker } from "../../bookings/components/BookerWebWrapper";
import BookingPageErrorBoundary from "../../../components/error/BookingPageErrorBoundary";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;
export function UserPage(props: PageProps) {
  const { users, profile, eventTypes, entity, eventData, allEventTypes, orgBannerUrl } = props;

  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(profile.theme);

  const isEmbed = useIsEmbed(props.isEmbed);
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;

  if (entity.considerUnpublished) {
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  const isEventListEmpty = eventTypes.length === 0 || !eventData;
  const pageWidthClass = isEventListEmpty ? "max-w-3xl" : "max-w-[96rem]";
  const publicUserBookerEventData = isEventListEmpty ? null : eventData;

  if (publicUserBookerEventData?.profile) {
    publicUserBookerEventData.profile.bookerLayouts = {
      ...(publicUserBookerEventData.profile.bookerLayouts ?? defaultBookerLayoutSettings),
      enabledLayouts: [BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
      defaultLayout: BookerLayouts.COLUMN_VIEW,
    };
  }

  const bookerEventData = isEventListEmpty ? null : publicUserBookerEventData;
  const shouldShowEmptyPage = isEventListEmpty || !bookerEventData;

  return (
    <>
      <div className={classNames("w-full", shouldAlignCentrally ? "mx-auto" : "", pageWidthClass)}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width  bg-default rounded-md" : "",
            "w-full px-4 py-12"
          )}>
          {shouldShowEmptyPage ? (
            <EmptyPage name={profile.name || "User"} />
          ) : (
            <BookingPageErrorBoundary>
              <div className="w-full">
                <Booker
                  username={user.profile.username ?? profile.username ?? ""}
                  eventSlug={bookerEventData.slug}
                  initialLayout="column_view"
                  allEventType={allEventTypes}
                  hideBranding={false}
                  eventData={bookerEventData}
                  entity={{ ...bookerEventData.entity, eventTypeId: bookerEventData.id }}
                  durationConfig={bookerEventData.metadata?.multipleDuration}
                  orgBannerUrl={orgBannerUrl}
                />
              </div>
            </BookingPageErrorBoundary>
          )}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}

export default UserPage;
