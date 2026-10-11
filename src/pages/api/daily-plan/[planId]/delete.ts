import type { APIRoute } from "astro";
import { ServerAuth } from "../../../../lib/auth/simple-multi-user";
import { handleApiError, logError } from "../../../../lib/triage/error-handler";

/**
 * DELETE /api/daily-plan/[planId]/delete
 *
 * Delete a daily plan and all associated time blocks
 *
 * This endpoint allows users to remove an entire daily plan.
 * All time blocks associated with the plan are cascade-deleted via database constraints.
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  let userId: string | undefined;
  const planId = params.planId;

  try {
    // Authenticate user
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    userId = user.id;

    // Validate plan ID
    if (!planId) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Plan ID is required in URL path",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Fetch daily_plan by id and verify user ownership
    const { data: dailyPlan, error: fetchError } = await serverAuth.supabase
      .from("daily_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (fetchError || !dailyPlan) {
      return new Response(
        JSON.stringify({
          error: "NotFoundError",
          message: `No daily plan found with id ${planId}`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify user ownership
    if (dailyPlan.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "ForbiddenError",
          message: "You do not have permission to delete this daily plan",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Delete the daily plan (time_blocks will cascade delete via FK constraint)
    const { error: deleteError } = await serverAuth.supabase
      .from("daily_plans")
      .delete()
      .eq("id", planId);

    if (deleteError) {
      throw new Error(deleteError.message || "Failed to delete daily plan");
    }

    // Return success status
    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily plan deleted successfully",
        plan_id: planId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const context = {
      user_id: userId,
      plan_id: planId,
      endpoint: "/api/daily-plan/[planId]/delete",
      method: "DELETE",
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
