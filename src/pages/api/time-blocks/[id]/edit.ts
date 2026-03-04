import type { APIRoute } from "astro";
import { ServerAuth } from "../../../../lib/auth/simple-multi-user";
import type {
  TimeBlockEdit,
  EditResult,
  TimeBlockConflict,
} from "../../../../types/triage";
import type { TimeBlock } from "../../../../types/daily-plan";
import {
  handleApiError,
  logError,
  withFallback,
} from "../../../../lib/triage/error-handler";

/**
 * PATCH /api/time-blocks/[id]/edit
 *
 * Edit a time block (anchor or chain step) with conflict detection and cascade
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5
 *
 * Inline editing allows users to adjust anchor times and step durations.
 * Changes cascade to subsequent blocks in the same chain to maintain continuity.
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
    const edit = body as Partial<TimeBlockEdit>;

    // Validate at least one field is provided
    if (
      !edit.start_time &&
      !edit.end_time &&
      !edit.activity_name &&
      !edit.duration &&
      !edit.location
    ) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message:
            "At least one field must be provided: start_time, end_time, activity_name, duration, or location",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate duration if provided (5-480 minutes)
    if (
      edit.duration !== undefined &&
      (edit.duration < 5 || edit.duration > 480)
    ) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Duration must be between 5 and 480 minutes",
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

    // Calculate new start_time and end_time
    let newStartTime = edit.start_time
      ? new Date(edit.start_time)
      : new Date(timeBlock.start_time);
    let newEndTime = edit.end_time
      ? new Date(edit.end_time)
      : new Date(timeBlock.end_time);

    // If duration is provided, recalculate end_time
    if (edit.duration !== undefined) {
      newEndTime = new Date(newStartTime.getTime() + edit.duration * 60000);
    }

    // Validate end_time is after start_time
    if (newEndTime <= newStartTime) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "End time must be after start time",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check for time conflicts with other anchors
    const conflicts = await detectConflicts(
      serverAuth.supabase,
      timeBlock.plan_id,
      blockId,
      newStartTime,
      newEndTime,
    );

    // If conflicts exist, return them without updating
    if (conflicts.length > 0) {
      return new Response(
        JSON.stringify({
          error: "ConflictError",
          message: "The new time overlaps with another anchor",
          conflicts,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Prepare update data
    const updateData: any = {
      start_time: newStartTime.toISOString(),
      end_time: newEndTime.toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update activity_name if provided
    if (edit.activity_name !== undefined) {
      updateData.activity_name = edit.activity_name;
    }

    // Update location in metadata if provided
    if (edit.location !== undefined) {
      const metadata = timeBlock.metadata || {};
      metadata.location = edit.location;
      updateData.metadata = metadata;
    }

    // Update time_block in database
    const { data: updatedBlock, error: updateError } = await serverAuth.supabase
      .from("time_blocks")
      .update(updateData)
      .eq("id", blockId)
      .select()
      .single();

    if (updateError || !updatedBlock) {
      throw new Error(updateError?.message || "Failed to update time block");
    }

    // Cascade time changes to subsequent blocks in same chain with graceful fallback
    const updatedBlocks = await withFallback(
      () =>
        cascadeTimeChanges(
          serverAuth.supabase,
          timeBlock,
          updatedBlock,
          newStartTime,
          newEndTime,
        ),
      [],
      {
        user_id: userId,
        block_id: blockId,
        endpoint: "/api/time-blocks/[id]/edit",
        operation: "cascade_time_changes",
      },
    );

    // Convert to TimeBlock format for response
    const responseBlock: TimeBlock = {
      id: updatedBlock.id,
      planId: updatedBlock.plan_id,
      startTime: new Date(updatedBlock.start_time),
      endTime: new Date(updatedBlock.end_time),
      activityType: updatedBlock.activity_type,
      activityName: updatedBlock.activity_name,
      activityId: updatedBlock.activity_id,
      isFixed: updatedBlock.is_fixed,
      sequenceOrder: updatedBlock.sequence_order,
      status: updatedBlock.status,
      skipReason: updatedBlock.skip_reason,
      metadata: updatedBlock.metadata,
      createdAt: new Date(updatedBlock.created_at),
      updatedAt: new Date(updatedBlock.updated_at),
    };

    // Return updated block, updated_blocks array, and conflicts array
    const result: EditResult = {
      updated_block: responseBlock,
      updated_blocks: updatedBlocks,
      conflicts: [],
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const context = {
      user_id: userId,
      block_id: blockId,
      endpoint: "/api/time-blocks/[id]/edit",
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
 * Detect time conflicts with other anchors
 *
 * Requirement 18.4: Validate that new anchor time does not conflict with other anchors
 *
 * @param supabase - Supabase client
 * @param planId - Plan ID
 * @param blockId - Block ID being edited (to exclude from conflict check)
 * @param newStartTime - New start time
 * @param newEndTime - New end time
 * @returns Array of conflicts
 */
