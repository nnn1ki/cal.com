import { vi } from "vitest";

vi.mock("../ResourceColumnsView", () => ({
  ResourceColumnsView: () => {
    return <div data-testid="resource-columns-view">Test Resource Columns View</div>;
  },
}));
