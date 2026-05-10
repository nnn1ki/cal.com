"use client";

import { useEmbedNonStylesConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import useTheme from "@calcom/lib/hooks/useTheme";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Icon } from "@calcom/ui/components/icon";
import { OrgBanner } from "@calcom/ui/components/organization-banner";
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

  const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

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
  const isOrg = !!user?.profile?.organization;
  const pageWidthClass = isEventListEmpty ? "max-w-3xl" : "max-w-[96rem]";

  return (
    <>
      <div className={classNames("w-full", shouldAlignCentrally ? "mx-auto" : "", pageWidthClass)}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width  bg-default rounded-md" : "",
            "w-full px-4 py-12"
          )}>
          <div className="border-subtle bg-default text-default mb-8 overflow-hidden rounded-xl border">
            {isOrg && user.profile.organization?.bannerUrl && (
              <OrgBanner
                alt={user.profile.organization.name ?? "Organization banner"}
                imageSrc={user.profile.organization.bannerUrl}
                className="p-1 border border-subtle rounded-xl w-full object-cover"
              />
            )}
            <div className="p-4">
              <UserAvatar
                size="lg"
                user={{
                  avatarUrl: user.avatarUrl,
                  profile: user.profile,
                  name: profile.name,
                  username: profile.username,
                }}
                className={isOrg && user.profile.organization?.bannerUrl ? "-mt-14" : ""}
              />
              <h1
                className={classNames(
                  "font-cal text-emphasis mb-1 text-xl",
                  isOrg && user.profile.organization?.bannerUrl ? "" : "mt-4"
                )}
                data-testid="name-title">
                {profile.name}
                {!isOrg && user.verified && (
                  <Icon
                    name="badge-check"
                    className="mx-1 -mt-1 inline h-6 w-6 fill-blue-500 text-white dark:text-black"
                  />
                )}
                {isOrg && (
                  <Icon
                    name="badge-check"
                    className="mx-1 -mt-1 inline h-6 w-6 fill-yellow-500 text-white dark:text-black"
                  />
                )}
              </h1>
              {!isBioEmpty && (
                <>
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via safeBio */}
                  <div
                    className="text-default wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                    dangerouslySetInnerHTML={{ __html: props.safeBio }}
                  />
                </>
              )}
            </div>
          </div>

          {isEventListEmpty ? (
            <EmptyPage name={profile.name || "User"} />
          ) : (
            <BookingPageErrorBoundary>
              <div className="w-full">
                <Booker
                  username={user.profile.username ?? profile.username ?? ""}
                  eventSlug={eventData.slug}
                  initialLayout="week_view"
                  allEventType={allEventTypes}
                  hideBranding={false}
                  eventData={eventData}
                  entity={{ ...eventData.entity, eventTypeId: eventData.id }}
                  durationConfig={eventData.metadata?.multipleDuration}
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
