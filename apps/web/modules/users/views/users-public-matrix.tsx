// "use client";

// import {
//   sdkActionManager,
//   useEmbedNonStylesConfig,
//   useEmbedStyles,
//   useIsEmbed,
// } from "@calcom/embed-core/embed-iframe";
// import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
// import useTheme from "@calcom/lib/hooks/useTheme";
// import { UserAvatar } from "@calcom/ui/components/avatar";
// import { Icon } from "@calcom/ui/components/icon";
// import { OrgBanner } from "@calcom/ui/components/organization-banner";
// import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";
// import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/web/modules/event-types/components";
// import EmptyPage from "@calcom/web/modules/event-types/components/EmptyPage";

// import classNames from "classnames";
// import type { InferGetServerSidePropsType } from "next";
// import Link from "next/link";
// import { Toaster } from "sonner";



// import type { EmbedProps } from "app/WithEmbedSSR";
// import { useSearchParams } from "next/navigation";

// import { BookerWebWrapper as Booker } from "@calcom/web/modules/bookings/components/BookerWebWrapper";
// import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

// import type { inferSSRProps } from "@lib/types/inferSSRProps";

// import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

// import type { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

// export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

// export const getMultipleDurationValue = (
//   multipleDurationConfig: number[] | undefined,
//   queryDuration: string | string[] | null | undefined,
//   defaultValue: number
// ) => {
//   if (!multipleDurationConfig) return null;
//   if (multipleDurationConfig.includes(Number(queryDuration))) return Number(queryDuration);
//   return defaultValue;
// };

// function Type({ slug, user, isEmbed, booking, isBrandingHidden, eventData, orgBannerUrl }: PageProps) {

//     const { users, profile, eventTypes, entity } = props;

//     const [user] = users; //To be used when we only have a single user, not dynamic group
//     useTheme(profile.theme);

//     const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

//     const isEmbed = useIsEmbed(props.isEmbed);
//     const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
//     const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
//     const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
//     const {
//     // So it doesn't display in the Link (and make tests fail)
//     user: _user,
//     orgSlug: _orgSlug,
//     redirect: _redirect,
//     ...query
//     } = useRouterQuery();

//     if (entity.considerUnpublished) {
//     return (
//         <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
//         <UnpublishedEntity {...entity} />
//         </div>
//     );
//     }

//     const isEventListEmpty = eventTypes.length === 0;
//       const isOrg = !!user?.profile?.organization;
    

//   const searchParams = useSearchParams();

//   return (

// }

// export default Type;
