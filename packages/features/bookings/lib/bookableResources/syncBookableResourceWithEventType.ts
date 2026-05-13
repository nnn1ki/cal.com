import type { BookableResource as BookerBookableResource } from "@calcom/features/bookings/Booker/types";
import type { EventType } from "@calcom/prisma/client";

type SyncableEventType = Pick<EventType, "id" | "title" | "slug" | "length" | "schedulingType"> & {
  seatsPerTimeSlot?: EventType["seatsPerTimeSlot"];
  seatsShowAvailabilityCount?: EventType["seatsShowAvailabilityCount"];
};

type ExistingBookableResource = {
  id: number;
  title: string;
  slug: string;
  position: number;
};

type BookableResourceSyncDb = {
  bookableResource: {
    findMany: (args: {
      where: { eventTypeId: number };
      select: { id: true; title: true; slug: true; position: true };
      orderBy: [{ position: "asc" }, { id: "asc" }];
    }) => Promise<ExistingBookableResource[]>;
    update: (args: {
      where: { id: number };
      data: { title: string; slug: string; isActive: true };
      select: { id: true; title: true; slug: true };
    }) => Promise<Pick<ExistingBookableResource, "id" | "title" | "slug">>;
    updateMany: (args: {
      where: { eventTypeId: number; id: { not: number } };
      data: { isActive: false };
    }) => Promise<{
      count: number;
    }>;
    create: (args: {
      data: { eventTypeId: number; title: string; slug: string; position: number };
      select: { id: true; title: true; slug: true };
    }) => Promise<Pick<ExistingBookableResource, "id" | "title" | "slug">>;
  };
};

const bookableResourceSelect = {
  id: true,
  title: true,
  slug: true,
} as const;

const existingBookableResourceSelect = {
  id: true,
  title: true,
  slug: true,
  position: true,
} as const;

const bookableResourceOrderBy: [{ position: "asc" }, { id: "asc" }] = [
  { position: "asc" },
  { id: "asc" },
];

const mapToBookableResource = (
  eventType: SyncableEventType,
  resource: Pick<ExistingBookableResource, "id" | "title" | "slug">
): BookerBookableResource => ({
  id: resource.id,
  bookableResourceId: resource.id,
  title: resource.title,
  slug: resource.slug,
  length: eventType.length,
  schedulingType: eventType.schedulingType,
  seatsPerTimeSlot: eventType.seatsPerTimeSlot,
  seatsShowAvailabilityCount: eventType.seatsShowAvailabilityCount,
  eventTypeId: eventType.id,
  eventTypeSlug: eventType.slug,
});

export async function syncBookableResourceWithEventType(
  db: BookableResourceSyncDb,
  eventType: SyncableEventType
): Promise<BookerBookableResource> {
  const existingResources = await db.bookableResource.findMany({
    where: {
      eventTypeId: eventType.id,
    },
    select: existingBookableResourceSelect,
    orderBy: bookableResourceOrderBy,
  });

  const primaryResource =
    existingResources.find((resource) => resource.slug === eventType.slug) ?? existingResources[0];

  const syncedResource = primaryResource
    ? await db.bookableResource.update({
        where: {
          id: primaryResource.id,
        },
        data: {
          title: eventType.title,
          slug: eventType.slug,
          isActive: true,
        },
        select: bookableResourceSelect,
      })
    : await db.bookableResource.create({
        data: {
          eventTypeId: eventType.id,
          title: eventType.title,
          slug: eventType.slug,
          position: 0,
        },
        select: bookableResourceSelect,
      });

  await db.bookableResource.updateMany({
    where: {
      eventTypeId: eventType.id,
      id: {
        not: syncedResource.id,
      },
    },
    data: {
      isActive: false,
    },
  });

  return mapToBookableResource(eventType, syncedResource);
}

export async function syncBookableResourcesWithEventTypes(
  db: BookableResourceSyncDb,
  eventTypes: SyncableEventType[]
): Promise<BookerBookableResource[]> {
  return await Promise.all(eventTypes.map((eventType) => syncBookableResourceWithEventType(db, eventType)));
}
