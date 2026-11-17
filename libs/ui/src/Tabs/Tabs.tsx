import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cx } from '../cx';
import styles from './Tabs.module.scss';

/** Class applied to the selected tab; exposed so tests can assert the selection. */
export const tabActiveClass = styles.tabActive;

/** Base tab class, for tabs rendered as router links instead of `Tab` buttons. */
export const tabClass = styles.tab;

interface TabNavProps extends HTMLAttributes<HTMLElement> {
  /** Adds the bottom margin used when the nav sits above panel content. */
  secondary?: boolean;
}

export function TabNav({ secondary, className, ...rest }: TabNavProps) {
  return <nav className={cx(styles.nav, secondary && styles.navSecondary, className)} {...rest} />;
}

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Tab({ active, className, ...rest }: TabProps) {
  return <button className={cx(styles.tab, active && styles.tabActive, className)} {...rest} />;
}

interface TabBadgeProps {
  /** Hidden while `undefined` (still loading) or `0` unless `showZero` is set. */
  count: number | undefined;
  /** Draws attention, e.g. drafts waiting for review. */
  accent?: boolean;
  showZero?: boolean;
}

/** Small count next to a tab label. Render it inside the tab link. */
export function TabBadge({ count, accent, showZero }: TabBadgeProps) {
  if (count === undefined || (count === 0 && !showZero)) return null;
  return <span className={cx(styles.badge, accent && styles.badgeAccent)}>{count}</span>;
}
