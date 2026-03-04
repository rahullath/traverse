import type { APIRoute } from "astro";
import { ServerAuth } from "../../../../lib/auth/simple-multi-user";
import {
  handleApiError,
  logError,
} from "../../../../lib/triage/error-handler";

/**
 * DELETE /api/time-blocks/[id]/delete
 *
 * Delete an anchor and its entire commitment envelope
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5
 *
 * This endpoint allows users to remove anchors and their entire commitment
 * envelopes from the timeline. Only anchor blocks can be deleted through this
 * endpoint - attempting to delete non-anchor blocks will result in an error.
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  let userId: string | undefined;
  const blockId = params.id;

  try {
    // Authenticate user
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    userId = user.id;
    // Validate block ID
    if (!blockId) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Block ID is required in URL path",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Fetch time_block by id and verify user ownership
    const { data: timeBlock, error: fetchError } = await serverAuth.supabase
      .from("time_blocks")
      .select("*, daily_plans!inner(user_id)")
      .eq("id", blockId)
      .single();

    if (fetchError || !timeBlock) {
      return new Response(
        JSON.stringify({
          error: "NotFoundError",
          message: `No time block found with id ${blockId}`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify user ownership
    if (timeBlock.daily_plans.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "ForbiddenError",
          message: "You do not have permission to delete this time block",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify block is an anchor
    const isAnchor = timeBlock.metadata?.role?.type === "anchor";
    if (!isAnchor) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message:
            "Only anchor blocks can be deleted. Use the edit endpoint to modify other blocks.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get the anchor_id to delete all related blocks
    // For anchor blocks, the activity_id is the anchor_id
    const anchorId = timeBlock.activity_id;

    if (!anchorId) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Anchor block does not have a valid activity_id",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Delete all time_blocks with matching anchor_id
    // This includes: prep, travel_there, anchor, travel_back, recovery
    const { data: deletedBlocks, error: deleteError } =
      await serverAuth.supabase
        .from("time_blocks")
        .delete()
        .eq("plan_id", timeBlock.plan_id)
        .or(`activity_id.eq.${anchorId},metadata->>anchor_id.eq.${anchorId}`)
        .select();

    if (deleteError) {
      throw new Error(deleteError.message || "Failed to delete anchor blocks");
    }

    // Return success status with count of deleted blocks
    return new Response(
      JSON.stringify({
        success: true,
        message: "Anchor and commitment envelope deleted successfully",
        deleted_count: deletedBlocks?.length || 0,
        anchor_id: anchorId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const context = {
      user_id: userId,
      block_id: blockId,
      endpoint: "/api/time-blocks/[id]/delete",
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
