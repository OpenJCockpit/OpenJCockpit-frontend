import { useEffect, useId, useRef, useState } from 'react';
import type { EvidenceExportFormat } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { Button, CheckboxField, Icon, IconButton } from '@openjcockpit/ui';
import styles from './ExportMenu.module.scss';

const FORMATS: EvidenceExportFormat[] = ['json', 'csv', 'markdown', 'pdf'];
/** CSV only carries the `outputRef`, so the toggle does not apply to it. */
const OUTPUT_FORMATS = new Set<EvidenceExportFormat>(['json', 'markdown', 'pdf']);

interface Props {
  /** Translated name of what is exported, used as the button's accessible label. */
  label: string;
  /** Called with the chosen format; `includeOutputs` is always false for csv. */
  onExport: (format: EvidenceExportFormat, includeOutputs: boolean) => void;
  pending?: boolean;
  /** Shows an inline error under the button. */
  error?: boolean;
  disabled?: boolean;
  /** Icon-only trigger for table rows; `label` stays the accessible name and tooltip. */
  compact?: boolean;
}

/** Export button with a popover of the four formats and an "include agent outputs" toggle. */
export function ExportMenu({
  label,
  onExport,
  pending = false,
  error = false,
  disabled,
  compact = false,
}: Props) {
  const { t } = useTranslation('evidence');
  const [open, setOpen] = useState(false);
  const [includeOutputs, setIncludeOutputs] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (format: EvidenceExportFormat) => {
    setOpen(false);
    onExport(format, includeOutputs && OUTPUT_FORMATS.has(format));
  };

  return (
    <div className={styles.root} ref={root}>
      {compact ? (
        <IconButton
          icon="download"
          label={label}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          disabled={disabled || pending}
          onClick={() => setOpen((v) => !v)}
        />
      ) : (
        <Button
          variant="secondary"
          aria-label={label}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          disabled={disabled || pending}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="download" /> {pending ? t('export.inProgress') : t('export.button')}
        </Button>
      )}
      {open && (
        <div
          className={styles.popover}
          id={popoverId}
          role="group"
          aria-label={t('export.formats')}
        >
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              className={styles.item}
              onClick={() => choose(format)}
            >
              {t(`export.${format}`)}
            </button>
          ))}
          <CheckboxField
            label={t('export.includeOutputs')}
            checked={includeOutputs}
            onChange={setIncludeOutputs}
          />
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {t('export.failed')}
        </p>
      )}
    </div>
  );
}
