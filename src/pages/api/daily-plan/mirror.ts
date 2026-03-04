import type { APIRoute } from "astro";
import { ServerAuth } from "../../../lib/auth/simple-multi-user";
import { getDailyPlanByDateWithBlocks } from "../../../lib/daily-plan/database";
import { TimePhysicsService } from "../../../lib/triage/time-physics";
import { TriageService } from "../../../lib/triage/triage-service";
import { StateFilterService } from "../../../lib/triage/state-filter";
import type { MirrorData, StateDeclaration } from "../../../types/triage";
import { handleApiError, logError } from "../../../lib/triage/error-handler";

/**
 * GET /api/daily-plan/mirror
 *
 * Fetch mirror data for today's plan with runway calculation and triage state
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4
 */
export const GET: APIRoute = async ({ cookies }) => {
  let userId: string | undefined;
  
  try {
    // Authenticate user
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    userId = user.id;

    // Get today's date (start of day in local timezone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch today's plan with all time blocks
    const plan = await getDailyPlanByDateWithBlocks(
      serverAuth.supabase,
      user.id,
      today,
    );

    // Return 404 if no plan exists
    if (!plan || !plan.timeBlocks || plan.timeBlocks.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No plan found",
          details: "No daily plan exists for today",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Initialize services
    const timePhysicsService = new TimePhysicsService();
    const triageService = new TriageService();
    const stateFilterService = new StateFilterService();

    // Calculate runway
    const currentTime = new Date();
    const runway = timePhysicsService.calculateRunway(
      plan.timeBlocks,
      currentTime,
    );

    // Get triage state
    const triageState = triageService.getTriageState(plan.timeBlocks, runway);

    // Get last state declaration from user preferences
    const { data: prefsData } = await serverAuth.supabase
      .from("user_preferences")
      .select("preferences")
      .eq("user_id", user.id)
      .single();

    const preferences = prefsData?.preferences || {};
    const lastStateDeclaration: StateDeclaration | null =
      preferences.last_state_declaration
        ? {
            state: preferences.last_state_declaration.state,
            selected_step_id:
              preferences.last_state_declaration.selected_step_id,
            timestamp: new Date(preferences.last_state_declaration.timestamp),
          }
        : null;

    // Check if state prompt should show
    const showStatePrompt = stateFilterService.shouldShowStatePrompt(
      lastStateDeclaration,
      plan.timeBlocks,
      currentTime,
    );

    // Build mirror data payload
    const mirrorData: MirrorData = {
      time_blocks: plan.timeBlocks,
      runway,
      triage_state: triageState,
      show_state_prompt: showStatePrompt,
      last_state_declaration: lastStateDeclaration,
    };

    return new Response(JSON.stringify(mirrorData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const context = {
      user_id: userId,
      endpoint: "/api/daily-plan/mirror",
      method: "GET",
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
