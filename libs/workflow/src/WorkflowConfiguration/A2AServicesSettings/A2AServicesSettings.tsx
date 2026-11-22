import { Navigate, Route, Routes, useNavigate, useParams, useResolvedPath } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  StatusChip,
  StatusMessage,
  Button,
  Actions,
  SettingsGroup,
  DataTable,
  fieldHintClass,
} from '@openjcockpit/ui';
import { useConfirmDelete } from '../../WorkflowDesign/panels/shared/useConfirmDelete';
import { a2aServiceStatus } from './a2aServiceStatus';
import { A2AServiceForm } from './A2AServiceForm';
import { useA2AServices } from './useA2AServices';
import WorkflowConfigurationStyles from '../WorkflowConfiguration.module.scss';

/**
 * The A2A services workflows can call agents through: the ones from the agent service's
 * configuration (read-only, e.g. LiteLLM) and LiteLLM-compatible gateways added here. Global —
 * it applies to every project.
 */
export function A2AServicesSettings() {
  const state = useA2AServices();
  const listPath = useResolvedPath('').pathname.replace(/\/$/, '');
  return (
    <Routes>
      <Route index element={<A2AServicesList {...state} listPath={listPath} />} />
      <Route
        path="new"
        element={<A2AServiceFormRoute {...state} listPath={listPath} mode="add" />}
      />
      <Route
        path=":serviceId/edit"
        element={<A2AServiceFormRoute {...state} listPath={listPath} mode="edit" />}
      />
      <Route path="*" element={<Navigate to={listPath || '/'} replace />} />
    </Routes>
  );
}

type State = ReturnType<typeof useA2AServices>;

/** Routes to the form screen; waits for the list so an edit can start from the stored service. */
function A2AServiceFormRoute({
  mode,
  listPath,
  services,
  loaded,
  error,
  saving,
  saveService,
}: State & { mode: 'add' | 'edit'; listPath: string }) {
  const { t } = useTranslation('workflow');
  const { serviceId } = useParams();
  if (!loaded) return <StatusMessage role="status">{t('a2aServices.loading')}</StatusMessage>;
  const service = mode === 'edit' ? services.find((s) => s.id === serviceId) : undefined;
  if (mode === 'edit' && !service?.editable) return <Navigate to={listPath || '/'} replace />;
  return (
    <A2AServiceForm
      editingService={service ?? null}
      error={error}
      saving={saving}
      listPath={listPath}
      onSave={(form) => saveService(service?.id ?? null, form)}
    />
  );
}

function A2AServicesList({
  services,
  loaded,
  error,
  savedMessage,
  handleDelete,
  clearFeedback,
  listPath,
}: State & { listPath: string }) {
  const { t } = useTranslation('workflow');
  const navigate = useNavigate();
  const { askDelete, dialog } = useConfirmDelete();

  return (
    <SettingsGroup title={t('a2aServices.title')} description={t('a2aServices.intro')}>
      {error && (
        <StatusMessage variant="error" role="alert">
          {error}
        </StatusMessage>
      )}
      {savedMessage && (
        <p className={WorkflowConfigurationStyles.workflowSavedMessage}>{savedMessage}</p>
      )}

      {!loaded ? (
        <StatusMessage role="status">{t('a2aServices.loading')}</StatusMessage>
      ) : (
        <div className={WorkflowConfigurationStyles.servicesTableWrap}>
          <DataTable>
            <thead>
              <tr>
                <th>{t('a2aServices.columns.service')}</th>
                <th>{t('a2aServices.columns.baseUrl')}</th>
                <th>{t('a2aServices.columns.credentials')}</th>
                <th>{t('a2aServices.columns.status')}</th>
                <th>{t('a2aServices.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const status = a2aServiceStatus(service);
                return (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.name}</strong>
                      <span className={fieldHintClass}>
                        {service.id} ·{' '}
                        {service.source === 'CONFIGURATION'
                          ? t('a2aServices.source.CONFIGURATION')
                          : t('a2aServices.source.ADDED')}
                      </span>
                    </td>
                    <td className={WorkflowConfigurationStyles.servicesUrl}>
                      {service.baseUrl}
                      {service.publicUrl && service.publicUrl !== service.baseUrl && (
                        <span className={fieldHintClass}>
                          {t('a2aServices.publicUrl', { url: service.publicUrl })}
                        </span>
                      )}
                    </td>
                    <td>
                      {service.hasApiKey ? t('a2aServices.apiKeySet') : t('a2aServices.noApiKey')}
                      <span className={fieldHintClass}>
                        {service.callerClientId
                          ? t('a2aServices.callerIdentity', { id: service.callerClientId })
                          : t('a2aServices.noCallerIdentity')}
                      </span>
                    </td>
                    <td>
                      <StatusChip label={status.label} kind={status.kind} />
                      {service.message && <span className={fieldHintClass}>{service.message}</span>}
                    </td>
                    <td>
                      {service.editable ? (
                        <Actions>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              clearFeedback();
                              void navigate(`${listPath}/${encodeURIComponent(service.id)}/edit`);
                            }}
                          >
                            {t('shared.edit')}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() =>
                              askDelete('a2aService', service.name, () => handleDelete(service))
                            }
                          >
                            {t('shared.delete')}
                          </Button>
                        </Actions>
                      ) : (
                        <span className={fieldHintClass}>{t('shared.readOnly')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {services.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className={fieldHintClass}>
                    {t('a2aServices.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
      )}

      {loaded && (
        <Button
          variant="primary"
          onClick={() => {
            clearFeedback();
            void navigate(`${listPath}/new`);
          }}
        >
          {t('a2aServices.addButton')}
        </Button>
      )}
      {dialog}
    </SettingsGroup>
  );
}
