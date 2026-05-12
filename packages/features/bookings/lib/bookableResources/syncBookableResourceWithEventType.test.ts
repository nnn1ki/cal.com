import { describe, expect, it, vi } from "vitest";
import {
  syncBookableResourcesWithEventTypes,
  syncBookableResourceWithEventType,
} from "./syncBookableResourceWithEventType";

const eventType = {
  id: 10,
  title: "Discovery Call",
  slug: "discovery-call",
  length: 30,
  schedulingType: null,
} as const;

describe("syncBookableResourceWithEventType", () => {
  it("creates a resource when none exists", async () => {
    const db = {
      bookableResource: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({
          id: 55,
          title: eventType.title,
          slug: eventType.slug,
        }),
      },
    };

    const result = await syncBookableResourceWithEventType(db, eventType);

    expect(db.bookableResource.create).toHaveBeenCalledWith({
      data: {
        eventTypeId: eventType.id,
        title: eventType.title,
        slug: eventType.slug,
        position: 0,
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });
    expect(result).toEqual({
      id: 55,
      bookableResourceId: 55,
      title: eventType.title,
      slug: eventType.slug,
      length: eventType.length,
      schedulingType: eventType.schedulingType,
      eventTypeId: eventType.id,
      eventTypeSlug: eventType.slug,
    });
  });

  it("updates the primary matching resource and deactivates the rest", async () => {
    const db = {
      bookableResource: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 77,
            title: "Old title",
            slug: "legacy-slug",
            position: 0,
          },
          {
            id: 88,
            title: "Current title",
            slug: eventType.slug,
            position: 1,
          },
        ]),
        update: vi.fn().mockResolvedValue({
          id: 88,
          title: eventType.title,
          slug: eventType.slug,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
      },
    };

    const result = await syncBookableResourceWithEventType(db, eventType);

    expect(db.bookableResource.update).toHaveBeenCalledWith({
      where: {
        id: 88,
      },
      data: {
        title: eventType.title,
        slug: eventType.slug,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });
    expect(db.bookableResource.updateMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: eventType.id,
        id: {
          not: 88,
        },
      },
      data: {
        isActive: false,
      },
    });
    expect(result.bookableResourceId).toBe(88);
  });

  it("syncs multiple event types", async () => {
    const db = {
      bookableResource: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi
          .fn()
          .mockResolvedValueOnce({
            id: 1,
            title: "Discovery Call",
            slug: "discovery-call",
          })
          .mockResolvedValueOnce({
            id: 2,
            title: "Demo",
            slug: "demo",
          }),
      },
    };

    const resources = await syncBookableResourcesWithEventTypes(db, [
      eventType,
      {
        id: 11,
        title: "Demo",
        slug: "demo",
        length: 45,
        schedulingType: null,
      },
    ]);

    expect(resources).toHaveLength(2);
    expect(resources[0].bookableResourceId).toBe(1);
    expect(resources[1].bookableResourceId).toBe(2);
  });
});
