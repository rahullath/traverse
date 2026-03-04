import type { APIRoute } from "astro";
import { ServerAuth } from "../../../../lib/auth/simple-multi-user";
import type { CompletionUpdate } from "../../../../types/triage";
import type { BlockStatus } from "../../../../types/daily-plan";
import {
  handleApiError,
  logError,
  validateRequired,
  withFallback,
} from "../../../../lib/triage/error-handler";

/**
 * PATCH /api/time-blocks/[id]/complete
 *
 * Mark a time block as completed or skipped
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 23.1, 23.2, 23.3
 *
 * Completion tracking persists to database and is restored on page reload
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
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

    // Parse request body
    const body = await request.json();
    const { status, skip_reason } = body as Partial<CompletionUpdate>;

    // Validate required fields
    const validation = validateRequired(body, ["status"]);
    if (!validation.valid) {
      return new Response(JSON.stringify(validation.error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate status
    const validStatuses: BlockStatus[] = ["completed", "skipped"];
    if (!validStatuses.includes(status!)) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: 'Status must be either "completed" or "skipped"',
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate skip_reason required if status is skipped
    if (status === "skipped" && !skip_reason) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: 'skip_reason is required when status is "skipped"',
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
          message: "You do not have permission to modify this time block",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add skip_reason if status is skipped
    if (status === "skipped" && skip_reason) {
      updateData.skip_reason = skip_reason;
    }

    // Add completion metadata
    const metadata = timeBlock.metadata || {};
    if (status === "completed") {
      metadata.completed_at = new Date().toISOString();
      metadata.completed_by = user.id;
    }
    updateData.metadata = metadata;

    // Update status and skip_reason in database
    const { data: updatedBlock, error: updateError } = await serverAuth.supabase
      .from("time_blocks")
      .update(updateData)
      .eq("id", blockId)
      .select()
      .single();

    if (updateError || !updatedBlock) {
      throw new Error(updateError?.message || "Failed to update time block");
    }

    // Calculate remaining time until deadline with graceful fallback
    const remainingTime = await withFallback(
      () => calculateRemainingTime(serverAuth.supabase, updatedBlock),
      null,
      {
        user_id: userId,
        block_id: blockId,
        endpoint: "/api/time-blocks/[id]/complete",
        operation: "calculate_remaining_time",
      },
    );

    // Return updated block and remaining_time
    return new Response(
      JSON.stringify({
        updated_block: {
          id: updatedBlock.id,
          plan_id: updatedBlock.plan_id,
          start_time: updatedBlock.start_time,
          end_time: updatedBlock.end_time,
          activity_type: updatedBlock.activity_type,
          activity_name: updatedBlock.activity_name,
          activity_id: updatedBlock.activity_id,
          is_fixed: updatedBlock.is_fixed,
          sequence_order: updatedBlock.sequence_order,
          status: updatedBlock.status,
          skip_reason: updatedBlock.skip_reason,
          metadata: updatedBlock.metadata,
        },
        remaining_time: remainingTime,
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
      endpoint: "/api/time-blocks/[id]/complete",
      method: "PATCH",
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
 * Calculate remaining time until deadline
 *
 * Requirement 17.5: Recalculate remaining time until deadline after completion
 *
 * Deadline is the end_time of the last prep/activation step before travel_there
 * in the commitment envelope
 *
 * @param supabase - Supabase client
 * @param timeBlock - The time block that was just completed
 * @returns Remaining time in minutes, or null if no deadline
 */
async function calculateRemainingTime(
  supabase: any,
  timeBlock: any,
): Promise<number | null> {
  try {
    // If this block doesn't have an anchor_id, no deadline to calculate
    const anchorId = timeBlock.metadata?.anchor_id;
    if (!anchorId) {
      return null;
    }

    // Fetch all blocks in the same commitment envelope
    const { data: envelopeBlocks, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("plan_id", timeBlock.plan_id)
      .order("start_time", { ascending: true });

    if (error || !envelopeBlocks) {
      console.error("Error fetching envelope blocks:", error);
      return null;
    }

    // Find blocks related to this anchor
    const anchorBlocks = envelopeBlocks.filter(
      (block: any) =>
        block.metadata?.anchor_id === anchorId ||
        (block.activity_id === anchorId &&
          block.metadata?.role?.type === "anchor"),
    );

    // Find the last prep/activation step before travel_there
    // Envelope types: prep, travel_there, anchor, travel_back, recovery
    const prepBlocks = anchorBlocks.filter(
      (block: any) =>
        block.metadata?.commitment_envelope?.envelope_type === "prep",
    );

    if (prepBlocks.length === 0) {
      // No prep blocks, deadline is start of travel_there or anchor
      const travelBlock = anchorBlocks.find(
        (block: any) =>
          block.metadata?.commitment_envelope?.envelope_type === "travel_there",
      );

      if (travelBlock) {
        const deadline = new Date(travelBlock.start_time);
        const now = new Date();
        const remainingMinutes = Math.floor(
          (deadline.getTime() - now.getTime()) / 60000,
        );
        return remainingMinutes;
      }

      // No travel block, deadline is start of anchor
      const anchorBlock = anchorBlocks.find(
        (block: any) => block.metadata?.role?.type === "anchor",
      );

      if (anchorBlock) {
        const deadline = new Date(anchorBlock.start_time);
        const now = new Date();
        const remainingMinutes = Math.floor(
          (deadline.getTime() - now.getTime()) / 60000,
        );
        return remainingMinutes;
      }

      return null;
    }

    // Get the last prep block (highest end_time)
    const lastPrepBlock = prepBlocks.reduce((latest: any, current: any) => {
      const latestEnd = new Date(latest.end_time);
      const currentEnd = new Date(current.end_time);
      return currentEnd > latestEnd ? current : latest;
    });

    // Deadline is the end_time of the last prep block
    const deadline = new Date(lastPrepBlock.end_time);
    const now = new Date();
    const remainingMinutes = Math.floor(
      (deadline.getTime() - now.getTime()) / 60000,
    );

    return remainingMinutes;
  } catch (error) {
    console.error("Error calculating remaining time:", error);
    return null;
  }
}
