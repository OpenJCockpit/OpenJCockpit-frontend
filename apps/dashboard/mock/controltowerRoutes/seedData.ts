import type { Rec } from '../store';

export const initialTemplates: Rec[] = [
  {
    id: 'tpl-project',
    name: 'New project',
    kind: 'PROJECT',
    questions: [
      {
        id: 'goal',
        text: 'What problem does this product solve?',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'States the problem and the audience.',
      },
      {
        id: 'users',
        text: 'Who are the main users and what do they do today?',
        required: true,
        maxFollowUps: 2,
        completionCriteria: 'Names at least one user group and their current workaround.',
      },
      {
        id: 'scope',
        text: 'What must the first release include, and what is explicitly out of scope?',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'Lists must-haves and at least one exclusion.',
      },
      {
        id: 'constraints',
        text: 'Are there technical, legal or deadline constraints?',
        required: false,
        maxFollowUps: 0,
        completionCriteria: 'Lists constraints or states that there are none.',
      },
    ],
  },
  {
    id: 'tpl-feature',
    name: 'New feature',
    kind: 'FEATURE',
    questions: [
      {
        id: 'behaviour',
        text: 'Describe the behaviour the feature should have.',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'Describes the expected behaviour in observable terms.',
      },
      {
        id: 'acceptance',
        text: 'How will we know it works? List acceptance criteria.',
        required: true,
        maxFollowUps: 1,
        completionCriteria: 'At least two testable criteria.',
      },
      {
        id: 'impact',
        text: 'Which existing parts of the product are affected?',
        required: false,
        maxFollowUps: 0,
        completionCriteria: 'Names the affected areas.',
      },
    ],
  },
  {
    id: 'tpl-bugfix',
    name: 'Bug triage',
    kind: 'FEATURE',
    questions: [
      {
        id: 'steps',
        text: 'What are the steps to reproduce the problem?',
        required: true,
        maxFollowUps: 2,
        completionCriteria: 'Gives numbered, reproducible steps.',
      },
    ],
  },
];
export const initialSpecTemplates: Rec[] = [
  { id: 'spec-default', name: 'Default', content: '# {{title}}\n', defaultTemplate: true },
  {
    id: 'spec-api',
    name: 'API endpoint',
    content: '# {{title}}\n\n## Request\n\n## Response\n\n## Errors\n',
    defaultTemplate: false,
  },
  {
    id: 'spec-ui',
    name: 'UI screen',
    content: '# {{title}}\n\n## Layout\n\n## States\n\n## Accessibility\n',
    defaultTemplate: false,
  },
];

export const SEED_ANSWERS: [string, string, string][] = [
  [
    'goal',
    'What problem does this product solve?',
    'Field technicians lose time on paper work orders.',
  ],
  [
    'users',
    'Who are the main users and what do they do today?',
    'Technicians and dispatchers; they use spreadsheets and phone calls.',
  ],
  [
    'scope',
    'What must the first release include, and what is explicitly out of scope?',
    'Work orders and offline sync. No invoicing.',
  ],
];

export interface SeedSpec {
  key: string;
  title: string;
  status: string;
  dependsOn: string[];
  body: string;
}
export const SEED_SPECS: SeedSpec[] = [
  {
    key: 'auth',
    title: 'User authentication',
    status: 'DONE',
    dependsOn: [],
    body: '# User authentication\n\nSign in with email and password, session tokens and logout.\n\n## Acceptance\n- Wrong password shows an error\n- Sessions expire after 8 hours\n',
  },
  {
    key: 'roles',
    title: 'Role-based access control',
    status: 'DONE',
    dependsOn: ['auth'],
    body: '# Role-based access control\n\nTechnician, dispatcher and admin roles.\n',
  },
  {
    key: 'workorders',
    title: 'Work order list and detail',
    status: 'DISPATCHED',
    dependsOn: ['auth'],
    body: '# Work order list and detail\n\nList, filter and open work orders.\n',
  },
  {
    key: 'offline',
    title: 'Offline sync',
    status: 'APPROVED',
    dependsOn: ['workorders'],
    body: '# Offline sync\n\nQueue edits locally and replay them when online.\n',
  },
  {
    key: 'attachments',
    title: 'Photo attachments',
    status: 'APPROVED',
    dependsOn: ['auth'],
    body: '# Photo attachments\n\nAttach up to 10 photos to a work order.\n',
  },
  {
    key: 'webhooks',
    title: 'Webhook notifications',
    status: 'APPROVED',
    dependsOn: ['roles'],
    body: '# Webhook notifications\n\nPost status changes to a configured URL.\n',
  },
  {
    key: 'reports',
    title: 'Weekly report export',
    status: 'DRAFT',
    dependsOn: ['workorders', 'roles'],
    body: '# Weekly report export\n\nCSV and PDF export per technician.\n',
  },
  {
    key: 'dashboard',
    title: 'Dispatcher dashboard',
    status: 'DRAFT',
    dependsOn: ['workorders', 'ghost-spec'],
    body: '# Dispatcher dashboard\n\nLive map and open work orders.\n',
  },
  {
    key: 'dark-mode',
    title: 'Dark mode',
    status: 'DRAFT',
    dependsOn: [],
    body: '# Dark mode\n\nFollow the system theme.\n',
  },
];
