import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb } from "../../utils/test/mockdb";
import { PlansService } from "./plans.service";

describe("PlansService.findAllPlans", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: PlansService;

  beforeEach(() => {
    mock = createMockDb();
    service = new PlansService(mock.db);
  });

  it("returns the plans from the database", async () => {
    const rows = [
      { name: "Free", price_thb: 0 },
      { name: "Pro", price_thb: 299 },
    ];
    mock.enqueue(rows);

    await expect(service.findAllPlans()).resolves.toEqual(rows);
  });

  it("returns an empty list when no plans exist", async () => {
    mock.enqueue([]);

    await expect(service.findAllPlans()).resolves.toEqual([]);
  });

  it("exposes snake_case public fields and orders plans by price", async () => {
    await service.findAllPlans();

    const [query] = mock.queries;
    expect(Object.keys(query.calls.select[0] as object)).toEqual([
      "id",
      "name",
      "price_thb",
      "description",
      "stripe_price_id",
      "quota",
      "features",
    ]);
    expect(query.calls.orderBy).toHaveLength(1);
  });
});
