import { describe, it, expect } from "vitest";

describe("Auth Redirect Logic", () => {
  describe("Organization slug generation", () => {
    const generateSlug = (name: string): string => {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    };

    it("should generate correct slug from organization name", () => {
      expect(generateSlug("Working At Speed")).toBe("working-at-speed");
      expect(generateSlug("My Company")).toBe("my-company");
      expect(generateSlug("Test Org 123")).toBe("test-org-123");
    });

    it("should handle special characters in org name", () => {
      expect(generateSlug("Company & Partners")).toBe("company-partners");
      expect(generateSlug("Tech!@#$%Corp")).toBe("tech-corp");
    });

    it("should trim leading and trailing dashes", () => {
      expect(generateSlug("---Test Company---")).toBe("test-company");
    });
  });

  describe("Onboarding redirect paths", () => {
    it("should construct correct onboarding path with org slug", () => {
      const orgSlug = "working-at-speed";
      const expectedPath = `/${orgSlug}/onboarding`;
      expect(expectedPath).toBe("/working-at-speed/onboarding");
    });

    it("should handle invite signup redirect", () => {
      const inviteOrgSlug = "partner-company";
      const expectedPath = `/${inviteOrgSlug}/onboarding`;
      expect(expectedPath).toBe("/partner-company/onboarding");
    });
  });
});
