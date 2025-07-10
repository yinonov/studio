import { cn } from "../../src/lib/utils";

describe("Utils Functions", () => {
  describe("cn (className utility)", () => {
    it("merges class names correctly", () => {
      const result = cn("btn", "btn-primary", "disabled");
      expect(result).toContain("btn");
      expect(result).toContain("btn-primary");
      expect(result).toContain("disabled");
    });

    it("handles conditional classes", () => {
      const isActive = true;
      const isDisabled = false;

      const result = cn("btn", isActive && "active", isDisabled && "disabled");

      expect(result).toContain("btn");
      expect(result).toContain("active");
      expect(result).not.toContain("disabled");
    });

    it("merges conflicting Tailwind classes correctly", () => {
      // tw-merge should keep the last conflicting class
      const result = cn("p-2", "p-4");
      expect(result).toBe("p-4");
    });

    it("handles empty and undefined values", () => {
      const result = cn("btn", undefined, null, "", "primary");
      expect(result).toContain("btn");
      expect(result).toContain("primary");
    });
  });
});

// Helper function tests - these are utility functions we might add later
describe("Template Utilities", () => {
  describe("validateEmailFormat", () => {
    const validateEmailFormat = (email: string): boolean => {
      // More strict email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      // Additional checks for consecutive dots and other edge cases
      if (
        email.includes("..") ||
        email.startsWith(".") ||
        email.endsWith(".")
      ) {
        return false;
      }
      return emailRegex.test(email);
    };

    it("validates correct email formats", () => {
      expect(validateEmailFormat("test@example.com")).toBe(true);
      expect(validateEmailFormat("user.name@domain.co.il")).toBe(true);
      expect(validateEmailFormat("hebrew@domain.com")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(validateEmailFormat("invalid-email")).toBe(false);
      expect(validateEmailFormat("test@")).toBe(false);
      expect(validateEmailFormat("@example.com")).toBe(false);
      expect(validateEmailFormat("test..test@example.com")).toBe(false);
      expect(validateEmailFormat("test@domain.")).toBe(false);
      expect(validateEmailFormat(".test@domain.com")).toBe(false);
    });
  });

  describe("formatIsraeliPhone", () => {
    const formatIsraeliPhone = (phone: string): string => {
      // Remove all non-digits
      const digits = phone.replace(/\D/g, "");

      // Handle Israeli mobile numbers
      if (digits.startsWith("972")) {
        return `+${digits}`;
      }
      if (digits.startsWith("05")) {
        return `+972-${digits.slice(1)}`;
      }

      return phone;
    };

    it("formats Israeli mobile numbers correctly", () => {
      expect(formatIsraeliPhone("0501234567")).toBe("+972-501234567");
      expect(formatIsraeliPhone("050-123-4567")).toBe("+972-501234567");
      expect(formatIsraeliPhone("972501234567")).toBe("+972501234567");
    });

    it("leaves non-Israeli numbers unchanged", () => {
      expect(formatIsraeliPhone("1234567890")).toBe("1234567890");
      expect(formatIsraeliPhone("+1-555-123-4567")).toBe("+1-555-123-4567");
    });
  });
});
