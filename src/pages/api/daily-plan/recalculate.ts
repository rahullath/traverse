import type { APIRoute } from "astro";
import { ServerAuth } from "../../../lib/auth/simple-multi-user";
import { createPlanBuilderService } from "../../../lib/daily-plan/plan-builder";
import {
  getDailyPlanByDate,
  deleteDailyPlan,
  deleteTimeBlocksByPlan,
  deleteExitTimesByPlan,
  getTimeBlocksByPlan,
  updateTimeBlock,
} from "../../../lib/daily-plan/database";
import type { PlanInput, TimeBlock } from "../../../types/daily-plan";
import type { Location } from "../../../types/uk-student-travel";

/**
 * POST /api/daily-plan/recalculate
 *
 * Recalculate daily plan from current time (stateless recalc)
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5
 */
export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Authenticate user
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Get current time as effective wake time
    const currentTime = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch user preferences for sleep_time and energy_state
    const { data: prefsData, error: prefsError } = await serverAuth.supabase
      .from("user_preferences")
      .select("preferences")
      .eq("user_id", user.id)
      .single();

    if (prefsError && prefsError.code !== "PGRST116") {
      console.error("Error fetching user preferences:", prefsError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch user preferences",
          details: prefsError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Extract preferences with graceful fallbacks
    const preferences = prefsData?.preferences || {};

    // Get sleep_time (default to 23:00 if not set)
    const sleepTimeStr = preferences.sleep_time || "23:00";
    const sleepTime = new Date(currentTime);
    const [sleepHours, sleepMinutes] = sleepTimeStr.split(":").map(Number);
    sleepTime.setHours(sleepHours, sleepMinutes, 0, 0);

    // If sleep time is before current time, assume next day
    if (sleepTime <= currentTime) {
      sleepTime.setDate(sleepTime.getDate() + 1);
    }

    // Get energy_state (default to 'medium' if not set)
    const energyState = preferences.energy_state || "medium";

    // Validate energy state
    if (!["low", "medium", "high"].includes(energyState)) {
      return new Response(
        JSON.stringify({
          error: "Invalid energy state",
          details: "Energy state must be one of: low, medium, high",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get current location state (default to Birmingham city center)
    const currentLocation: Location = preferences.current_location || {
      name: "Home",
      address: "Birmingham, UK",
      coordinates: [52.4862, -1.8904],
      type: "home",
    };

    // Delete existing plan for today if it exists (Requirement 8.3)
    const existingPlan = await getDailyPlanByDate(
      serverAuth.supabase,
      user.id,
      today,
    );

    // Store completed blocks from old plan (Requirement 23.4)
    let completedBlocks: TimeBlock[] = [];
    if (existingPlan) {
      console.log(
        "[Recalculate] Fetching completed blocks from existing plan:",
        existingPlan.id,
      );
      const oldBlocks = await getTimeBlocksByPlan(
        serverAuth.supabase,
        existingPlan.id,
      );
      completedBlocks = oldBlocks.filter(
        (block) => block.status === "completed",
      );
      console.log(
        "[Recalculate] Found",
        completedBlocks.length,
        "completed blocks to preserve",
      );

      console.log("[Recalculate] Deleting existing plan:", existingPlan.id);
      await deleteExitTimesByPlan(serverAuth.supabase, existingPlan.id);
      await deleteTimeBlocksByPlan(serverAuth.supabase, existingPlan.id);
      await deleteDailyPlan(serverAuth.supabase, existingPlan.id);
    }

    // Create plan input with current time as wake time
    const planInput: PlanInput = {
      userId: user.id,
      date: today,
      wakeTime: currentTime,
      sleepTime: sleepTime,
      energyState: energyState as "low" | "medium" | "high",
    };

    // Generate plan with 4-second timeout
    const planBuilderService = createPlanBuilderService(serverAuth.supabase);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Plan generation timeout")), 4000);
    });

    const planPromise = planBuilderService.generateDailyPlan(
      planInput,
      currentLocation,
    );

    // Race between plan generation and timeout
    const plan = await Promise.race([planPromise, timeoutPromise]);

    // Preserve completion state from old plan (Requirement 23.4)
    if (completedBlocks.length > 0 && plan.timeBlocks) {
      console.log(
        "[Recalculate] Preserving completion state for matching blocks",
      );

      // Create a map of completed blocks by start_time for efficient lookup
      const completedByStartTime = new Map<string, TimeBlock>();
      for (const completedBlock of completedBlocks) {
        const startTimeKey = completedBlock.startTime.toISOString();
        completedByStartTime.set(startTimeKey, completedBlock);
      }

      // Match new blocks with completed blocks by start_time
      const updatePromises: Promise<TimeBlock>[] = [];
      for (const newBlock of plan.timeBlocks) {
        const startTimeKey = newBlock.startTime.toISOString();
        const matchingCompletedBlock = completedByStartTime.get(startTimeKey);

        if (matchingCompletedBlock) {
          console.log(
            "[Recalculate] Preserving completed status for block:",
            newBlock.id,
            "at",
            startTimeKey,
          );
          updatePromises.push(
            updateTimeBlock(serverAuth.supabase, newBlock.id, {
              status: "completed",
            }),
          );
        }
      }

      // Update all matching blocks in parallel
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(
          "[Recalculate] Preserved completion state for",
          updatePromises.length,
          "blocks",
        );
      }
    }

    return new Response(
      JSON.stringify({
        plan,
        recalculated_at: currentTime.toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error recalculating plan:", error);

    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle timeout errors
    if (error instanceof Error && error.message === "Plan generation timeout") {
      return new Response(
        JSON.stringify({
          error: "Request timeout",
          details: "Plan generation took longer than 4 seconds",
        }),
        {
          status: 408,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle other errors
    return new Response(
      JSON.stringify({
        error: "Failed to recalculate plan",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
