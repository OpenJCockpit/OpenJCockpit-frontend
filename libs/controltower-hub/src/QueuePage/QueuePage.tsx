import { useQueueProposal } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import common from '../shared.module.scss';
import { DispatchPanel } from './DispatchPanel';
import { QueueList } from './QueueList';

/** The specs that may be sent to OpenJCockpit now, and the opt-in dispatch. */
export function QueuePage() {
  const repository = useRepository();
  const queue = useQueueProposal(repository.id);
  return (
    <div className={common.twoCol}>
      <QueueList query={queue} />
      <DispatchPanel repositoryId={repository.id} readyCount={queue.data?.length ?? 0} />
    </div>
  );
}
