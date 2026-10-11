import type { TimeBlock } from '@/types/daily-plan';
import type { BlockState } from '@/components/tv/Block';

export function deriveBlockState(block: TimeBlock, now: Date): BlockState {
  if (block.status === 'completed' || block.status === 'skipped') return 'past';
  const start = new Date(block.startTime);
  const end = new Date(block.endTime);
  if (now >= start && now < end) return 'now';
  return 'future';
}

export function blockEnv(block: TimeBlock): string {
  const role = block.metadata?.role?.type;
  if (role === 'anchor') return 'anchor';
  if (role === 'exit-gate') return 'prep · exit';
  if (role === 'recovery') return 'recovery';
  const t = block.activityType;
  if (t === 'travel') return 'travel';
  if (t === 'meal') return 'meal';
  if (t === 'buffer') return 'buffer';
  if (t === 'routine') return 'wake ramp';
  return t;
}

export function isKeystoneBlock(block: TimeBlock): boolean {
  return block.metadata?.triage?.is_keystone ?? false;
}
