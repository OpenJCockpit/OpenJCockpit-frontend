import type { ReactNode } from 'react';
import styles from '../FormFields.module.scss';
import { Select } from '../../Select/Select';
import type { SelectOption } from '../../Select/Select';
import { FieldLabelText, FieldMessages, useFieldA11y } from '../FieldParts';

interface SelectFieldProps {
  label: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  wide?: boolean;
  hint?: ReactNode;
  /** Inline validation message under the field; marks it invalid. */
  error?: ReactNode;
  errorId?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  wide,
  hint,
  error,
  errorId,
  required,
  ...selectProps
}: SelectFieldProps) {
  const a11y = useFieldA11y({
    error,
    errorId,
    hint,
    required,
    'aria-describedby': selectProps['aria-describedby'],
  });
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- the Select trigger inside is the control
    <label className={wide ? styles.formFieldWide : undefined}>
      <FieldLabelText label={label} required={required} />
      <Select
        {...selectProps}
        {...a11y.inputProps}
        block
        field
        value={value}
        options={options}
        onChange={onChange}
      />
      <FieldMessages hint={hint} hintId={a11y.hintId} error={error} errorId={a11y.errorId} />
    </label>
  );
}
