import { Fragment, useEffect, useRef } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { CheckboxField, fieldHintClass, formGridClass } from '@openjcockpit/ui';
import { GeneralFields } from '../forms/ProjectFields';
import { WIZARD_STEPS } from './useProjectWizard';
import type { CreateStepId, ProjectWizardState } from './useProjectWizard';
import styles from './ProjectWizard.module.scss';

export function Stepper({ current }: { current: number }) {
  const { t } = useTranslation('project');
  return (
    <ol className={styles.stepper} aria-label={t('wizard.stepsLabel')}>
      {WIZARD_STEPS.map((id, index) => (
        <li
          key={id}
          className={index === current ? styles.stepperCurrent : styles.stepperItem}
          aria-current={index === current ? 'step' : undefined}
        >
          {index + 1}. {t(`wizard.steps.${id}`)}
        </li>
      ))}
    </ol>
  );
}

export function BasicsStep({ wizard }: { wizard: ProjectWizardState }) {
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (wizard.errors.name) nameRef.current?.focus();
  }, [wizard.errors.name]);
  return (
    <div className={formGridClass}>
      <GeneralFields
        form={wizard.form}
        onChange={wizard.updateForm}
        nameInvalid={!!wizard.errors.name}
        nameError={wizard.errors.name}
        nameInputRef={nameRef}
      />
    </div>
  );
}

export function IntegrationsStep({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  return (
    <div className={formGridClass}>
      <CheckboxField
        label={t('wizard.integrations.specInit')}
        hint={wizard.isNewRepo ? t('wizard.integrations.specInitNeedsRepo') : undefined}
        checked={wizard.initSpecs}
        disabled={wizard.isNewRepo}
        onChange={wizard.setInitSpecs}
      />
      <p className={fieldHintClass}>{t('wizard.integrations.later')}</p>
    </div>
  );
}

export function ReviewStep({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  const { form } = wizard;
  const rows: [string, string][] = [
    [t('form.name'), form.name.trim()],
    [t('form.description'), form.description],
    [t('form.owner'), form.owner],
    [t('form.environment'), form.environment],
    [t('form.customerId'), form.customerId],
    [
      t('wizard.review.repository'),
      wizard.isNewRepo
        ? t('wizard.repository.new')
        : `${form.gitUrl.trim()} (${form.defaultBranch || 'main'})`,
    ],
    [
      t('credentials.type'),
      wizard.isNewRepo ? '' : t(`credentials.types.${wizard.credentials.credentialType}`),
    ],
    [
      t('wizard.review.specInit'),
      wizard.initSpecs ? t('wizard.review.yes') : t('wizard.review.no'),
    ],
  ];
  return (
    <dl className={styles.summary}>
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <Fragment key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
    </dl>
  );
}

export function Progress({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  const ids: CreateStepId[] = ['create', 'credentials', 'gitCheck', 'specInit'];
  return (
    <ul className={styles.progress} aria-label={t('wizard.progress.label')}>
      {ids.map((id) => (
        <li key={id}>
          {t(`wizard.progress.${id}`)}: {t(`wizard.progress.state.${wizard.steps[id]}`)}
        </li>
      ))}
    </ul>
  );
}
