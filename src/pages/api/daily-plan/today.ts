import type { APIRoute } from "astro";
import { createServerClient } from "../../../lib/supabase/server";
import { getDailyPlanByDateWithBlocks } from "../../../lib/daily-plan/database";
import { buildExecutionChainsFromTimeBlocks } from "../../../lib/daily-plan/chain-reconstruction";
import {
  attachTimingSignalsToTimeBlocks,
  buildTimingSignalArray,
} from "../../../lib/daily-plan/time-signals";

/**
 * GET /api/daily-plan/today
 *
 * Fetch today's plan for the authenticated user.
 * Uses persisted time_blocks metadata as the single source of truth.
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const plan = await getDailyPlanByDateWithBlocks(supabase, user.id, today);
    if (!plan) {
      return new Response(JSON.stringify({ plan: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const timeBlocks = attachTimingSignalsToTimeBlocks(plan.timeBlocks || []);
    const chains = buildExecutionChainsFromTimeBlocks(timeBlocks);
    const timingSignals = buildTimingSignalArray(timeBlocks);

    const hydratedPlan = {
      ...plan,
      timeBlocks,
      chains: chains.length > 0 ? chains : plan.chains,
      timing_signals: timingSignals,
    };

    return new Response(JSON.stringify({ plan: hydratedPlan }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching today's plan:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch plan",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
