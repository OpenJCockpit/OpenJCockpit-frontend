import { ActionFeedback } from '../ActionFeedback';
import { useAction } from '../useAction';
import { QuestionTemplatesPanel } from './QuestionTemplatesPanel';
import { SpecTemplatesPanel } from './SpecTemplatesPanel';

/** Interview questionnaires and spec file templates. Global: they are shared by every repository. */
export function TemplatesPage() {
  const { run, feedback, clear } = useAction();
  return (
    <>
      <ActionFeedback feedback={feedback} onDismiss={clear} />
      <QuestionTemplatesPanel run={run} />
      <SpecTemplatesPanel run={run} />
    </>
  );
}
