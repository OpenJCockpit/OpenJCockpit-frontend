import { useCan } from '@openjcockpit/hub-contract';
import { CONTROLTOWER_WRITE_ROLES } from './roles';

/** Whether the user may change ControlTower data; the backend enforces it, the UI hides what would answer 403. */
export function useWriteAccess(): boolean {
  return useCan(...CONTROLTOWER_WRITE_ROLES);
}
