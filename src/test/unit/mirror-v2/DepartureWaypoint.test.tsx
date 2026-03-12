/**
 * Unit Tests: DepartureWaypoint Component
 *
 * Tests for Mirror V2 departure time display
 * Requirements: 6.2, 6.3, 6.4, 6.5, 19.1, 19.2, 19.3, 19.4, 19.5
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DepartureWaypoint } from "@/components/daily-plan/DepartureWaypoint";
import type { TimeBlock } from "@/types/daily-plan";

describe("DepartureWaypoint", () => {
  const mockAnchor = {
    id: "anchor-1",
    activityId: "activity-1",
    activityName: "Team Meeting",
    startTime: new Date("2024-01-15T14:00:00"),
    endTime: new Date("2024-01-15T15:00:00"),
    status: "pending",
    metadata: {
      role: {
        type: "anchor",
        required: true,
      },
      commitment_envelope: {
        envelope_id: "env-1",
        envelope_type: "anchor",
      },
    },
  } as TimeBlock;

  it("handles serialized string dates without crashing", () => {
    const serializedAnchor = {
      ...mockAnchor,
      startTime: "2024-01-15T14:00:00.000Z",
      endTime: "2024-01-15T15:00:00.000Z",
      metadata: {
        ...mockAnchor.metadata,
        timing_signals: {
          suggested_start_by: "2024-01-15T13:00:00.000Z",
          ready_to_leave_by: "2024-01-15T13:30:00.000Z",
          anchor_at: "2024-01-15T14:00:00.000Z",
          effective_arrival_deadline: "2024-01-15T14:10:00.000Z",
          max_late_minutes: 10,
          travel_duration_minutes: 30,
        },
      },
    } as unknown as TimeBlock;

    expect(() =>
      render(
        <DepartureWaypoint
          departureTime={new Date("2024-01-15T13:30:00.000Z")}
          currentTime={new Date("2024-01-15T12:45:00.000Z")}
          anchor={serializedAnchor}
          travelDuration={30}
        />,
      ),
    ).not.toThrow();
  });
  describe('Requirement 6.2: Display "Leave by [time]" prominently', () => {
    it('displays "Leave by" label', () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(screen.getByText(/Leave by/i)).toBeInTheDocument();
    });

    it("displays departure time in 12-hour format", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(screen.getByText(/1:30 PM/i)).toBeInTheDocument();
    });

    it("uses larger text for departure time than chain steps", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const timeElement = container.querySelector(".text-2xl");
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveTextContent(/1:30 PM/i);
    });
  });

  describe("Requirement 6.3: Show both clock time and countdown", () => {
    it("shows countdown in hours when more than 1 hour away", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(screen.getByText(/\(in 2h 30m\)/i)).toBeInTheDocument();
    });

    it("shows countdown in minutes when less than 1 hour away", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T13:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(screen.getByText(/\(in 30 minutes\)/i)).toBeInTheDocument();
    });

    it("shows countdown in hours only when exactly on the hour", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:30:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(screen.getByText(/\(in 2 hours\)/i)).toBeInTheDocument();
    });

    it("shows neutral message when departure time has passed", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T14:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(
        screen.getByText(/departure time has passed/i),
      ).toBeInTheDocument();
    });
  });

  describe("Requirement 6.4: Visual hierarchy", () => {
    it("uses appropriate text size hierarchy", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const timeElement = container.querySelector(".text-2xl");
      expect(timeElement).toBeInTheDocument();

      const labelElement = container.querySelector(".text-sm");
      expect(labelElement).toBeInTheDocument();
      expect(labelElement).toHaveTextContent(/Leave by/i);
    });
  });

  describe("Requirement 6.5: Neutral styling without red/warning colors", () => {
    it("uses neutral background color", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).toHaveClass("bg-surface-primary");
      expect(waypoint).not.toHaveClass("bg-red-500");
      expect(waypoint).not.toHaveClass("bg-orange-500");
      expect(waypoint).not.toHaveClass("bg-yellow-500");
    });
  });

  describe("Requirements 19.1, 19.2: Gentle highlight within 10 minutes", () => {
    it("uses neutral styling when more than 10 minutes away", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T13:15:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).toHaveClass("border-border");
      expect(waypoint).not.toHaveClass("font-semibold");
      expect(waypoint).not.toHaveClass("border-accent-primary/40");
    });

    it("applies gentle highlight when within 10 minutes", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T13:25:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).toHaveClass("font-semibold");
      expect(waypoint).toHaveClass("border-accent-primary/40");
    });
  });

  describe("Requirement 19.3: Gentle highlight styling", () => {
    it("uses font-weight 600 for gentle highlight", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T13:25:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).toHaveClass("font-semibold");
    });

    it("uses 2px border with accent color at 40% opacity for gentle highlight", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T13:25:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).toHaveClass("border-2");
      expect(waypoint).toHaveClass("border-accent-primary/40");
    });
  });

  describe("Requirements 19.4, 19.5: Never use alarm colors", () => {
    it("does not use red colors even when departure time has passed", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T14:00:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).not.toHaveClass("bg-red-500");
      expect(waypoint).not.toHaveClass("text-red-500");
      expect(waypoint).not.toHaveClass("border-red-500");
    });

    it("does not use orange or yellow colors at any time", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T13:25:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).not.toHaveClass("bg-orange-500");
      expect(waypoint).not.toHaveClass("bg-yellow-500");
      expect(waypoint).not.toHaveClass("text-orange-500");
      expect(waypoint).not.toHaveClass("text-yellow-500");
    });

    it("maintains calm presentation even when departure time has passed", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T14:00:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const waypoint = container.querySelector('[role="region"]');
      expect(waypoint).toHaveClass("bg-surface-primary");

      expect(container.querySelector(".urgent")).not.toBeInTheDocument();
      expect(container.querySelector(".warning")).not.toBeInTheDocument();
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
    });
  });

  describe("Additional context display", () => {
    it("displays destination anchor name", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(screen.getByText(/Travel to:/i)).toBeInTheDocument();
      expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    });

    it("displays travel duration", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(screen.getByText(/Travel time:/i)).toBeInTheDocument();
      expect(screen.getByText(/30 min/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      expect(
        screen.getByRole("region", { name: /departure waypoint/i }),
      ).toBeInTheDocument();
    });

    it("has aria-live region for countdown", () => {
      const departureTime = new Date("2024-01-15T13:30:00");
      const currentTime = new Date("2024-01-15T11:00:00");

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={mockAnchor}
          travelDuration={30}
        />,
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveTextContent(/\(in 2h 30m\)/i);
    });
  });
});