async function detectConflicts(
  supabase: any,
  planId: string,
  blockId: string,
  newStartTime: Date,
  newEndTime: Date,
): Promise<TimeBlockConflict[]> {
  try {
    // Fetch all anchor blocks in the same plan (excluding the one being edited)
    const { data: anchors, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("plan_id", planId)
      .neq("id", blockId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching anchors for conflict detection:", error);
      return [];
    }

    if (!anchors || anchors.length === 0) {
      return [];
    }

    // Check for overlaps with anchors only
    const conflicts: TimeBlockConflict[] = [];

    for (const anchor of anchors) {
      // Only check conflicts with anchor blocks
      if (anchor.metadata?.role?.type !== "anchor") {
        continue;
      }

      const anchorStart = new Date(anchor.start_time);
      const anchorEnd = new Date(anchor.end_time);

      // Check for overlap: (newStart < anchorEnd) AND (newEnd > anchorStart)
      if (newStartTime < anchorEnd && newEndTime > anchorStart) {
        conflicts.push({
          block_id: anchor.id,
          type: "overlap",
          message: `Overlaps with anchor "${anchor.activity_name}" at ${anchorStart.toLocaleTimeString()} - ${anchorEnd.toLocaleTimeString()}`,
        });
      }
    }

    return conflicts;
  } catch (error) {
    console.error("Error detecting conflicts:", error);
    return [];
  }
}

/**
 * Cascade time changes to subsequent blocks in same chain
 *
 * Requirement 19.3: When user changes step duration, recalculate all subsequent step times
 *
 * @param supabase - Supabase client
 * @param originalBlock - Original block before edit
 * @param updatedBlock - Updated block after edit
 * @param newStartTime - New start time
 * @param newEndTime - New end time
 * @returns Array of updated blocks
 */
async function cascadeTimeChanges(
  supabase: any,
  originalBlock: any,
  updatedBlock: any,
  newStartTime: Date,
  newEndTime: Date,
): Promise<TimeBlock[]> {
  try {
    // Calculate time delta (how much the end time changed)
    const originalEndTime = new Date(originalBlock.end_time);
    const timeDelta = newEndTime.getTime() - originalEndTime.getTime();

    // If no time change, no cascade needed
    if (timeDelta === 0) {
      return [];
    }

    // Get chain_id or anchor_id to identify related blocks
    const chainId = updatedBlock.metadata?.chain_id;
    const anchorId = updatedBlock.metadata?.anchor_id;

    if (!chainId && !anchorId) {
      // Not part of a chain, no cascade needed
      return [];
    }

    // Fetch all blocks in the same chain that come after this block
    const { data: chainBlocks, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("plan_id", updatedBlock.plan_id)
      .gt("start_time", originalBlock.start_time)
      .order("start_time", { ascending: true });

    if (error || !chainBlocks) {
      console.error("Error fetching chain blocks for cascade:", error);
      return [];
    }

    // Filter blocks that are part of the same chain or commitment envelope
    const subsequentBlocks = chainBlocks.filter((block: any) => {
      if (chainId && block.metadata?.chain_id === chainId) {
        return true;
      }
      if (anchorId && block.metadata?.anchor_id === anchorId) {
        return true;
      }
      return false;
    });

    if (subsequentBlocks.length === 0) {
      return [];
    }

    // Update each subsequent block by shifting its times
    const updatedBlocks: TimeBlock[] = [];

    for (const block of subsequentBlocks) {
      const blockStartTime = new Date(block.start_time);
      const blockEndTime = new Date(block.end_time);

      const newBlockStartTime = new Date(blockStartTime.getTime() + timeDelta);
      const newBlockEndTime = new Date(blockEndTime.getTime() + timeDelta);

      const { data: updated, error: updateError } = await supabase
        .from("time_blocks")
        .update({
          start_time: newBlockStartTime.toISOString(),
          end_time: newBlockEndTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", block.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          `Error updating block ${block.id} during cascade:`,
          updateError,
        );
        continue;
      }

      if (updated) {
        updatedBlocks.push({
          id: updated.id,
          planId: updated.plan_id,
          startTime: new Date(updated.start_time),
          endTime: new Date(updated.end_time),
          activityType: updated.activity_type,
          activityName: updated.activity_name,
          activityId: updated.activity_id,
          isFixed: updated.is_fixed,
          sequenceOrder: updated.sequence_order,
          status: updated.status,
          skipReason: updated.skip_reason,
          metadata: updated.metadata,
          createdAt: new Date(updated.created_at),
          updatedAt: new Date(updated.updated_at),
        });
      }
    }

    return updatedBlocks;
  } catch (error) {
    console.error("Error cascading time changes:", error);
    return [];
  }
}
