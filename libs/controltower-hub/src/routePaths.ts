export const CONTROLTOWER_ROUTE = '/controltower';
export const CONTROLTOWER_INTERVIEWS_PATH = `${CONTROLTOWER_ROUTE}/interviews`;
export const CONTROLTOWER_SPECS_PATH = `${CONTROLTOWER_ROUTE}/specs`;
export const CONTROLTOWER_GRAPH_PATH = `${CONTROLTOWER_ROUTE}/graph`;
export const CONTROLTOWER_QUEUE_PATH = `${CONTROLTOWER_ROUTE}/queue`;
export const CONTROLTOWER_TEMPLATES_PATH = `${CONTROLTOWER_ROUTE}/templates`;
/** The host's project settings section that links a Git repository to the selected project. */
export const CONTROLTOWER_REPOSITORY_SETTINGS_PATH = '/project-settings/controltower-repository';
/** The Cockpit spec queue app, where dispatched specs continue. */
export const SPEC_QUEUE_PATH = '/spec-queue';
/** The detail screen of one interview. */
export const interviewPath = (interviewId: string) =>
  `${CONTROLTOWER_INTERVIEWS_PATH}/${encodeURIComponent(interviewId)}`;
/** The detail screen of one specification. */
export const specPath = (specId: string) =>
  `${CONTROLTOWER_SPECS_PATH}/${encodeURIComponent(specId)}`;
