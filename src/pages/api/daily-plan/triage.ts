import type { APIRoute } from "astro";
import { ServerAuth } from "../../../lib/auth/simple-multi-user";
import { getDailyPlanByDateWithBlocks } from "../../../lib/daily-plan/database";
import { TriageService } from "../../../lib/triage/triage-service";
import type { TriageDecision, TriageMode } from "../../../types/triage";
import type { TimeBlock } from "../../../types/daily-plan";
import {
  handleApiError,
  logError,
  validateRequired,
} from "../../../lib/triage/error-handler";

/**
 * POST /api/daily-plan/triage
 *
 * Apply triage decision to current plan
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * Triage decisions are session-only (not persisted to database)
 * - protect_keystone: Keep only keystone activity and anchor blocks
 * - skip_anchor: Mark all anchor blocks as skipped
 * - recalculate: Trigger full recalculation from current time
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  let userId: string | undefined;

  try {
    // Authenticate user
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    userId = user.id;

    // Parse request body
    const body = await request.json();
    const { mode, anchor_id } = body as Partial<TriageDecision>;

    // Validate required fields
    const validation = validateRequired(body, ["mode", "anchor_id"]);
    if (!validation.valid) {
      return new Response(JSON.stringify(validation.error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate mode
    const validModes: TriageMode[] = [
      "protect_keystone",
      "skip_anchor",
      "recalculate",
    ];
    if (!validModes.includes(mode!)) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message:
            "Mode must be one of: protect_keystone, skip_anchor, recalculate",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch current plan
    const plan = await getDailyPlanByDateWithBlocks(
      serverAuth.supabase,
      user.id,
      today,
    );

    // Return 404 if no plan exists
    if (!plan || !plan.timeBlocks || plan.timeBlocks.length === 0) {
      return new Response(
        JSON.stringify({
          error: "NotFoundError",
          message: "No daily plan exists for today",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify anchor exists in plan
    const anchorExists = plan.timeBlocks.some(
      (block) =>
        block.activityId === anchor_id &&
        block.metadata?.role?.type === "anchor",
    );

    if (!anchorExists) {
      return new Response(
        JSON.stringify({
          error: "NotFoundError",
          message: `No anchor with id ${anchor_id} found in current plan`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Apply triage decision based on mode
    let updatedTimeline: TimeBlock[];
    let recalcTriggered = false;

    switch (mode) {
      case "protect_keystone":
        updatedTimeline = applyProtectKeystone(plan.timeBlocks, anchor_id);
        break;

      case "skip_anchor":
        updatedTimeline = applySkipAnchor(plan.timeBlocks, anchor_id);
        break;

      case "recalculate":
        // For recalculate mode, we just set the flag
        // The client will trigger the recalculate API endpoint
        updatedTimeline = plan.timeBlocks;
        recalcTriggered = true;
        break;

      default:
        // This should never happen due to validation above
        updatedTimeline = plan.timeBlocks;
    }

    // Return updated timeline
    // Note: Requirement 3.5 - triage decisions persist for current session only
    // We return the filtered timeline but don't save to database
    return new Response(
      JSON.stringify({
        time_blocks: updatedTimeline,
        recalc_triggered: recalcTriggered,
        mode,
        anchor_id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const context = {
      user_id: userId,
      endpoint: "/api/daily-plan/triage",
      method: "POST",
    };

    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      logError(error, context);
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle all other errors with consistent error handling
    const { response, status } = handleApiError(error, context);
    return new Response(JSON.stringify(response), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * Apply "Protect Keystone" triage decision
 *
 * Requirement 3.2: Keep only keystone activity and anchor blocks
 *
 * @param timeBlocks - All time blocks in the plan
 * @param anchorId - ID of the anchor to protect
 * @returns Filtered timeline with only keystone and anchor
 */
function applyProtectKeystone(
  timeBlocks: TimeBlock[],
  anchorId: string,
): TimeBlock[] {
  const triageService = new TriageService();

  // Identify keystone activity
  const keystoneActivity = triageService.identifyKeystoneActivity(
    timeBlocks,
    anchorId,
  );

  // Find the anchor block
  const anchorBlock = timeBlocks.find(
    (block) =>
      block.activityId === anchorId && block.metadata?.role?.type === "anchor",
  );

  // Filter timeline to keep only:
  // 1. Keystone activity (if different from anchor)
  // 2. Anchor block
  // 3. Blocks not related to this anchor (other anchors, etc.)
  return timeBlocks.filter((block) => {
    // Keep the anchor
    if (
      block.activityId === anchorId &&
      block.metadata?.role?.type === "anchor"
    ) {
      return true;
    }

    // Keep the keystone activity (if it's not the anchor)
    if (
      keystoneActivity &&
      block.metadata?.step_id === keystoneActivity.metadata?.step_id
    ) {
      return true;
    }

    // Remove all other blocks related to this anchor
    if (block.metadata?.anchor_id === anchorId) {
      return false;
    }

    // Keep blocks not related to this anchor
    return true;
  });
}

/**
 * Apply "Skip Anchor" triage decision
 *
 * Requirement 3.3: Mark all anchor blocks as skipped and remove from timeline
 *
 * @param timeBlocks - All time blocks in the plan
 * @param anchorId - ID of the anchor to skip
 * @returns Filtered timeline with anchor blocks removed
 */
function applySkipAnchor(
  timeBlocks: TimeBlock[],
  anchorId: string,
): TimeBlock[] {
  // Filter out all blocks related to this anchor
  // Mark them as skipped (though they won't be in the returned timeline)
  return timeBlocks
    .map((block) => {
      // If block is related to this anchor, mark as skipped
      if (
        block.metadata?.anchor_id === anchorId ||
        (block.activityId === anchorId &&
          block.metadata?.role?.type === "anchor")
      ) {
        return {
          ...block,
          status: "skipped" as const,
          skipReason: "User skipped via triage",
        };
      }
      return block;
    })
    .filter((block) => {
      // Remove all blocks related to this anchor from visible timeline
      return !(
        block.metadata?.anchor_id === anchorId ||
        (block.activityId === anchorId &&
          block.metadata?.role?.type === "anchor")
      );
    });
}
