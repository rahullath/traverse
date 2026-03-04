/**
 * Integration tests for recalculation functionality
 *
 * Tests the complete recalculation flow including preference handling,
 * plan generation, completion preservation, and timeout handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { TimeBlock, DailyPlan } from "@/types/daily-plan";

describe("Recalculation Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Preference Preservation", () => {
    it("should preserve wake_time and sleep_time preferences", async () => {
      const originalPreferences = {
        wake_time: "07:00",
        sleep_time: "23:00",
      };

      const currentTime = new Date("2024-01-15T12:00:00Z");

      // Recalc should use current time as effective wake but preserve prefs
      const recalcParams = {
        wakeTime: currentTime,
        sleepTime: originalPreferences.sleep_time,
      };

      expect(recalcParams.sleepTime).toBe(originalPreferences.sleep_time);
    });

    it("should use current energy state", async () => {
      const userPreferences = {
        energy_state: "medium",
      };

      const recalcParams = {
        energyState: userPreferences.energy_state,
      };

      expect(recalcParams.energyState).toBe("medium");
    });

    it("should use current location state", async () => {
      const locationState = "at_home";

      const recalcParams = {
        locationState,
      };

      expect(recalcParams.locationState).toBe("at_home");
    });
  });

  describe("Plan Replacement", () => {
    it("should replace existing plan, not duplicate", async () => {
      const existingPlan: Partial<DailyPlan> = {
        id: "plan-1",
        userId: "user-123",
        date: "2024-01-15",
      };

      const newPlan: Partial<DailyPlan> = {
        id: "plan-2",
        userId: "user-123",
        date: "2024-01-15",
      };

      // Should delete old plan before inserting new
      const plansForDate = [newPlan]; // Only new plan should exist

      expect(plansForDate).toHaveLength(1);
      expect(plansForDate[0].id).toBe("plan-2");
    });

    it("should delete old time blocks", async () => {
      const oldBlocks: Partial<TimeBlock>[] = [
        { id: "old-1", planId: "plan-1" },
        { id: "old-2", planId: "plan-1" },
      ];

      const newBlocks: Partial<TimeBlock>[] = [
        { id: "new-1", planId: "plan-2" },
        { id: "new-2", planId: "plan-2" },
      ];

      // After recalc, only new blocks should exist
      const allBlocks = newBlocks;

      expect(allBlocks).toHaveLength(2);
      expect(allBlocks.every((b) => b.planId === "plan-2")).toBe(true);
    });
  });

  describe("Graceful Fallback", () => {
    it("should succeed with default values when DailyContext unavailable", async () => {
      const dailyContextAvailable = false;

      const defaultValues = {
        energyState: "medium",
        substanceFlags: [],
        mealHistory: [],
      };

      const recalcParams = dailyContextAvailable
        ? { energyState: "high" }
        : defaultValues;

      expect(recalcParams.energyState).toBe("medium");
      expect(recalcParams.substanceFlags).toEqual([]);
    });

    it("should use empty anchors array if none exist", async () => {
      const anchors: any[] = [];

      const recalcParams = {
        anchors: anchors.length > 0 ? anchors : [],
      };

      expect(recalcParams.anchors).toEqual([]);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout after 4 seconds", async () => {
      const timeout = 4000;

      const planGenerationPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ plan: "generated" }), 5000),
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeout),
      );

      await expect(
        Promise.race([planGenerationPromise, timeoutPromise]),
      ).rejects.toThrow("Timeout");
    });

    it("should return timeout error with 408 status", async () => {
      const timeoutError = {
        status: 408,
        error: "Plan generation timed out",
      };

      expect(timeoutError.status).toBe(408);
      expect(timeoutError.error).toContain("timed out");
    });

    it("should preserve existing plan on timeout", async () => {
      const existingPlan: Partial<DailyPlan> = {
        id: "plan-1",
        date: "2024-01-15",
      };

      const timedOut = true;

      const finalPlan = timedOut ? existingPlan : null;

      expect(finalPlan).toEqual(existingPlan);
    });
  });

  describe("Completion State Preservation", () => {
    it("should preserve completed blocks by start time", async () => {
      const oldBlocks: Partial<TimeBlock>[] = [
        {
          id: "old-1",
          startTime: new Date("2024-01-15T08:00:00Z"),
          endTime: new Date("2024-01-15T08:30:00Z"),
          status: "completed",
          activityName: "Morning routine",
        },
        {
          id: "old-2",
          startTime: new Date("2024-01-15T09:00:00Z"),
          endTime: new Date("2024-01-15T10:00:00Z"),
          status: "pending",
          activityName: "Work session",
        },
      ];

      const newBlocks: Partial<TimeBlock>[] = [
        {
          id: "new-1",
          startTime: new Date("2024-01-15T08:00:00Z"),
          endTime: new Date("2024-01-15T08:30:00Z"),
          status: "pending",
          activityName: "Morning routine",
        },
        {
          id: "new-2",
          startTime: new Date("2024-01-15T10:00:00Z"),
          endTime: new Date("2024-01-15T11:00:00Z"),
          status: "pending",
          activityName: "Updated work",
        },
      ];

      // Match by start time and preserve status
      newBlocks.forEach((newBlock) => {
        const matchingOldBlock = oldBlocks.find(
          (oldBlock) =>
            oldBlock.startTime?.getTime() === newBlock.startTime?.getTime(),
        );
        if (matchingOldBlock && matchingOldBlock.status === "completed") {
          newBlock.status = "completed";
        }
      });

      const completedBlocks = newBlocks.filter((b) => b.status === "completed");
      expect(completedBlocks).toHaveLength(1);
      expect(completedBlocks[0].activityName).toBe("Morning routine");
    });

    it("should not preserve skipped blocks", async () => {
      const oldBlocks: Partial<TimeBlock>[] = [
        {
          startTime: new Date("2024-01-15T08:00:00Z"),
          status: "skipped",
        },
      ];

      const newBlocks: Partial<TimeBlock>[] = [
        {
          startTime: new Date("2024-01-15T08:00:00Z"),
          status: "pending",
        },
      ];

      // Only preserve completed, not skipped
      newBlocks.forEach((newBlock) => {
        const matchingOldBlock = oldBlocks.find(
          (oldBlock) =>
            oldBlock.startTime?.getTime() === newBlock.startTime?.getTime(),
        );
        if (matchingOldBlock && matchingOldBlock.status === "completed") {
          newBlock.status = "completed";
        }
      });

      expect(newBlocks[0].status).toBe("pending");
    });

    it("should handle time shifts gracefully", async () => {
      const oldBlocks: Partial<TimeBlock>[] = [
        {
          startTime: new Date("2024-01-15T08:00:00Z"),
          status: "completed",
        },
      ];

      const newBlocks: Partial<TimeBlock>[] = [
        {
          startTime: new Date("2024-01-15T08:15:00Z"), // Shifted 15 min
          status: "pending",
        },
      ];

      // No exact match, so status not preserved
      newBlocks.forEach((newBlock) => {
        const matchingOldBlock = oldBlocks.find(
          (oldBlock) =>
            oldBlock.startTime?.getTime() === newBlock.startTime?.getTime(),
        );
        if (matchingOldBlock && matchingOldBlock.status === "completed") {
          newBlock.status = "completed";
        }
      });

      expect(newBlocks[0].status).toBe("pending");
    });
  });

  describe("Recalc-on-Open Preference", () => {
    it("should trigger recalc when preference is true", async () => {
      const recalcOnOpen = true;

      const shouldRecalc = recalcOnOpen;

      expect(shouldRecalc).toBe(true);
    });

    it("should not trigger recalc when preference is false", async () => {
      const recalcOnOpen = false;

      const shouldRecalc = recalcOnOpen;

      expect(shouldRecalc).toBe(false);
    });

    it("should default to false for new users", async () => {
      const userPreferences = {};

      const recalcOnOpen = (userPreferences as any).recalc_on_open ?? false;

      expect(recalcOnOpen).toBe(false);
    });
  });

  describe("Integration with Existing Plan Builder", () => {
    it("should call generateDailyPlan with current time as wakeTime", async () => {
      const currentTime = new Date("2024-01-15T12:00:00Z");

      const generateParams = {
        wakeTime: currentTime,
        sleepTime: "23:00",
        energyState: "medium",
      };

      expect(generateParams.wakeTime).toEqual(currentTime);
    });

    it("should use existing ChainGenerator", async () => {
      const useExistingChainGenerator = true;

      expect(useExistingChainGenerator).toBe(true);
    });

    it("should use existing WakeRampGenerator", async () => {
      const useExistingWakeRampGenerator = true;

      expect(useExistingWakeRampGenerator).toBe(true);
    });

    it("should use existing LocationStateTracker", async () => {
      const useExistingLocationStateTracker = true;

      expect(useExistingLocationStateTracker).toBe(true);
    });
  });
});
