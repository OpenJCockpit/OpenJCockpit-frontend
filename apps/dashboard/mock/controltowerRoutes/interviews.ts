import { type Rec, findBy, nextId } from '../store';
import { add, id0, str } from './router';
import { byProject, interview, interviews, specs, templates } from './state';

add('GET', '/projects/:id/interviews', ({ p }) => byProject(interviews, id0(p)));
add('GET', '/interviews/:id', ({ p }) => interview(id0(p)));
add('POST', '/interviews', ({ body }) => {
  const template = findBy(templates, 'id', str(body.templateId), 'Template');
  const questions = template.questions as Rec[];
  const created: Rec = {
    id: nextId('ct-interview'),
    projectId: str(body.projectId),
    templateId: template.id,
    kind: template.kind,
    title: str(body.featureRequest, str(template.name)),
    status: 'ACTIVE',
    answers: [],
    questionIndex: 0,
    followUps: 0,
    currentQuestion: str(questions[0]?.text),
  };
  interviews.push(created);
  return created;
});
add('POST', '/interviews/:id/answers', ({ p, body }) => {
  const current = interview(id0(p));
  const template = findBy(templates, 'id', str(current.templateId), 'Template');
  const questions = template.questions as Rec[];
  const answers = current.answers as Rec[];
  const asked = questions[current.questionIndex as number];
  answers.push({ questionId: asked?.id, question: asked?.text, answer: str(body.answer) });
  const next = (current.questionIndex as number) + 1;
  current.questionIndex = next;
  current.currentQuestion = str(questions[next]?.text);
  if (next >= questions.length) current.status = 'COMPLETE';
  return current;
});
add('POST', '/interviews/:id/generate', ({ p }) => {
  const current = interview(id0(p));
  const created: Rec = {
    id: nextId('ct-spec'),
    projectId: current.projectId,
    title: str(current.title),
    slug: nextId('spec'),
    status: 'DRAFT',
    body: '# Generated specification\n',
    dependsOn: [],
    specPath: 'docs/specs/generated.md',
    branch: null,
    interviewId: current.id,
  };
  specs.push(created);
  current.status = 'GENERATED';
  return [created];
});
