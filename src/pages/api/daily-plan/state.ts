import type { APIRoute } from "astro";
import { ServerAuth } from "../../../lib/auth/simple-multi-user";
import { getDailyPlanByDateWithBlocks } from "../../../lib/daily-plan/database";
import { updateTimeBlock } from "../../../lib/daily-plan/database";
import { StateFilterService } from "../../../lib/triage/state-filter";
import { TimePhysicsService } from "../../../lib/triage/time-physics";
import { TriageService } from "../../../lib/triage/triage-service";
import type { UserState, StateDeclaration } from "../../../types/triage";
import {
  handleApiError,
  logError,
  validateRequired,
  withFallback,
} from "../../../lib/triage/error-handler";

/**
 * POST /api/daily-plan/state
 *
 * Handle user state declaration and apply timeline filtering
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10
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
    const { state, selected_step_id } = body;

    // Validate required fields
    const validation = validateRequired(body, ["state"]);
    if (!validation.valid) {
      return new Response(JSON.stringify(validation.error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Requirement 16.2: Validate state against whitelist
    const validStates: UserState[] = [
      "starting_day",
      "ready_for_anchor",
      "mid_chain",
      "at_anchor",
      "missed_it",
      "just_checking",
    ];

    if (!validStates.includes(state)) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: `State must be one of: ${validStates.join(", ")}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Requirement 16.2: Validate selected_step_id for mid_chain state
    if (state === "mid_chain" && !selected_step_id) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "selected_step_id is required for mid_chain state",
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

    // Requirement 16.2: Fetch current plan
    const plan = await getDailyPlanByDateWithBlocks(
      serverAuth.supabase,
      user.id,
      today,
    );

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

    // Initialize services
    const stateFilterService = new StateFilterService();
    const currentTime = new Date();

    // Create state declaration
    const stateDeclaration: StateDeclaration = {
      state,
      selected_step_id,
      timestamp: currentTime,
    };

    // Requirement 16.2: Apply state filter using StateFilterService
    const filteredTimeline = stateFilterService.filterTimeline(
      plan.timeBlocks,
      stateDeclaration,
      currentTime,
    );

    // Requirement 16.2: Update time_blocks statuses in database
    // Update hidden blocks with their new status (completed/skipped)
    // Use graceful fallback for non-critical updates
    await withFallback(
      async () => {
        for (const hiddenBlock of filteredTimeline.hidden_blocks) {
          const originalBlock = plan.timeBlocks.find(
            (b) => b.id === hiddenBlock.id,
          );
          if (originalBlock && originalBlock.status !== hiddenBlock.status) {
            await updateTimeBlock(serverAuth.supabase, hiddenBlock.id, {
              status: hiddenBlock.status,
              skip_reason: hiddenBlock.skipReason,
            });
          }
        }

        // Update visible blocks if their status changed
        for (const visibleBlock of filteredTimeline.visible_blocks) {
          const originalBlock = plan.timeBlocks.find(
            (b) => b.id === visibleBlock.id,
          );
          if (originalBlock && originalBlock.status !== visibleBlock.status) {
            await updateTimeBlock(serverAuth.supabase, visibleBlock.id, {
              status: visibleBlock.status,
            });
          }
        }
      },
      undefined,
      {
        user_id: userId,
        endpoint: "/api/daily-plan/state",
        operation: "update_time_blocks",
      },
    );

    // Requirement 16.2: Save state declaration to user_preferences
    // Use graceful fallback for preference save
    await withFallback(
      async () => {
        const { data: prefsData } = await serverAuth.supabase
          .from("user_preferences")
          .select("preferences")
          .eq("user_id", user.id)
          .single();

        const preferences = prefsData?.preferences || {};
        const updatedPreferences = {
          ...preferences,
          last_state_declaration: {
            state: stateDeclaration.state,
            selected_step_id: stateDeclaration.selected_step_id,
            timestamp: stateDeclaration.timestamp.toISOString(),
          },
        };

        await serverAuth.supabase
          .from("user_preferences")
          .update({ preferences: updatedPreferences })
          .eq("user_id", user.id);
      },
      undefined,
      {
        user_id: userId,
        endpoint: "/api/daily-plan/state",
        operation: "save_preferences",
      },
    );

    // Requirement 16.10: Check if triage should trigger for ready_for_anchor
    let triageTriggered = false;
    if (state === "ready_for_anchor") {
      // Check if user is past departure time
      const timePhysicsService = new TimePhysicsService();
      const triageService = new TriageService();

      const runway = timePhysicsService.calculateRunway(
        plan.timeBlocks,
        currentTime,
      );

      // If runway calculation shows insufficient time, trigger triage
      if (triageService.shouldActivateTriage(runway)) {
        triageTriggered = true;
      }
    }

    // Return filtered timeline and triage flag
    return new Response(
      JSON.stringify({
        visible_blocks: filteredTimeline.visible_blocks,
        hidden_blocks: filteredTimeline.hidden_blocks,
        filter_reason: filteredTimeline.filter_reason,
        triage_triggered: triageTriggered,
        state_declaration: stateDeclaration,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const context = {
      user_id: userId,
      endpoint: "/api/daily-plan/state",
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
