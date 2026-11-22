import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { buttonClass } from '../Button/Button';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/Icon';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './IconButton.module.scss';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Accessible name and tooltip text. Required, because the icon alone says nothing to assistive tech. */
  label: string;
  /** `secondary` for ordinary actions, `danger` for destructive ones. */
  variant?: 'secondary' | 'danger';
}

/**
 * Square icon-only button for table rows and toolbars. The `label` is both the accessible name
 * and the tooltip, so every icon stays discoverable by keyboard, pointer and screen reader.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'secondary', className, ...rest },
  ref,
) {
  return (
    <Tooltip content={label}>
      <button
        ref={ref}
        aria-label={label}
        className={cx(buttonClass({ variant }), styles.iconButton, className)}
        {...rest}
      >
        <Icon name={icon} weight="bold" />
      </button>
    </Tooltip>
  );
});
