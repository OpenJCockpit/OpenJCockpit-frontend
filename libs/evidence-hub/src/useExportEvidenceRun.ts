import { useMutation } from '@tanstack/react-query';
import { exportEvidenceRun } from '@openjcockpit/api';
import type { EvidenceExportOptions } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';
import { saveBlob } from './saveBlob';

/** Downloads one whole run in the chosen format and saves the file. Page only (behind `RequireProject`). */
export function useExportEvidenceRun(runId: string) {
  const projectId = useHubProject().selected?.id as string;
  return useMutation({
    mutationFn: async (options: EvidenceExportOptions) => {
      const { blob, filename } = await exportEvidenceRun(projectId, runId, options);
      saveBlob(blob, filename);
    },
  });
}
