import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../../lib/supabase/server';
import { getDailyPlan, getDailyPlanByDate, getTimeBlocksByPlan, updateTimeBlock } from '../../../../../lib/daily-plan/database';

export const POST: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const planId = params.id;
    if (!planId) {
      return new Response(JSON.stringify({ error: 'Missing plan id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let plan = await getDailyPlan(supabase, planId);
    if (!plan) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      plan = await getDailyPlanByDate(supabase, user.id, today);
    }
    if (!plan) {
      return new Response(JSON.stringify({
        error: 'Plan not found',
        error_code: 'STALE_PLAN_REFERENCE',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (plan.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resolvedPlanId = plan.id;

    const blocks = await getTimeBlocksByPlan(supabase, resolvedPlanId);
    const recoveryBlocks = blocks.filter((block) => {
      const metadata = (block.metadata || {}) as Record<string, any>;
      return metadata.role?.type === 'recovery' && metadata.role?.recovery_kind === 'collapse';
    });

    for (const block of recoveryBlocks) {
      if (block.status === 'completed') continue;
      await updateTimeBlock(supabase, block.id, {
        status: 'completed',
        metadata: {
          ...(block.metadata || {}),
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        } as any,
      });
    }

    const { data: planRow, error: rowError } = await supabase
      .from('daily_plans')
      .select('metadata')
      .eq('id', resolvedPlanId)
      .eq('user_id', user.id)
      .single();
    if (rowError) throw rowError;

    const existingMetadata = ((planRow as any)?.metadata || {}) as Record<string, any>;
    const currentCollapseMode = (existingMetadata.collapse_mode || {}) as Record<string, any>;
    const collapseMode = {
      ...currentCollapseMode,
      active: false,
      recovery_completed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('daily_plans')
      .update({
        metadata: {
          ...existingMetadata,
          collapse_mode: collapseMode,
        } as any,
      })
      .eq('id', resolvedPlanId)
      .eq('user_id', user.id);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      ok: true,
      completed_blocks: recoveryBlocks.length,
      collapse_mode: collapseMode,
      message: 'Recovery chain completed',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error completing recovery chain:', error);
    return new Response(JSON.stringify({
      error: 'Failed to complete recovery chain',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
