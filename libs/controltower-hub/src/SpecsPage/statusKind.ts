import type { StatusKind } from '@openjcockpit/ui';
import type { ControlTowerSpecStatus } from '@openjcockpit/api';

export const STATUS_KIND: Record<ControlTowerSpecStatus, StatusKind> = {
  DRAFT: 'open',
  APPROVED: 'review',
  DISPATCHED: 'active',
  DONE: 'done',
};
