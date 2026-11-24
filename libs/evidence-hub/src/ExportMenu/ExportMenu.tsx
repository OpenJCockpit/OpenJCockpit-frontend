import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EvidenceExportFormat, EvidenceExportProgress } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { Button, CheckboxField, formInputClass, Icon, IconButton } from '@openjcockpit/ui';
import styles from './ExportMenu.module.scss';

const FORMATS: EvidenceExportFormat[] = ['json', 'csv', 'markdown', 'pdf'];
/** CSV only carries the `outputRef`, so the toggle does not apply to it. */
const OUTPUT_FORMATS = new Set<EvidenceExportFormat>(['json', 'markdown', 'pdf']);

export type ExportError = boolean | 'failed' | 'expired' | 'tooManyJobs';

/** Optional date bounds (`YYYY-MM-DD` from the date inputs) for multi-run scopes. */
export interface ExportDateRange {
  from?: string;
  to?: string;
}

interface Props {
  /** Translated name of what is exported, used as the button's accessible label. */
  label: string;
  /** Called with the chosen format; `includeOutputs` is always false for csv. `range` only with `dateRange`. */
  onExport: (
    format: EvidenceExportFormat,
    includeOutputs: boolean,
    range?: ExportDateRange,
  ) => void;
  pending?: boolean;
  /** Shows an inline error under the button; `true` means the generic failure. */
  error?: ExportError;
  /** Offers optional from/to dates (workflow and project scope). */
  dateRange?: boolean;
  /** Shows "12 of 80 runs" while a job runs. */
  progress?: EvidenceExportProgress;
  /** Shows a cancel button while a job runs. */
  onCancel?: () => void;
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
  dateRange = false,
  progress,
  onCancel,
  disabled,
  compact = false,
}: Props) {
  const { t } = useTranslation('evidence');
  const [open, setOpen] = useState(false);
  const [includeOutputs, setIncludeOutputs] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!root.current?.contains(target) && !popover.current?.contains(target)) setOpen(false);
    };
    // The popover is fixed to the viewport, so it would drift away from its button on scroll or resize.
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const choose = (format: EvidenceExportFormat) => {
    setOpen(false);
    const outputs = includeOutputs && OUTPUT_FORMATS.has(format);
    if (dateRange) onExport(format, outputs, { from: from || undefined, to: to || undefined });
    else onExport(format, outputs);
  };

  const toggle = () => {
    const rect = root.current?.getBoundingClientRect();
    // The root is mounted whenever the button can be clicked, so the empty case is unreachable.
    /* v8 ignore next -- @preserve */
    if (rect) setPos({ top: rect.bottom, right: window.innerWidth - rect.right });
    setOpen((v) => !v);
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
          onClick={toggle}
        />
      ) : (
        <Button
          variant="secondary"
          aria-label={label}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          disabled={disabled || pending}
          onClick={toggle}
        >
          <Icon name="download" /> {pending ? t('export.inProgress') : t('export.button')}
        </Button>
      )}
      {open &&
        pos &&
        createPortal(
          <div
            ref={popover}
            className={styles.popover}
            // eslint-disable-next-line no-restricted-syntax -- position comes from the measured button rect at runtime
            style={{ top: pos.top, right: pos.right }}
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
            {dateRange && (
              <fieldset className={styles.dates}>
                <legend>{t('export.dateRange')}</legend>
                <label>
                  {t('export.dateFrom')}
                  <input
                    className={formInputClass}
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label>
                  {t('export.dateTo')}
                  <input
                    className={formInputClass}
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </fieldset>
            )}
          </div>,
          document.body,
        )}
      {progress && (
        <p className={styles.progress} role="status">
          {t('export.progress', { done: progress.runsDone, total: progress.runsTotal })}
          {onCancel && (
            <button type="button" className={styles.cancel} onClick={onCancel}>
              {t('export.cancel')}
            </button>
          )}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {t(error === 'expired' || error === 'tooManyJobs' ? `export.${error}` : 'export.failed')}
        </p>
      )}
    </div>
  );
}
