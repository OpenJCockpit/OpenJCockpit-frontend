import type { ControlTowerQuestion, ControlTowerTemplateKind } from '@openjcockpit/api';

// Starting points for the JSON editor; the questions are data the backend stores, not UI copy.
const question = (id: string, text: string, completionCriteria: string): ControlTowerQuestion => ({
  id,
  text,
  required: true,
  maxFollowUps: 2,
  completionCriteria,
});

export function sampleQuestions(kind: ControlTowerTemplateKind): ControlTowerQuestion[] {
  return kind === 'PROJECT'
    ? [
        question(
          'goal',
          'What is the intended project outcome and who is it for?',
          'Measurable project goal with target audience',
        ),
        question(
          'scope',
          'What is explicitly in and out of scope?',
          'Concrete scope and non-goals',
        ),
        question(
          'quality',
          'Which security, integration and quality criteria are required?',
          'Concrete technical constraints',
        ),
      ]
    : [
        question(
          'goal',
          'What exactly should this feature solve, and for which user?',
          'User goal and value',
        ),
        question(
          'behavior',
          'Describe the desired workflow, including failure scenarios.',
          'Happy path and failure paths',
        ),
        question(
          'acceptance',
          'How can we objectively test that this is done?',
          'Measurable acceptance criteria',
        ),
      ];
}

export const DEFAULT_SPEC_TEMPLATE = `---
spec_id: {{SPEC_ID}}
workflow_id: {{WORKFLOW_ID}}
dependencies: {{DEPENDENCIES}}
---
# {{TITLE}}
{{SUMMARY}}
## Acceptance
{{ACCEPTANCE_CRITERIA}}`;
