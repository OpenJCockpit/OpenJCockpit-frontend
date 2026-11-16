/** TanStack Query keys shared across features; build keys here so cache reads, writes and invalidations cannot drift apart. */
export const queryKeys = {
  workspace: (customerId: string) => ['workspace', customerId] as const,
  projectSpecs: (projectId: string) => ['project-specs', projectId] as const,
  projectSpecFiles: (projectId: string | null) => ['project-specs', projectId, 'files'] as const,
  specQueue: (projectId: string | null) => ['spec-queue', projectId, 'queue'] as const,
  specQueueSpecFiles: (projectId: string) => ['spec-queue', projectId, 'spec-files'] as const,
  specQueueSettings: (projectId: string) => ['spec-queue', projectId, 'settings'] as const,
  controlTowerProjects: ['controltower', 'projects'] as const,
  controlTowerProject: (cockpitProjectId: string | null) =>
    ['controltower', 'projects', cockpitProjectId] as const,
  controlTowerTemplates: ['controltower', 'templates'] as const,
  controlTowerSpecTemplates: ['controltower', 'spec-templates'] as const,
  controlTowerInterviews: (projectId: string | null) =>
    ['controltower', projectId, 'interviews'] as const,
  controlTowerInterview: (interviewId: string) =>
    ['controltower', 'interview', interviewId] as const,
  controlTowerSpecs: (projectId: string | null) => ['controltower', projectId, 'specs'] as const,
  controlTowerGraph: (projectId: string | null) => ['controltower', projectId, 'graph'] as const,
  controlTowerQueue: (projectId: string | null) => ['controltower', projectId, 'queue'] as const,
  controlTowerSettings: ['controltower', 'settings'] as const,
  workflows: ['workflows'] as const,
  workflowGroups: ['workflow-groups'] as const,
  linkableAgents: ['linkable-agents'] as const,
  workflow: (workflowId: string) => ['workflow', workflowId] as const,
  jiraConfig: (projectId: string) => ['jira-config', projectId] as const,
  hermesConfig: (projectId: string) => ['hermes-config', projectId] as const,
  documentFolderConfig: (projectId: string) => ['document-folder-config', projectId] as const,
};
