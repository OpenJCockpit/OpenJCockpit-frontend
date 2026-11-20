import { TabBadge } from '@openjcockpit/ui';
import { useControlTowerCounts, useQueueProposal, useSpecs } from '../hooks';
import type { TabKey } from '../pages';

function DraftsBadge({ repositoryId }: { repositoryId: string }) {
  const specs = useSpecs(repositoryId).data;
  return <TabBadge count={specs?.filter((s) => s.status === 'DRAFT').length} accent />;
}

function ActiveInterviewsBadge({ repositoryId }: { repositoryId: string }) {
  return <TabBadge count={useControlTowerCounts(repositoryId).activeInterviews} accent />;
}

function ReadyBadge({ repositoryId }: { repositoryId: string }) {
  return <TabBadge count={useQueueProposal(repositoryId).data?.length} />;
}

/** The count next to a tab label: interviews in progress on Discovery interviews, drafts waiting for review on Specifications, ready specs on the Dispatch queue. Each badge only reads the query it needs. */
export function PageTabBadge({ tabKey, repositoryId }: { tabKey: TabKey; repositoryId: string }) {
  if (tabKey === 'interviews') return <ActiveInterviewsBadge repositoryId={repositoryId} />;
  if (tabKey === 'specs') return <DraftsBadge repositoryId={repositoryId} />;
  if (tabKey === 'queue') return <ReadyBadge repositoryId={repositoryId} />;
  return null;
}
