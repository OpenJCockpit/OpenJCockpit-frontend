import { Navigate, Route, Routes, useNavigate, useParams, useResolvedPath } from 'react-router';
import {
  Actions,
  DataTable,
  StatusChip,
  fieldHintClass,
  SettingsGroup,
  Button,
  StatusMessage,
  useConfirmDialog,
} from '@openjcockpit/ui';
import { useFormatters, useTranslation } from '@openjcockpit/i18n';
import { MarketplaceForm } from './MarketplaceForm';
import { useSkillsHubSettings } from './useSkillsHubSettings';

/** Content of the host's "Marketplaces" settings section; the host owns the heading and page chrome. */
export function SkillsHubSettings() {
  const state = useSkillsHubSettings();
  const listPath = useResolvedPath('').pathname.replace(/\/$/, '');
  return (
    <Routes>
      <Route index element={<MarketplaceList {...state} listPath={listPath} />} />
      <Route path="new" element={<MarketplaceFormRoute {...state} listPath={listPath} />} />
      <Route
        path=":connectionId/edit"
        element={<MarketplaceFormRoute {...state} listPath={listPath} />}
      />
      <Route path="*" element={<Navigate to={listPath || '/'} replace />} />
    </Routes>
  );
}

type State = ReturnType<typeof useSkillsHubSettings>;

function MarketplaceFormRoute({
  listPath,
  connections,
  loaded,
  error,
  saving,
  saveConnection,
}: State & { listPath: string }) {
  const { t } = useTranslation('skillsHub');
  const { connectionId } = useParams();
  if (!loaded) return <StatusMessage variant="loading">{t('settings.loading')}</StatusMessage>;
  const editing = connectionId ? connections.find((c) => c.id === connectionId) : undefined;
  if (connectionId && !editing) return <Navigate to={listPath || '/'} replace />;
  return (
    <MarketplaceForm
      editing={editing ?? null}
      error={error}
      saving={saving}
      listPath={listPath}
      onSave={(form) => saveConnection(editing?.id ?? null, form)}
    />
  );
}

function MarketplaceList({
  connections,
  loaded,
  error,
  status,
  handleDelete,
  clearError,
  listPath,
}: State & { listPath: string }) {
  const { t } = useTranslation('skillsHub');
  const { formatDate } = useFormatters();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirmDialog();

  if (!loaded) {
    return <StatusMessage variant="loading">{t('settings.loading')}</StatusMessage>;
  }

  return (
    <>
      {error && (
        <StatusMessage variant="error" role="alert">
          {error}
        </StatusMessage>
      )}
      <p className={fieldHintClass} role="status" aria-live="polite">
        {status}
      </p>

      <SettingsGroup>
        <DataTable>
          <thead>
            <tr>
              <th>{t('settings.columnName')}</th>
              <th>{t('settings.columnUrl')}</th>
              <th>{t('settings.columnApiKey')}</th>
              <th>{t('settings.columnStatus')}</th>
              <th>{t('settings.columnCreated')}</th>
              <th>{t('settings.columnActions')}</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((connection) => (
              <tr key={connection.id}>
                <td>
                  <strong>{connection.name}</strong>
                  {connection.description && (
                    <span className={fieldHintClass}>{connection.description}</span>
                  )}
                </td>
                <td>{connection.marketplaceUrl}</td>
                <td>{connection.hasApiKey ? t('settings.apiKeySet') : t('settings.noApiKey')}</td>
                <td>
                  <StatusChip
                    label={connection.enabled ? t('settings.enabled') : t('settings.disabled')}
                    kind={connection.enabled ? 'ok' : 'neutral'}
                  />
                </td>
                <td>{formatDate(connection.createdAt)}</td>
                <Actions as="td">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      clearError();
                      void navigate(`${listPath}/${encodeURIComponent(connection.id)}/edit`);
                    }}
                  >
                    {t('settings.edit')}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      confirm({
                        title: t('settings.confirmDelete.title', { name: connection.name }),
                        message: t('settings.confirmDelete.message'),
                        confirmLabel: t('settings.delete'),
                        cancelLabel: t('settings.cancel'),
                        busyLabel: t('settings.deleting'),
                        onConfirm: () => handleDelete(connection),
                      })
                    }
                  >
                    {t('settings.delete')}
                  </Button>
                </Actions>
              </tr>
            ))}
            {!error && connections.length === 0 && (
              <tr>
                <td colSpan={6} className={fieldHintClass}>
                  {t('settings.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <Button
          variant="primary"
          onClick={() => {
            clearError();
            void navigate(`${listPath}/new`);
          }}
        >
          {t('settings.formNew')}
        </Button>
      </SettingsGroup>
      {dialog}
    </>
  );
}
