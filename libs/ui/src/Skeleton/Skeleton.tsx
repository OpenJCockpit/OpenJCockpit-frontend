import { cx } from '../cx';
import { cssVars } from '../cssVars';
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
  return (
    <span
      className={cx(styles.skeleton, className)}
      {...cssVars({
        '--skeleton-width': width || undefined,
        '--skeleton-height': height || undefined,
      })}
      aria-hidden="true"
      data-testid="skeleton"
    />
  );
}
