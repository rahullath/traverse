/**
 * Unit Tests: AnchorInfoCard Component
 *
 * Tests for Mirror V2 neutral anchor information display
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.2, 12.3
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnchorInfoCard } from "@/components/daily-plan/AnchorInfoCard";
import type { TimeBlock } from "@/types/daily-plan";

describe("AnchorInfoCard", () => {
  const mockAnchor: TimeBlock = {
    id: "anchor-1",
    activityId: "activity-1",
    activityName: "Team Meeting",
    startTime: new Date("2024-01-15T14:00:00"),
    endTime: new Date("2024-01-15T15:00:00"),
    status: "pending",
    metadata: {
      role: { type: "anchor" },
      commitment_envelope: {
        envelope_id: "env-1",
        envelope_type: "anchor",
      },
    },
  };

  const mockOnRealityCheck = vi.fn();
  const mockOnToggleExpand = vi.fn();

  describe('Requirement 2.1: "Anchor at" format (not "Complete by")', () => {
    it('displays "Anchor at [time]" format', () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      // Should show "Anchor at" format
      expect(screen.getByText(/Anchor at/i)).toBeInTheDocument();
      expect(screen.getByText(/2:00 PM/i)).toBeInTheDocument();

      // Should NOT show "Complete by" format
      expect(screen.queryByText(/Complete by/i)).not.toBeInTheDocument();
    });

    it("displays activity name", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    });
  });

  describe("Requirement 2.2: Neutral time format without countdown timer", () => {
    it('shows time remaining in neutral "(in X hours)" format', () => {
      const currentTime = new Date("2024-01-15T11:00:00"); // 3 hours before anchor

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      expect(screen.getByText(/\(in 3 hours\)/i)).toBeInTheDocument();
    });

    it("shows time remaining in hours and minutes when appropriate", () => {
      const currentTime = new Date("2024-01-15T12:30:00"); // 1.5 hours before anchor

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      expect(screen.getByText(/\(in 1h 30m\)/i)).toBeInTheDocument();
    });

    it("shows time remaining in minutes when less than 1 hour", () => {
      const currentTime = new Date("2024-01-15T13:30:00"); // 30 minutes before anchor

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      expect(screen.getByText(/\(in 30 minutes\)/i)).toBeInTheDocument();
    });

    it("shows neutral message when anchor time has passed", () => {
      const currentTime = new Date("2024-01-15T15:30:00"); // After anchor

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      expect(screen.getByText(/anchor time has passed/i)).toBeInTheDocument();
    });

    it("does not display a countdown timer element", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      const { container } = render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      // Should not have timer-like elements (no elements with "timer" class or role)
      expect(container.querySelector('[role="timer"]')).not.toBeInTheDocument();
      expect(
        container.querySelector(".countdown-timer"),
      ).not.toBeInTheDocument();
    });
  });

  describe('Requirement 2.3: "Can I make it?" button', () => {
    it('includes "Can I make it?" button', () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      const button = screen.getByRole("button", {
        name: /check if you can make this anchor/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(/can i make it/i);
    });

    it("calls onRealityCheck when button is clicked", async () => {
      const user = userEvent.setup();
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      const button = screen.getByRole("button", {
        name: /check if you can make this anchor/i,
      });
      await user.click(button);

      expect(mockOnRealityCheck).toHaveBeenCalledTimes(1);
    });
  });

  describe("Requirement 2.4: Neutral colors without red or warning states", () => {
    it("uses neutral background color", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      const { container } = render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      const card = container.querySelector('[role="region"]');
      expect(card).toHaveClass("bg-surface-primary");
      expect(card).not.toHaveClass("bg-red-500");
      expect(card).not.toHaveClass("bg-orange-500");
      expect(card).not.toHaveClass("bg-yellow-500");
    });

    it("does not change colors based on time proximity", () => {
      const { container: container1 } = render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={new Date("2024-01-15T11:00:00")} // 3 hours before
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      const { container: container2 } = render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={new Date("2024-01-15T13:50:00")} // 10 minutes before
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      const card1 = container1.querySelector('[role="region"]');
      const card2 = container2.querySelector('[role="region"]');

      // Both should have the same neutral styling
      expect(card1?.className).toBe(card2?.className);
    });
  });

  describe("Requirement 2.5: Neutral time remaining presentation", () => {
    it("presents time remaining without urgency indicators", () => {
      const currentTime = new Date("2024-01-15T13:50:00"); // 10 minutes before

      const { container } = render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      // Should not have urgency-related classes or elements
      expect(container.querySelector(".urgent")).not.toBeInTheDocument();
      expect(container.querySelector(".warning")).not.toBeInTheDocument();
      expect(container.querySelector(".alert")).not.toBeInTheDocument();
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
    });
  });

  describe("Requirements 12.2, 12.3: Multi-anchor progressive disclosure", () => {
    it("shows expand/collapse button when onToggleExpand is provided", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
          onToggleExpand={mockOnToggleExpand}
        />,
      );

      const button = screen.getByRole("button", {
        name: /expand anchor details/i,
      });
      expect(button).toBeInTheDocument();
    });

    it("does not show expand/collapse button when onToggleExpand is not provided", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /expand anchor details/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /collapse anchor details/i }),
      ).not.toBeInTheDocument();
    });

    it("calls onToggleExpand when expand button is clicked", async () => {
      const user = userEvent.setup();
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
          onToggleExpand={mockOnToggleExpand}
        />,
      );

      const button = screen.getByRole("button", {
        name: /expand anchor details/i,
      });
      await user.click(button);

      expect(mockOnToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("shows correct aria-expanded state", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      const { rerender } = render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
          onToggleExpand={mockOnToggleExpand}
        />,
      );

      let button = screen.getByRole("button", {
        name: /expand anchor details/i,
      });
      expect(button).toHaveAttribute("aria-expanded", "false");

      rerender(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={true}
          onToggleExpand={mockOnToggleExpand}
        />,
      );

      button = screen.getByRole("button", { name: /collapse anchor details/i });
      expect(button).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      expect(
        screen.getByRole("region", { name: /anchor information/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: /check if you can make this anchor/i,
        }),
      ).toBeInTheDocument();
    });

    it("has aria-live region for time remaining", () => {
      const currentTime = new Date("2024-01-15T11:00:00");

      const { container } = render(
        <AnchorInfoCard
          anchor={mockAnchor}
          currentTime={currentTime}
          onRealityCheck={mockOnRealityCheck}
          isExpanded={false}
        />,
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });
  });
});
