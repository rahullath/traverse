import type { APIRoute } from "astro";
import { ServerAuth } from "../../../lib/auth/simple-multi-user";
import { getDailyPlanByDateWithBlocks } from "../../../lib/daily-plan/database";
import { RealityCheckService } from "../../../lib/display/reality-check";
import {
  handleApiError,
  logError,
  validateRequired,
} from "../../../lib/triage/error-handler";

/**
 * POST /api/daily-plan/reality-check
 *
 * User-initiated reality check calculation
 *
 * Requirements: 7.1, 7.2
 *
 * Calculates which chain steps fit within available runway and provides
 * alternative options using neutral language.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  let userId: string | undefined;

  try {
    // Authenticate user (Req 7.1)
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    userId = user.id;

    // Parse request body
    const body = await request.json();
    const { anchor_id } = body as { anchor_id?: string };

    // Validate required fields
    const validation = validateRequired(body, ["anchor_id"]);
    if (!validation.valid) {
      return new Response(JSON.stringify(validation.error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    // Find the anchor block
    const anchorBlock = plan.timeBlocks.find(
      (block) =>
        block.activityId === anchor_id &&
        block.metadata?.role?.type === "anchor",
    );

    if (!anchorBlock) {
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

    // Calculate runway
    const currentTime = new Date();
    const runway = Math.floor(
      (anchorBlock.startTime.getTime() - currentTime.getTime()) / 60000,
    );

    // If anchor has already passed, return special response
    if (runway < 0) {
      return new Response(
        JSON.stringify({
          error: "AnchorPassedError",
          message: "This anchor has already passed",
          runway: 0,
          required_duration: 0,
          possible_steps: [],
          skipped_steps: [],
          alternatives: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Calculate reality check using RealityCheckService (Req 7.2)
    const realityCheckService = new RealityCheckService();
    const result = realityCheckService.calculatePossibleSteps(
      plan.timeBlocks,
      runway,
      anchorBlock,
      currentTime,
    );

    // Record telemetry event for reality check request
    // Note: This will be implemented in Phase 4 when analytics are added
    // For now, we just calculate and return the result

    // Return reality check result (Req 7.2)
    return new Response(
      JSON.stringify({
        possible_steps: result.possibleSteps.map((block) => ({
          id: block.id,
          activity_name: block.activityName,
          start_time: block.startTime.toISOString(),
          end_time: block.endTime.toISOString(),
          duration: Math.floor(
            (block.endTime.getTime() - block.startTime.getTime()) / 60000,
          ),
        })),
        skipped_steps: result.skippedSteps.map((block) => ({
          id: block.id,
          activity_name: block.activityName,
          duration: Math.floor(
            (block.endTime.getTime() - block.startTime.getTime()) / 60000,
          ),
        })),
        alternatives: result.alternatives.map((alt) => ({
          id: alt.id,
          label: alt.label,
          description: alt.description,
          estimated_duration: alt.estimatedDuration,
        })),
        runway,
        required_duration: result.requiredDuration,
        can_make_anchor: result.canMakeAnchor,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const context = {
      user_id: userId,
      endpoint: "/api/daily-plan/reality-check",
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
