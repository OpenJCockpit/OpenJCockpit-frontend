import { TwoColumn } from '@openjcockpit/ui';
import { useQueueProposal, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { DispatchPanel } from './DispatchPanel';
import { QueueList } from './QueueList';

/** The specs that may be sent to OpenJCockpit now, and the opt-in dispatch. */
export function QueuePage() {
  const repository = useRepository();
  const queue = useQueueProposal(repository.id);
  const specs = useSpecs(repository.id);
  return (
    <TwoColumn>
      <QueueList query={queue} specs={specs.data} />
      <DispatchPanel repositoryId={repository.id} ready={queue.data ?? []} specs={specs.data} />
    </TwoColumn>
  );
}
