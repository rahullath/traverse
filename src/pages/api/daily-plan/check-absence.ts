import type { APIRoute } from "astro";
import { ServerAuth } from "../../../lib/auth/simple-multi-user";

/**
 * GET /api/daily-plan/check-absence
 *
 * Check if user has been absent (no daily plans) for 7+ consecutive days
 *
 * Requirements: 9.1
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Authenticate user
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query for daily plans in the last 7 days
    const { data: recentPlans, error } = await serverAuth.supabase
      .from("daily_plans")
      .select("plan_date")
      .eq("user_id", user.id)
      .gte("plan_date", sevenDaysAgo.toISOString())
      .lte("plan_date", today.toISOString())
      .order("plan_date", { ascending: false });

    if (error) {
      console.error("Error querying daily plans:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to check absence",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // If no plans found in last 7 days, check how many days absent
    if (!recentPlans || recentPlans.length === 0) {
      // Query for the most recent plan before 7 days ago
      const { data: lastPlan } = await serverAuth.supabase
        .from("daily_plans")
        .select("plan_date")
        .eq("user_id", user.id)
        .lt("plan_date", sevenDaysAgo.toISOString())
        .order("plan_date", { ascending: false })
        .limit(1)
        .single();

      let daysAbsent = 7;

      if (lastPlan) {
        // Calculate days between last plan and today
        const lastPlanDate = new Date(lastPlan.plan_date);
        lastPlanDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - lastPlanDate.getTime();
        daysAbsent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // No plans ever, return a large number
        daysAbsent = 365;
      }

      return new Response(
        JSON.stringify({
          days_absent: daysAbsent,
          has_recent_plans: false,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // User has recent plans, calculate days since last plan
    const mostRecentPlanDate = new Date(recentPlans[0].plan_date);
    mostRecentPlanDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - mostRecentPlanDate.getTime();
    const daysAbsent = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return new Response(
      JSON.stringify({
        days_absent: daysAbsent,
        has_recent_plans: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error checking absence:", error);

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

    // Handle other errors
    return new Response(
      JSON.stringify({
        error: "Failed to check absence",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
