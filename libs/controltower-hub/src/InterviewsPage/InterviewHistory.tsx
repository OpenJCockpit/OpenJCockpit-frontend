import { useTranslation } from '@openjcockpit/i18n';
import { EmptyState, Icon, ListRow, StatusMessage } from '@openjcockpit/ui';
import type { ControlTowerInterview } from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useInterviews } from '../hooks';
import styles from './InterviewsPage.module.scss';

interface Props {
  repositoryId: string;
  onSelect: (interview: ControlTowerInterview) => void;
}

/** The repository's earlier interviews; picking one reopens it. */
export function InterviewHistory({ repositoryId, onSelect }: Props) {
  const { t } = useTranslation('controltower');
  const interviews = useInterviews(repositoryId);
  return (
    <>
      <ControlTowerQuery
        query={interviews}
        loadFailed={t('interviews.loadFailed')}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title={t('interviews.none')} />}
      >
        {(rows) =>
          rows.map((interview) => (
            <ListRow key={interview.id}>
              <button
                type="button"
                className={styles.rowButton}
                onClick={() => onSelect(interview)}
              >
                <span>
                  <b>{interview.title}</b>
                  <small>
                    {t('interviews.summary', {
                      kind: t(`kind.${interview.kind}`),
                      status: t(`interviews.status.${interview.status}`),
                      count: interview.answers.length,
                    })}
                  </small>
                </span>
                <Icon name="arrow-right" />
              </button>
            </ListRow>
          ))
        }
      </ControlTowerQuery>
      <StatusMessage>{t('interviews.privacy')}</StatusMessage>
    </>
  );
}
