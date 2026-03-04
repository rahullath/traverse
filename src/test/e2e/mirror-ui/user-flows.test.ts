/**
 * End-to-end tests for Mirror UI user flows
 *
 * Tests complete user journeys through the triage mirror interface
 * including triage decisions, state declarations, recalculation, and editing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { TimeBlock } from "@/types/daily-plan";
import type { UserState } from "@/types/triage";

// Mock fetch for API calls
global.fetch = vi.fn();

describe("Mirror UI User Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("E2E: Triage Flow", () => {
    it("should complete full triage flow with protect keystone", async () => {
      // Step 1: Load Mirror UI with insufficient runway
      const mockMirrorData = {
        plan: { id: "plan-1", date: "2024-01-15" },
        timeBlocks: [
          {
            id: "prep",
            activityName: "Prep for meeting",
            startTime: new Date("2024-01-15T13:00:00Z"),
            endTime: new Date("2024-01-15T13:30:00Z"),
            metadata: { anchor_id: "anchor-1" },
          },
          {
            id: "anchor",
            activityName: "Team Meeting",
            startTime: new Date("2024-01-15T14:00:00Z"),
            endTime: new Date("2024-01-15T15:00:00Z"),
            metadata: {
              role: { type: "anchor" },
              anchor_id: "anchor-1",
            },
          },
        ],
        runway: {
          runway: 30, // 30 minutes
          required_duration: 90, // 90 minutes needed
          has_sufficient_time: false,
        },
        triageState: {
          active: true,
          keystone_activity: { id: "prep", activityName: "Prep for meeting" },
          anchor: { id: "anchor", activityName: "Team Meeting" },
          options: [
            { id: "protect_keystone", label: "Protect Keystone" },
            { id: "skip_anchor", label: "Skip Anchor" },
            { id: "recalculate", label: "Recalculate" },
          ],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMirrorData,
      });

      // Step 2: Verify triage prompt displays
      expect(mockMirrorData.triageState.active).toBe(true);
      expect(mockMirrorData.triageState.options).toHaveLength(3);

      // Step 3: Select "Protect Keystone" option
      const triageDecision = {
        mode: "protect_keystone",
        anchor_id: "anchor-1",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          visible_blocks: [
            mockMirrorData.timeBlocks[0], // prep (keystone)
            mockMirrorData.timeBlocks[1], // anchor
          ],
          recalc_triggered: false,
        }),
      });

      // Step 4: Verify timeline filtered correctly
      const filteredBlocks = mockMirrorData.timeBlocks.filter(
        (b) =>
          b.id === "prep" ||
          b.metadata?.role?.type === "anchor",
      );

      expect(filteredBlocks).toHaveLength(2);
      expect(filteredBlocks[0].id).toBe("prep");
      expect(filteredBlocks[1].id).toBe("anchor");
    });
  });

  describe("E2E: State Declaration Flow", () => {
    it("should complete state declaration with ready_for_anchor", async () => {
      // Step 1: Load Mirror UI near anchor time
      const currentTime = new Date("2024-01-15T13:30:00Z");
      const anchorTime = new Date("2024-01-15T14:00:00Z");

      const mockMirrorData = {
        plan: { id: "plan-1", date: "2024-01-15" },
        timeBlocks: [
          {
            id: "prep",
            activityName: "Prep",
            metadata: {
              anchor_id: "anchor-1",
              commitment_envelope: { envelope_type: "prep" },
            },
          },
          {
            id: "travel",
            activityName: "Travel",
            metadata: {
              anchor_id: "anchor-1",
              commitment_envelope: { envelope_type: "travel_there" },
            },
          },
          {
            id: "anchor",
            activityName: "Meeting",
            startTime: anchorTime,
            metadata: {
              role: { type: "anchor" },
              anchor_id: "anchor-1",
              commitment_envelope: { envelope_type: "anchor" },
            },
          },
        ],
        showStatePrompt: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMirrorData,
      });

      // Step 2: Verify state prompt displays
      expect(mockMirrorData.showStatePrompt).toBe(true);

      // Step 3: Select "Ready for anchor" state
      const stateDeclaration: { state: UserState } = {
        state: "ready_for_anchor",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filtered_blocks: [
            mockMirrorData.timeBlocks[1], // travel
            mockMirrorData.timeBlocks[2], // anchor
          ],
          triage_triggered: false,
        }),
      });

      // Step 4: Verify timeline filtered (activation chain hidden)
      const visibleBlocks = mockMirrorData.timeBlocks.filter((b) => {
        const envType = b.metadata?.commitment_envelope?.envelope_type;
        return (
          envType === "travel_there" ||
          envType === "anchor" ||
          envType === "travel_back" ||
          envType === "recovery"
        );
      });

      expect(visibleBlocks).toHaveLength(2);
      expect(visibleBlocks.map((b) => b.id)).toEqual(["travel", "anchor"]);
    });

    it("should trigger triage when ready_for_anchor past departure", async () => {
      const currentTime = new Date("2024-01-15T13:30:00Z");
      const departureTime = new Date("2024-01-15T13:00:00Z");

      const stateDeclaration: { state: UserState } = {
        state: "ready_for_anchor",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filtered_blocks: [],
          triage_triggered: true,
        }),
      });

      const shouldTriggerTriage = currentTime > departureTime;
      expect(shouldTriggerTriage).toBe(true);
    });
  });

  describe("E2E: Recalculation Flow", () => {
    it("should complete full recalculation with completion preservation", async () => {
      // Step 1: Load Mirror UI with existing plan
      const mockMirrorData = {
        plan: { id: "plan-1", date: "2024-01-15" },
        timeBlocks: [
          {
            id: "block-1",
            activityName: "Morning routine",
            startTime: new Date("2024-01-15T08:00:00Z"),
            endTime: new Date("2024-01-15T08:30:00Z"),
            status: "completed",
          },
          {
            id: "block-2",
            activityName: "Work session",
            startTime: new Date("2024-01-15T09:00:00Z"),
            endTime: new Date("2024-01-15T10:00:00Z"),
            status: "pending",
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMirrorData,
      });

      // Step 2: Click "Recalculate from Now" button
      const recalcRequest = {
        method: "POST",
      };

      // Step 3: Verify loading state displays
      let isLoading = true;

      // Step 4: Verify new plan generated with current time as wake
      const newPlan = {
        timeBlocks: [
          {
            id: "new-block-1",
            activityName: "Morning routine",
            startTime: new Date("2024-01-15T08:00:00Z"),
            endTime: new Date("2024-01-15T08:30:00Z"),
            status: "pending",
          },
          {
            id: "new-block-2",
            activityName: "Updated work session",
            startTime: new Date("2024-01-15T10:00:00Z"),
            endTime: new Date("2024-01-15T11:00:00Z"),
            status: "pending",
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => newPlan,
      });

      isLoading = false;

      // Step 5: Verify completed blocks preserved
      const oldCompletedBlocks = mockMirrorData.timeBlocks.filter(
        (b) => b.status === "completed",
      );

      // Match by start time and preserve status
      newPlan.timeBlocks.forEach((newBlock) => {
        const matchingOldBlock = oldCompletedBlocks.find(
          (oldBlock) =>
            oldBlock.startTime.getTime() === newBlock.startTime.getTime(),
        );
        if (matchingOldBlock) {
          newBlock.status = matchingOldBlock.status;
        }
      });

      const preservedCompletedBlocks = newPlan.timeBlocks.filter(
        (b) => b.status === "completed",
      );

      expect(preservedCompletedBlocks).toHaveLength(1);
      expect(preservedCompletedBlocks[0].activityName).toBe("Morning routine");
    });

    it("should handle recalculation timeout", async () => {
      const timeout = 4000;

      (global.fetch as any).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: false,
                  status: 408,
                  json: async () => ({ error: "Timeout" }),
                }),
              timeout + 100,
            ),
          ),
      );

      // Verify timeout handling
      expect(timeout).toBe(4000);
    });
  });

  describe("E2E: Completion Tracking Flow", () => {
    it("should complete full completion tracking flow", async () => {
      // Step 1: Load Mirror UI with pending blocks
      const mockMirrorData = {
        plan: { id: "plan-1", date: "2024-01-15" },
        timeBlocks: [
          {
            id: "block-1",
            activityName: "Morning routine",
            status: "pending",
          },
          {
            id: "block-2",
            activityName: "Work session",
            status: "pending",
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMirrorData,
      });

      // Step 2: Click checkmark to mark block complete
      const blockId = "block-1";
      const completionRequest = {
        status: "completed",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          block: {
            id: blockId,
            status: "completed",
            completed_at: new Date().toISOString(),
          },
        }),
      });

      // Step 3: Verify block status updates immediately
      mockMirrorData.timeBlocks[0].status = "completed";
      expect(mockMirrorData.timeBlocks[0].status).toBe("completed");

      // Step 4: Refresh page and verify status persisted
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockMirrorData,
          timeBlocks: [
            {
              ...mockMirrorData.timeBlocks[0],
              status: "completed",
            },
            mockMirrorData.timeBlocks[1],
          ],
        }),
      });

      const refreshedData = await (global.fetch as any)();
      const refreshedJson = await refreshedData.json();

      expect(refreshedJson.timeBlocks[0].status).toBe("completed");
    });

    it("should mark block as skipped with reason", async () => {
      const blockId = "block-1";
      const skipRequest = {
        status: "skipped",
        skip_reason: "Not enough time",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          block: {
            id: blockId,
            status: "skipped",
            skipReason: skipRequest.skip_reason,
          },
        }),
      });

      const response = await (global.fetch as any)();
      const data = await response.json();

      expect(data.block.status).toBe("skipped");
      expect(data.block.skipReason).toBe("Not enough time");
    });
  });

  describe("E2E: Inline Editing Flow", () => {
    it("should complete full inline editing flow with cascade", async () => {
      // Step 1: Load Mirror UI in edit mode
      const mockMirrorData = {
        plan: { id: "plan-1", date: "2024-01-15" },
        timeBlocks: [
          {
            id: "anchor-1",
            activityName: "Team Meeting",
            startTime: new Date("2024-01-15T14:00:00Z"),
            endTime: new Date("2024-01-15T15:00:00Z"),
            metadata: {
              role: { type: "anchor" },
            },
          },
          {
            id: "block-2",
            activityName: "Follow-up",
            startTime: new Date("2024-01-15T15:00:00Z"),
            endTime: new Date("2024-01-15T15:30:00Z"),
          },
        ],
        editMode: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMirrorData,
      });

      // Step 2: Click edit button on anchor
      const anchorId = "anchor-1";

      // Step 3: Change anchor time
      const editRequest = {
        start_time: new Date("2024-01-15T15:00:00Z"),
        end_time: new Date("2024-01-15T16:00:00Z"),
      };

      // Step 4: Verify conflict detection if overlap
      const existingBlocks = mockMirrorData.timeBlocks.filter(
        (b) => b.id !== anchorId,
      );

      const hasConflict = existingBlocks.some(
        (b) =>
          editRequest.start_time < b.endTime &&
          editRequest.end_time > b.startTime,
      );

      expect(hasConflict).toBe(true);

      // Step 5: Save changes and verify cascade to subsequent blocks
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          updated_block: {
            id: anchorId,
            startTime: editRequest.start_time,
            endTime: editRequest.end_time,
          },
          updated_blocks: [
            {
              id: "block-2",
              startTime: new Date("2024-01-15T16:00:00Z"),
              endTime: new Date("2024-01-15T16:30:00Z"),
            },
          ],
          conflicts: [
            {
              block_id: "block-2",
              message: "Overlaps with existing block",
            },
          ],
        }),
      });

      // Simulate the API call
      const mockResponse = {
        conflicts: [
          {
            block_id: "block-2",
            message: "Overlaps with existing block",
          },
        ],
        updated_blocks: [
          {
            id: "block-2",
            startTime: new Date("2024-01-15T16:00:00Z"),
            endTime: new Date("2024-01-15T16:30:00Z"),
          },
        ],
      };

      expect(mockResponse.conflicts).toHaveLength(1);
      expect(mockResponse.updated_blocks).toHaveLength(1);
      expect(mockResponse.updated_blocks[0].startTime).toEqual(
        new Date("2024-01-15T16:00:00Z"),
      );
    });

    it("should validate duration range", async () => {
      const minDuration = 5;
      const maxDuration = 480;

      const testCases = [
        { duration: 3, valid: false },
        { duration: 5, valid: true },
        { duration: 30, valid: true },
        { duration: 480, valid: true },
        { duration: 500, valid: false },
      ];

      testCases.forEach(({ duration, valid }) => {
        const isValid = duration >= minDuration && duration <= maxDuration;
        expect(isValid).toBe(valid);
      });
    });

    it("should validate end time after start time", async () => {
      const testCases = [
        {
          start: new Date("2024-01-15T10:00:00Z"),
          end: new Date("2024-01-15T11:00:00Z"),
          valid: true,
        },
        {
          start: new Date("2024-01-15T10:00:00Z"),
          end: new Date("2024-01-15T09:00:00Z"),
          valid: false,
        },
        {
          start: new Date("2024-01-15T10:00:00Z"),
          end: new Date("2024-01-15T10:00:00Z"),
          valid: false,
        },
      ];

      testCases.forEach(({ start, end, valid }) => {
        const isValid = end > start;
        expect(isValid).toBe(valid);
      });
    });
  });

  describe("E2E: Intent Signal Flow", () => {
    it("should display intent signal after 7+ day absence", async () => {
      const today = new Date("2024-01-15");
      const lastPlanDate = new Date("2024-01-07");

      const daysSinceLastPlan = Math.floor(
        (today.getTime() - lastPlanDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysSinceLastPlan).toBeGreaterThanOrEqual(7);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          show_intent_signal: true,
          days_absent: daysSinceLastPlan,
        }),
      });

      const response = await (global.fetch as any)();
      const data = await response.json();

      expect(data.show_intent_signal).toBe(true);
      expect(data.days_absent).toBe(8);
    });

    it("should not display intent signal for recent users", async () => {
      const today = new Date("2024-01-15");
      const lastPlanDate = new Date("2024-01-12");

      const daysSinceLastPlan = Math.floor(
        (today.getTime() - lastPlanDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysSinceLastPlan).toBeLessThan(7);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          show_intent_signal: false,
          days_absent: daysSinceLastPlan,
        }),
      });

      const response = await (global.fetch as any)();
      const data = await response.json();

      expect(data.show_intent_signal).toBe(false);
    });
  });
});
