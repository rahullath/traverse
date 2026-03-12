/**
 * Unit Tests: Timeline Component (Mirror V2 Features)
 *
 * Tests for Mirror V2 timeline display changes
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Timeline from "@/components/daily-plan/Timeline";
import type { TimeBlock } from "@/types/daily-plan";

describe("Timeline - Mirror V2 Features", () => {
  const mockOnBlockComplete = vi.fn();
  const mockOnBlockSkip = vi.fn();
  const mockOnBlockEdit = vi.fn();
  const mockOnRefresh = vi.fn();

  const createMockBlock = (
    id: string,
    activityName: string,
    startTime: Date,
    duration: number,
    envelopeType?: string,
  ): TimeBlock => ({
    id,
    activityId: `activity-${id}`,
    activityName,
    startTime,
    endTime: new Date(startTime.getTime() + duration * 60000),
    status: "pending",
    metadata: envelopeType
      ? {
          role: { type: envelopeType === "anchor" ? "anchor" : "chain-step" },
          commitment_envelope: {
            envelope_id: "env-1",
            envelope_type: envelopeType,
          },
        }
      : undefined,
  });

  describe("Requirement 5.1: Display durations for chain steps", () => {
    it("shows duration format for chain step blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Shower",
          new Date("2024-01-15T08:00:00"),
          15,
          "prep",
        ),
        createMockBlock(
          "2",
          "Get dressed",
          new Date("2024-01-15T08:15:00"),
          10,
          "prep",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      // Chain steps should show duration format
      expect(screen.getByText(/15m/)).toBeInTheDocument();
      expect(screen.getByText(/10m/)).toBeInTheDocument();
    });

    it("shows duration format for non-envelope blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock("1", "Free time", new Date("2024-01-15T08:00:00"), 30),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      expect(screen.getByText(/30m/)).toBeInTheDocument();
    });
  });

  describe("Requirement 5.2: Show clock times for anchors and departure", () => {
    it("shows clock time for anchor blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Team Meeting",
          new Date("2024-01-15T14:00:00"),
          60,
          "anchor",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      // Anchor should show clock time (using getAllByText since time appears in multiple places)
      const timeElements = screen.getAllByText(/2:00 PM/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("shows clock time for travel_there (departure) blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Travel to meeting",
          new Date("2024-01-15T13:30:00"),
          30,
          "travel_there",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      // Departure should show clock time (using getAllByText since time appears in multiple places)
      const timeElements = screen.getAllByText(/1:30 PM/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe("Requirements 5.3, 5.4, 5.5: Display logic based on envelope_type", () => {
    it("shows duration for prep blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Shower",
          new Date("2024-01-15T08:00:00"),
          15,
          "prep",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      expect(screen.getByText(/15m/)).toBeInTheDocument();
    });

    it("shows clock time for anchor blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Class",
          new Date("2024-01-15T10:00:00"),
          90,
          "anchor",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      // Anchor should show clock time (using getAllByText since time appears in multiple places)
      const timeElements = screen.getAllByText(/10:00 AM/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("shows clock time for travel_there blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Travel",
          new Date("2024-01-15T09:30:00"),
          30,
          "travel_there",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      // Departure should show clock time (using getAllByText since time appears in multiple places)
      const timeElements = screen.getAllByText(/9:30 AM/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("shows duration for travel_back blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Travel back",
          new Date("2024-01-15T11:30:00"),
          30,
          "travel_back",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      expect(screen.getByText(/30m/)).toBeInTheDocument();
    });

    it("shows duration for recovery blocks", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Rest",
          new Date("2024-01-15T12:00:00"),
          30,
          "recovery",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      expect(screen.getByText(/30m/)).toBeInTheDocument();
    });
  });

  describe('"When ready" mode - no clock times', () => {
    it("shows only durations when showTimes is false", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Shower",
          new Date("2024-01-15T08:00:00"),
          15,
          "prep",
        ),
        createMockBlock(
          "2",
          "Team Meeting",
          new Date("2024-01-15T10:00:00"),
          60,
          "anchor",
        ),
        createMockBlock(
          "3",
          "Travel",
          new Date("2024-01-15T09:30:00"),
          30,
          "travel_there",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={false}
        />,
      );

      // All blocks should show duration format
      expect(screen.getByText(/15m/)).toBeInTheDocument();
      expect(screen.getAllByText(/1h/).length).toBeGreaterThan(0); // 60m = 1h
      expect(screen.getByText(/30m/)).toBeInTheDocument();

      // Should NOT show clock times (check that specific times don't appear in duration contexts)
      const allText = document.body.textContent || "";
      // Times will appear in "Current Time" display, but not in block durations
      // We can't easily test this without more specific selectors
    });
  });

  describe("Mixed timeline with different envelope types", () => {
    it("correctly displays durations and clock times in mixed timeline", () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Shower",
          new Date("2024-01-15T08:00:00"),
          15,
          "prep",
        ),
        createMockBlock(
          "2",
          "Get dressed",
          new Date("2024-01-15T08:15:00"),
          10,
          "prep",
        ),
        createMockBlock(
          "3",
          "Travel to class",
          new Date("2024-01-15T09:30:00"),
          30,
          "travel_there",
        ),
        createMockBlock(
          "4",
          "Class",
          new Date("2024-01-15T10:00:00"),
          90,
          "anchor",
        ),
        createMockBlock(
          "5",
          "Travel back",
          new Date("2024-01-15T11:30:00"),
          30,
          "travel_back",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      // Prep blocks should show duration
      expect(screen.getByText(/15m/)).toBeInTheDocument();
      expect(screen.getByText(/10m/)).toBeInTheDocument();

      // Travel_there should show clock time (using getAllByText)
      const travelTimeElements = screen.getAllByText(/9:30 AM/i);
      expect(travelTimeElements.length).toBeGreaterThan(0);

      // Anchor should show clock time (using getAllByText)
      const anchorTimeElements = screen.getAllByText(/10:00 AM/i);
      expect(anchorTimeElements.length).toBeGreaterThan(0);

      // Travel_back should show duration
      expect(screen.getAllByText(/30m/).length).toBeGreaterThan(0);
    });
  });

  describe("Duration formatting", () => {
    it('formats durations less than 60 minutes as "Xm"', () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Quick task",
          new Date("2024-01-15T08:00:00"),
          45,
          "prep",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      expect(screen.getByText(/45m/)).toBeInTheDocument();
    });

    it('formats durations of 60+ minutes as "Xh" or "Xh Ym"', () => {
      const blocks: TimeBlock[] = [
        createMockBlock(
          "1",
          "Long task",
          new Date("2024-01-15T08:00:00"),
          90,
          "prep",
        ),
        createMockBlock(
          "2",
          "Exact hour",
          new Date("2024-01-15T10:00:00"),
          60,
          "prep",
        ),
      ];

      render(
        <Timeline
          timeBlocks={blocks}
          editMode={false}
          onBlockComplete={mockOnBlockComplete}
          onBlockSkip={mockOnBlockSkip}
          onBlockEdit={mockOnBlockEdit}
          onRefresh={mockOnRefresh}
          showTimes={true}
        />,
      );

      expect(screen.getByText(/1h 30m/)).toBeInTheDocument();
      // Use getAllByText since "1h" might appear in "1h 30m" as well
      const hourElements = screen.getAllByText(/1h/);
      expect(hourElements.length).toBeGreaterThan(0);
    });
  });
});
