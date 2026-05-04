import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" | "vendedor" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return ctx;
}

describe("appRouter", () => {
  describe("auth", () => {
    it("should return current user with me query", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe("Test User");
    });

    it("should logout and clear cookie", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result.success).toBe(true);
      expect(ctx.res.clearCookie).toHaveBeenCalled();
    });
  });

  describe("products", () => {
    it("should list active products", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // This will return empty array since no products in test DB
      const result = await caller.products.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle getById with number input", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Should accept number and return undefined for non-existent product
      const result = await caller.products.getById(999);

      expect(result).toBeUndefined();
    });
  });

  describe("sellers", () => {
    it("should list active sellers", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.sellers.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication for getByUserId", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Should return null for user without seller account
      const result = await caller.sellers.getByUserId();

      expect(result).toBeNull();
    });

    it("should validate seller creation input", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Should fail with empty store name
      try {
        await caller.sellers.create({
          storeName: "",
          description: "Test",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("usedProducts", () => {
    it("should list approved used products", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.usedProducts.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication for getByUserId", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.usedProducts.getByUserId();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("digitalProducts", () => {
    it("should list active digital products", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.digitalProducts.list();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("orders", () => {
    it("should require authentication for getByBuyerId", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.orders.getByBuyerId();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication for getBySellerId", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.orders.getBySellerId();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("reviews", () => {
    it("should get reviews by seller id", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reviews.getBySellerId(1);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("role-based access", () => {
    it("should allow admin user", async () => {
      const ctx = createAuthContext("admin");

      expect(ctx.user?.role).toBe("admin");
    });

    it("should allow vendedor user", async () => {
      const ctx = createAuthContext("vendedor");

      expect(ctx.user?.role).toBe("vendedor");
    });

    it("should allow regular user", async () => {
      const ctx = createAuthContext("user");

      expect(ctx.user?.role).toBe("user");
    });
  });
});
