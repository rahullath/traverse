import type { APIRoute } from "astro";
import { ServerAuth } from "../../../lib/auth/simple-multi-user";
import type { TimeBlock } from "../../../types/daily-plan";

/**
 * POST /api/time-blocks/insert
 *
 * Insert a custom step into the timeline
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 *
 * Allows users to add custom steps between existing time blocks.
 * The insertion cascades times for all subsequent blocks to maintain continuity.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user
    const serverAuth = new ServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Parse request body
    const body = await request.json();
    const { activity_name, duration, insert_after_id } = body;

    // Validate activity_name
    if (
      !activity_name ||
      typeof activity_name !== "string" ||
      activity_name.trim().length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid activity_name",
          details: "activity_name is required and must be a non-empty string",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate duration (5-480 minutes)
    if (
      !duration ||
      typeof duration !== "number" ||
      duration < 5 ||
      duration > 480
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid duration",
          details: "duration is required and must be between 5 and 480 minutes",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate insert_after_id
    if (!insert_after_id || typeof insert_after_id !== "string") {
      return new Response(
        JSON.stringify({
          error: "Invalid insert_after_id",
          details: "insert_after_id is required and must be a string",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Fetch the block to insert after and verify user ownership
    const { data: afterBlock, error: fetchError } = await serverAuth.supabase
      .from("time_blocks")
      .select("*, daily_plans!inner(user_id)")
      .eq("id", insert_after_id)
      .single();

    if (fetchError || !afterBlock) {
      return new Response(
        JSON.stringify({
          error: "Block not found",
          details: `No time block found with id ${insert_after_id}`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify user ownership
    if (afterBlock.daily_plans.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "You do not have permission to modify this plan",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Calculate new block times
    const afterBlockEndTime = new Date(afterBlock.end_time);
    const newBlockStartTime = afterBlockEndTime;
    const newBlockEndTime = new Date(
      newBlockStartTime.getTime() + duration * 60000,
    );

    // Get the next block's sequence order to insert between
    const { data: nextBlock } = await serverAuth.supabase
      .from("time_blocks")
      .select("*")
      .eq("plan_id", afterBlock.plan_id)
      .gt("sequence_order", afterBlock.sequence_order)
      .order("sequence_order", { ascending: true })
      .limit(1)
      .single();

    // Calculate sequence order for new block (between afterBlock and nextBlock)
    const newSequenceOrder = nextBlock
      ? (afterBlock.sequence_order + nextBlock.sequence_order) / 2
      : afterBlock.sequence_order + 1;

    // Create new time_block
    const { data: newBlock, error: insertError } = await serverAuth.supabase
      .from("time_blocks")
      .insert({
        plan_id: afterBlock.plan_id,
        start_time: newBlockStartTime.toISOString(),
        end_time: newBlockEndTime.toISOString(),
        activity_type: "custom",
        activity_name: activity_name.trim(),
        activity_id: null,
        is_fixed: false,
        sequence_order: newSequenceOrder,
        status: "pending",
        metadata: {
          role: {
            type: "chain-step",
            required: false,
          },
          custom_step: true,
          inserted_by: user.id,
          inserted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertError || !newBlock) {
      console.error("Error inserting time block:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to insert time block",
          details: insertError?.message || "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Cascade times for subsequent blocks
    const updatedBlocks = await cascadeTimesAfterInsertion(
      serverAuth.supabase,
      afterBlock.plan_id,
      afterBlockEndTime,
      duration,
    );

    // Convert to TimeBlock format for response
    const responseBlock: TimeBlock = {
      id: newBlock.id,
      planId: newBlock.plan_id,
      startTime: new Date(newBlock.start_time),
      endTime: new Date(newBlock.end_time),
      activityType: newBlock.activity_type,
      activityName: newBlock.activity_name,
      activityId: newBlock.activity_id,
      isFixed: newBlock.is_fixed,
      sequenceOrder: newBlock.sequence_order,
      status: newBlock.status,
      skipReason: newBlock.skip_reason,
      metadata: newBlock.metadata,
      createdAt: new Date(newBlock.created_at),
      updatedAt: new Date(newBlock.updated_at),
    };

    // Return new block and updated_blocks array
    return new Response(
      JSON.stringify({
        new_block: responseBlock,
        updated_blocks: updatedBlocks,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error inserting time block:", error);

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
        error: "Failed to insert time block",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

/**
 * Cascade times for subsequent blocks after insertion
 *
 * Requirement 19.3: Insert step and cascade subsequent times
 *
 * @param supabase - Supabase client
 * @param planId - Plan ID
 * @param insertionPoint - Time point where insertion occurred
 * @param durationMinutes - Duration of inserted block in minutes
 * @returns Array of updated blocks
 */
async function cascadeTimesAfterInsertion(
  supabase: any,
  planId: string,
  insertionPoint: Date,
  durationMinutes: number,
): Promise<TimeBlock[]> {
  try {
    // Calculate time delta (how much to shift subsequent blocks)
    const timeDelta = durationMinutes * 60000; // Convert to milliseconds

    // Fetch all blocks that start at or after the insertion point
    const { data: subsequentBlocks, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("plan_id", planId)
      .gte("start_time", insertionPoint.toISOString())
      .order("start_time", { ascending: true });

    if (error || !subsequentBlocks) {
      console.error("Error fetching subsequent blocks for cascade:", error);
      return [];
    }

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
    console.error("Error cascading times after insertion:", error);
    return [];
  }
}
