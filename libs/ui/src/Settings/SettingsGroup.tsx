import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Settings.module.scss';

interface SettingsGroupProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Omit when the section holds one group and its own heading already says it. */
  title?: ReactNode;
  description?: ReactNode;
  /** Anchor: `/settings/<section>#<id>` scrolls here. Also used for the group's accessible name. */
  id?: string;
}

/** A titled block inside a settings section. A section with several concerns uses several groups. */
export function SettingsGroup({
  title,
  description,
  id,
  className,
  children,
  ...rest
}: SettingsGroupProps) {
  const generated = useId();
  const titleId = `${id ?? generated}-title`;
  return (
    <section
      id={id}
      aria-labelledby={title ? titleId : undefined}
      className={cx(styles.group, className)}
      {...rest}
    >
      {title || description ? (
        <header className={styles.groupHeader}>
          {title ? (
            <h2 id={titleId} className={styles.groupTitle}>
              {title}
            </h2>
          ) : null}
          {description ? <p className={styles.description}>{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
