import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../../lib/supabase/server';
import {
  createTimeBlocks,
  getDailyPlan,
  getDailyPlanByDate,
  getTimeBlocksByPlan,
} from '../../../../../lib/daily-plan/database';
import type { CreateTimeBlock } from '../../../../../types/daily-plan';

type CollapseTriggerReason = 'missed_anchor' | 'manual_chaos' | 'late_start';

const DEFAULT_RECOVERY_STEPS = [
  { key: 'hydrate', name: 'Eat or hydrate', durationMinutes: 8 },
  { key: 'hygiene', name: 'Bathroom and basic hygiene', durationMinutes: 12 },
  { key: 'reset', name: 'Reset environment', durationMinutes: 5 },
  { key: 'next-win', name: 'Pick one tiny next win', durationMinutes: 10 },
];

function parseTriggerReason(value: unknown): CollapseTriggerReason {
  if (value === 'missed_anchor' || value === 'late_start') return value;
  return 'manual_chaos';
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
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
      // Recover from stale plan references by resolving today's plan for this user.
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

    const body = await request.json().catch(() => ({}));
    const triggerReason = parseTriggerReason(body?.trigger_reason);
    const resolvedPlanId = plan.id;
    const chainId = `collapse-${resolvedPlanId}`;

    const existingBlocks = await getTimeBlocksByPlan(supabase, resolvedPlanId);
    const recoveryBlocks = existingBlocks.filter((block) => {
      const metadata = (block.metadata || {}) as Record<string, any>;
      return metadata.role?.type === 'recovery' && metadata.role?.recovery_kind === 'collapse';
    });

    if (recoveryBlocks.length === 0) {
      const baseStart = new Date(Math.max(Date.now(), plan.planStart.getTime()));
      let cursor = new Date(baseStart);
      const maxSequenceOrder = existingBlocks.reduce((max, block) => Math.max(max, block.sequenceOrder), 0);

      const inserts: CreateTimeBlock[] = DEFAULT_RECOVERY_STEPS.map((step, index) => {
        const startTime = new Date(cursor);
        const endTime = addMinutes(startTime, step.durationMinutes);
        cursor = endTime;

        return {
          plan_id: resolvedPlanId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          activity_type: 'routine',
          activity_name: step.name,
          activity_id: crypto.randomUUID(),
          is_fixed: false,
          sequence_order: maxSequenceOrder + index + 1,
          status: 'pending',
          skip_reason: null,
          metadata: {
            chain_id: chainId,
            step_id: `${chainId}-${step.key}`,
            role: {
              type: 'recovery',
              required: true,
              chain_id: chainId,
              recovery_kind: 'collapse',
            },
          } as any,
        };
      });

      await createTimeBlocks(supabase, inserts);
    }

    const { data: planRow, error: rowError } = await supabase
      .from('daily_plans')
      .select('metadata')
      .eq('id', resolvedPlanId)
      .eq('user_id', user.id)
      .single();

    if (rowError) throw rowError;

    const existingMetadata = ((planRow as any)?.metadata || {}) as Record<string, any>;
    const collapseMode = {
      ...(existingMetadata.collapse_mode || {}),
      active: true,
      trigger_reason: triggerReason,
      triggered_at: new Date().toISOString(),
      recovery_chain_id: chainId,
      deactivated_at: null,
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
      collapse_mode: collapseMode,
      message: 'Collapse mode activated',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error activating collapse mode:', error);
    return new Response(JSON.stringify({
      error: 'Failed to activate collapse mode',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
