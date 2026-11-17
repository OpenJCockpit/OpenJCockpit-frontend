import { describe, expect, it } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  it('builds project-scoped keys', () => {
    expect(queryKeys.workspace('c1')).toEqual(['workspace', 'c1']);
    expect(queryKeys.projectSpecs('p1')).toEqual(['project-specs', 'p1']);
    expect(queryKeys.projectSpecFiles('p1')).toEqual(['project-specs', 'p1', 'files']);
    expect(queryKeys.specQueue('p1')).toEqual(['spec-queue', 'p1', 'queue']);
    expect(queryKeys.specQueueSpecFiles('p1')).toEqual(['spec-queue', 'p1', 'spec-files']);
    expect(queryKeys.specQueueSettings('p1')).toEqual(['spec-queue', 'p1', 'settings']);
    expect(queryKeys.jiraConfig('p1')).toEqual(['jira-config', 'p1']);
    expect(queryKeys.hermesConfig('p1')).toEqual(['hermes-config', 'p1']);
    expect(queryKeys.documentFolderConfig('p1')).toEqual(['document-folder-config', 'p1']);
  });

  it('builds workflow keys', () => {
    expect(queryKeys.workflows).toEqual(['workflows']);
    expect(queryKeys.workflowGroups).toEqual(['workflow-groups']);
    expect(queryKeys.linkableAgents).toEqual(['linkable-agents']);
    expect(queryKeys.workflow('w1')).toEqual(['workflow', 'w1']);
  });

  it('builds ControlTower keys under one prefix', () => {
    expect(queryKeys.controlTowerProjects).toEqual(['controltower', 'projects']);
    expect(queryKeys.controlTowerProject('c1')).toEqual(['controltower', 'projects', 'c1']);
    expect(queryKeys.controlTowerTemplates).toEqual(['controltower', 'templates']);
    expect(queryKeys.controlTowerSpecTemplates).toEqual(['controltower', 'spec-templates']);
    expect(queryKeys.controlTowerInterviews('p1')).toEqual(['controltower', 'p1', 'interviews']);
    expect(queryKeys.controlTowerInterview('i1')).toEqual(['controltower', 'interview', 'i1']);
    expect(queryKeys.controlTowerSpecs('p1')).toEqual(['controltower', 'p1', 'specs']);
    expect(queryKeys.controlTowerGraph('p1')).toEqual(['controltower', 'p1', 'graph']);
    expect(queryKeys.controlTowerQueue('p1')).toEqual(['controltower', 'p1', 'queue']);
    expect(queryKeys.controlTowerSettings).toEqual(['controltower', 'settings']);
  });

  it('keeps a missing project in the key', () => {
    expect(queryKeys.specQueue(null)).toEqual(['spec-queue', null, 'queue']);
  });
});
