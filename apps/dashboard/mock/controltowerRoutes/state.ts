import { type Rec, findBy, nextId } from '../store';
import { SEED_ANSWERS, SEED_SPECS, initialSpecTemplates, initialTemplates } from './seedData';

export const repositories: Rec[] = [];
export const templates: Rec[] = initialTemplates;
export const specTemplates: Rec[] = initialSpecTemplates;
export const interviews: Rec[] = [];
export const specs: Rec[] = [];

/** Fills a new mock repository with interviews and specs in every status, so every page has something to show. */
export function seedRepository(projectId: string) {
  const ids = new Map<string, string>();
  const kickoffInterviewId = nextId('ct-interview');
  for (const seed of SEED_SPECS) ids.set(seed.key, nextId('ct-spec'));
  for (const seed of SEED_SPECS) {
    specs.push({
      id: ids.get(seed.key),
      projectId,
      title: seed.title,
      slug: seed.key,
      status: seed.status,
      body: seed.body,
      dependsOn: seed.dependsOn.map((d) => ids.get(d) ?? d),
      specPath: `docs/specs/${seed.key}.md`,
      branch: seed.status === 'DRAFT' ? null : `spec/${seed.key}`,
      interviewId: kickoffInterviewId,
    });
  }
  interviews.push(
    {
      id: kickoffInterviewId,
      projectId,
      templateId: 'tpl-project',
      kind: 'PROJECT',
      title: 'Field service app kick-off',
      status: 'GENERATED',
      answers: SEED_ANSWERS.map(([questionId, question, answer]) => ({
        questionId,
        question,
        answer,
      })),
      questionIndex: 4,
      followUps: 1,
      currentQuestion: '',
    },
    {
      id: nextId('ct-interview'),
      projectId,
      templateId: 'tpl-feature',
      kind: 'FEATURE',
      title: 'Photo attachments',
      status: 'COMPLETE',
      answers: [
        {
          questionId: 'behaviour',
          question: 'Describe the behaviour the feature should have.',
          answer: 'Technicians attach photos to a work order.',
        },
        {
          questionId: 'acceptance',
          question: 'How will we know it works? List acceptance criteria.',
          answer: 'Up to 10 photos; each under 5 MB.',
        },
      ],
      questionIndex: 3,
      followUps: 0,
      currentQuestion: '',
    },
    {
      id: nextId('ct-interview'),
      projectId,
      templateId: 'tpl-feature',
      kind: 'FEATURE',
      title: 'Customer signature on completion',
      status: 'ACTIVE',
      answers: [
        {
          questionId: 'behaviour',
          question: 'Describe the behaviour the feature should have.',
          answer: 'The customer signs on the technician device.',
        },
      ],
      questionIndex: 1,
      followUps: 0,
      currentQuestion: 'How will we know it works? List acceptance criteria.',
    },
  );
}

/** A spec is ready when it is approved and every dependency exists and is done. */
export const isReady = (s: Rec, own: Rec[]) =>
  s.status === 'APPROVED' &&
  (s.dependsOn as string[]).every((d) => own.find((o) => o.id === d)?.status === 'DONE');

export const byProject = (list: Rec[], projectId: string) =>
  list.filter((e) => e.projectId === projectId);
export const interview = (id: string) => findBy(interviews, 'id', id, 'Interview');
export const spec = (id: string) => findBy(specs, 'id', id, 'Spec');
