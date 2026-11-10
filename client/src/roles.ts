import { MeResponse, ScreenId } from './types';

export const ROLE_SCREENS: Record<MeResponse['role'], ScreenId[]> = {
  trader: ['desk', 'active-settlements', 'paypal-ledger', 'bryntum-timeline', 'fabric-explorer', 'ai-swarm', 'channel3-sourcing', 'new-trade', 'trade-detail'],
  approver: ['active-settlements', 'paypal-ledger', 'bryntum-timeline', 'fabric-explorer', 'trade-detail'],
  regulator: ['regulator', 'fabric-explorer', 'ai-auditor'],
  auditor: ['auditor', 'fabric-explorer', 'ai-auditor', 'elastic-audit', 'trade-detail'],
};

export const HOME_SCREEN: Record<MeResponse['role'], ScreenId> = {
  trader: 'desk', approver: 'active-settlements', regulator: 'regulator', auditor: 'auditor',
};

export function canOpen(me: MeResponse | null, screen: ScreenId): boolean {
  return Boolean(me && ROLE_SCREENS[me.role].includes(screen));
}
