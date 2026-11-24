import type { EvidenceStatus } from '@openjcockpit/api';

/** Decorative status glyphs, not translatable copy. */
export const STATUS_GLYPHS: Record<EvidenceStatus, string> = {
  ok: '✓',
  running: '…',
  waiting: '⏸',
  failed: '✕',
};
