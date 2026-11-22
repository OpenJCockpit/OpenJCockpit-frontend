import { useRef, useState } from 'react';
import { updateProject } from '@openjcockpit/api';
import type { Project, ProjectRequest } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useProjectCache } from './projectCache';

function toRequest(project: Project): ProjectRequest {
  return {
    name: project.name,
    customerId: project.customerId ?? '',
    gitUrl: project.gitUrl ?? '',
    description: project.description ?? '',
    defaultBranch: project.defaultBranch ?? 'main',
    environment: project.environment ?? '',
    owner: project.owner ?? '',
    newProject: project.newProject,
  };
}

/** Edits the selected project. The backend replaces the whole project, so every section saves the full request. */
export function useProjectDetails(project: Project) {
  const { t } = useTranslation('project');
  const updateProjects = useProjectCache();
  const [form, setFormState] = useState<ProjectRequest>(() => toRequest(project));
  // What the server holds: the project as loaded, then the last saved form.
  const [baseline, setBaseline] = useState<ProjectRequest>(() => toRequest(project));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameInvalid, setNameInvalid] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function setForm(update: (f: ProjectRequest) => ProjectRequest) {
    setFormState(update);
    setSaved(false);
  }

  function reset() {
    setFormState(baseline);
    setSaved(false);
    setError(null);
    setNameInvalid(false);
  }

  async function save() {
    if (!form.name.trim()) {
      setError(t('settings.errors.nameRequired'));
      setNameInvalid(true);
      nameInputRef.current?.focus();
      return;
    }
    setNameInvalid(false);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateProject(project.id, form);
      updateProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)));
      setBaseline(form);
      setSaved(true);
    } catch {
      setError(t('settings.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  return { form, setForm, dirty, saving, saved, error, nameInvalid, nameInputRef, save, reset };
}
