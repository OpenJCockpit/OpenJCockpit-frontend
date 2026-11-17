import type { CSSProperties } from 'react';
import { cx } from '../cx';
import styles from './Skeleton.module.scss';

interface SkeletonProps {
  /** Any CSS length; defaults to the full width of the container. */
  width?: string;
  /** Any CSS length; defaults to one line of text. */
  height?: string;
  className?: string;
}

/** Placeholder block for content that is loading. Decorative: pair it with a visible or screen-reader loading text. */
export function Skeleton({ width, height, className }: SkeletonProps) {
  const style = {
    ...(width && { '--skeleton-width': width }),
    ...(height && { '--skeleton-height': height }),
  } as CSSProperties;
  return (
    <span
      className={cx(styles.skeleton, className)}
      // eslint-disable-next-line no-restricted-syntax -- size is a runtime value, passed as custom properties
      style={style}
      aria-hidden="true"
      data-testid="skeleton"
    />
  );
}
