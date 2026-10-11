export type RouteKey = 'today' | 'plan' | 'clinical' | 'settings';

export interface NavRoute {
  key: RouteKey;
  label: string;
  href: string;
  desc: string;
}

export const ROUTES: NavRoute[] = [
  { key: 'today',    label: 'Today',    href: '/today',    desc: 'live runtime' },
  { key: 'plan',     label: 'Plan',     href: '/plan',     desc: 'build a chain' },
  { key: 'clinical', label: 'Clinical', href: '/clinical', desc: 'NHS surface' },
  { key: 'settings', label: 'Settings', href: '/settings', desc: 'comfort & focus' },
];
