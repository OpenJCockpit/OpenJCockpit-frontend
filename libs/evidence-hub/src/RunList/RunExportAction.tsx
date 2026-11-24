import { useTranslation } from '@openjcockpit/i18n';
import { ExportMenu } from '../ExportMenu/ExportMenu';
import { useExportEvidenceRun } from '../useExportEvidenceRun';

/** Row action: exports one whole run without opening it. A sibling of the row link, so it never navigates. */
export function RunExportAction({ runId, name }: { runId: string; name: string }) {
  const { t } = useTranslation('evidence');
  const exportRun = useExportEvidenceRun(runId);
  return (
    <ExportMenu
      compact
      label={t('export.rowAction', { run: name })}
      pending={exportRun.isPending}
      error={exportRun.isError}
      onExport={(format, includeOutputs) => exportRun.mutate({ format, includeOutputs })}
    />
  );
}
