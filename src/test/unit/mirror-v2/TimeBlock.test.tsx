/**
 * Unit Tests: TimeBlock Component (Mirror V2 Features)
 *
 * Tests for Mirror V2 visual state changes
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TimeBlock from "@/components/daily-plan/TimeBlock";
import type { TimeBlock as TimeBlockType } from "@/types/daily-plan";

describe("TimeBlock - Mirror V2 Visual States", () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnRecalculateAll = vi.fn();

  const createMockBlock = (
    status: "pending" | "completed" | "skipped",
    startTime: Date,
    duration: number,
  ): TimeBlockType => ({
    id: "block-1",
    activityId: "activity-1",
    activityName: "Test Activity",
    startTime,
    endTime: new Date(startTime.getTime() + duration * 60000),
    status,
    skipReason: status === "skipped" ? "Test reason" : undefined,
  });

  describe("Requirement 3.1: No time-based color changes", () => {
    it("does not change colors when current time exceeds start time", () => {
      const startTime = new Date("2024-01-15T08:00:00");
      const currentTime = new Date("2024-01-15T09:00:00"); // 1 hour after start
      const block = createMockBlock("pending", startTime, 30);

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={currentTime}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");

      // Should maintain neutral pending state
      expect(blockElement).toHaveClass("bg-surface-primary");
      expect(blockElement).toHaveClass("border-border-primary");

      // Should NOT have time-based warning colors
      expect(blockElement).not.toHaveClass("bg-red-500");
      expect(blockElement).not.toHaveClass("border-red-500");
    });

    it("maintains same styling regardless of time proximity", () => {
      const startTime = new Date("2024-01-15T08:00:00");
      const block = createMockBlock("pending", startTime, 30);

      // Render with time before start
      const { container: container1 } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T07:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      // Render with time after start
      const { container: container2 } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const block1 = container1.querySelector(".rounded-lg");
      const block2 = container2.querySelector(".rounded-lg");

      // Both should have identical styling
      expect(block1?.className).toBe(block2?.className);
    });
  });

  describe("Requirement 3.2: Only three visual states", () => {
    it("displays pending state with neutral styling", () => {
      const block = createMockBlock(
        "pending",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T07:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");
      expect(blockElement).toHaveClass("bg-surface-primary");
      expect(blockElement).toHaveClass("border-border-primary");
    });

    it("displays completed state with green styling", () => {
      const block = createMockBlock(
        "completed",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");
      expect(blockElement).toHaveClass("bg-green-500/10");
      expect(blockElement).toHaveClass("border-green-500/40");
    });

    it("displays skipped state with gray styling", () => {
      const block = createMockBlock(
        "skipped",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");
      expect(blockElement).toHaveClass("bg-gray-500/10");
      expect(blockElement).toHaveClass("border-gray-500/40");
    });

    it("only uses one of three states at a time", () => {
      const states: Array<"pending" | "completed" | "skipped"> = [
        "pending",
        "completed",
        "skipped",
      ];

      states.forEach((status) => {
        const block = createMockBlock(
          status,
          new Date("2024-01-15T08:00:00"),
          30,
        );

        const { container } = render(
          <TimeBlock
            block={block}
            currentTime={new Date("2024-01-15T09:00:00")}
            editMode={false}
            onComplete={mockOnComplete}
            onSkip={mockOnSkip}
            onEdit={mockOnEdit}
            onRecalculateAll={mockOnRecalculateAll}
          />,
        );

        const blockElement = container.querySelector(".rounded-lg");
        const classes = blockElement?.className || "";

        // Count how many state classes are present
        const stateClasses = [
          classes.includes("bg-surface-primary"),
          classes.includes("bg-green-500"),
          classes.includes("bg-gray-500"),
        ].filter(Boolean);

        // Should have exactly one state class
        expect(stateClasses.length).toBe(1);
      });
    });
  });

  describe("Requirement 3.4: No red, orange, yellow, or warning colors", () => {
    it("does not use red colors for pending blocks past their time", () => {
      const startTime = new Date("2024-01-15T08:00:00");
      const currentTime = new Date("2024-01-15T10:00:00"); // 2 hours late
      const block = createMockBlock("pending", startTime, 30);

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={currentTime}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");

      // Should NOT have red colors
      expect(blockElement?.className).not.toMatch(/red-500/);
      expect(blockElement?.className).not.toMatch(/red-400/);
      expect(blockElement?.className).not.toMatch(/red-600/);
    });

    it("does not use orange colors", () => {
      const block = createMockBlock(
        "pending",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T10:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");
      expect(blockElement?.className).not.toMatch(/orange-500/);
      expect(blockElement?.className).not.toMatch(/orange-400/);
      expect(blockElement?.className).not.toMatch(/orange-600/);
    });

    it("does not use yellow warning colors", () => {
      const block = createMockBlock(
        "pending",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T10:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");

      // Yellow is used for skip button, but not for block background/border
      const bgClasses =
        blockElement?.className
          .split(" ")
          .filter((c) => c.startsWith("bg-") || c.startsWith("border-"))
          .join(" ") || "";

      expect(bgClasses).not.toMatch(/yellow-500/);
      expect(bgClasses).not.toMatch(/yellow-400/);
      expect(bgClasses).not.toMatch(/yellow-600/);
    });

    it("does not have warning-related classes", () => {
      const block = createMockBlock(
        "pending",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T10:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      expect(container.querySelector(".warning")).not.toBeInTheDocument();
      expect(container.querySelector(".alert")).not.toBeInTheDocument();
      expect(container.querySelector(".danger")).not.toBeInTheDocument();
    });
  });

  describe("Requirement 3.5: Maintain neutral pending state even when time exceeds start", () => {
    it("keeps neutral styling when current time is after start time", () => {
      const startTime = new Date("2024-01-15T08:00:00");
      const currentTime = new Date("2024-01-15T08:30:00"); // 30 minutes after start
      const block = createMockBlock("pending", startTime, 30);

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={currentTime}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");

      // Should maintain neutral pending state
      expect(blockElement).toHaveClass("bg-surface-primary");
      expect(blockElement).toHaveClass("border-border-primary");
    });

    it("keeps neutral styling when current time is after end time", () => {
      const startTime = new Date("2024-01-15T08:00:00");
      const currentTime = new Date("2024-01-15T09:00:00"); // 30 minutes after end
      const block = createMockBlock("pending", startTime, 30);

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={currentTime}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const blockElement = container.querySelector(".rounded-lg");

      // Should maintain neutral pending state
      expect(blockElement).toHaveClass("bg-surface-primary");
      expect(blockElement).toHaveClass("border-border-primary");
    });

    it('does not show "Late" badge when time has passed', () => {
      const startTime = new Date("2024-01-15T08:00:00");
      const currentTime = new Date("2024-01-15T09:00:00"); // After end time
      const block = createMockBlock("pending", startTime, 30);

      render(
        <TimeBlock
          block={block}
          currentTime={currentTime}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      // Should NOT show "Late" badge (Mirror V2 removes time-based indicators)
      expect(screen.queryByText(/Late/i)).not.toBeInTheDocument();
    });

    it('does not show "Current" badge based on time', () => {
      const startTime = new Date("2024-01-15T08:00:00");
      const currentTime = new Date("2024-01-15T08:15:00"); // During block
      const block = createMockBlock("pending", startTime, 30);

      render(
        <TimeBlock
          block={block}
          currentTime={currentTime}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      // Should NOT show "Current" badge (Mirror V2 removes time-based indicators)
      expect(screen.queryByText(/Current/i)).not.toBeInTheDocument();
    });
  });

  describe("Text styling for different states", () => {
    it("uses neutral text color for pending blocks", () => {
      const block = createMockBlock(
        "pending",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const activityName = screen.getByText("Test Activity");
      expect(activityName).toHaveClass("text-text-primary");
    });

    it("uses muted text with strikethrough for completed blocks", () => {
      const block = createMockBlock(
        "completed",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const activityName = screen.getByText("Test Activity");
      expect(activityName).toHaveClass("text-text-muted");
      expect(activityName).toHaveClass("line-through");
    });

    it("uses muted text for skipped blocks", () => {
      const block = createMockBlock(
        "skipped",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      const activityName = screen.getByText("Test Activity");
      expect(activityName).toHaveClass("text-text-muted");
    });
  });

  describe("Completion controls visibility", () => {
    it("shows completion buttons for pending blocks", () => {
      const block = createMockBlock(
        "pending",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T07:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      expect(
        screen.getByRole("button", { name: /mark as complete/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /skip activity/i }),
      ).toBeInTheDocument();
    });

    it("shows status icon for completed blocks", () => {
      const block = createMockBlock(
        "completed",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      // Should show green checkmark icon
      const icon = container.querySelector(".text-green-500");
      expect(icon).toBeInTheDocument();
    });

    it("shows status icon for skipped blocks", () => {
      const block = createMockBlock(
        "skipped",
        new Date("2024-01-15T08:00:00"),
        30,
      );

      const { container } = render(
        <TimeBlock
          block={block}
          currentTime={new Date("2024-01-15T09:00:00")}
          editMode={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          onEdit={mockOnEdit}
          onRecalculateAll={mockOnRecalculateAll}
        />,
      );

      // Should show yellow skip icon
      const icon = container.querySelector(".text-yellow-500");
      expect(icon).toBeInTheDocument();
    });
  });
});
