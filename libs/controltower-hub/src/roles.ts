import { ADMIN_PERMISSION } from '@openjcockpit/hub-contract';

/**
 * Realm roles that may change data. Same as the ControlTower backend defaults
 * (`CONTROLTOWER_EDITOR_ROLE` and `CONTROLTOWER_ADMIN_ROLE`); the backend enforces them, the UI only hides what would answer 403.
 */
export const CONTROLTOWER_WRITE_ROLES: readonly string[] = [
  'openjcockpit-operator',
  ADMIN_PERMISSION,
];

/** Realm roles that may change the policy settings. */
export const CONTROLTOWER_ADMIN_ROLES: readonly string[] = [ADMIN_PERMISSION];
