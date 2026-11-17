import type { ElementType, HTMLAttributes } from 'react';
import { cx } from '../cx';
import styles from './Panel.module.scss';

/** Panel surface class for elements that cannot be a <Panel> (e.g. a ModalShell dialog). */
export const panelClassName = styles.panel;

type PanelProps = HTMLAttributes<HTMLElement> & { as?: ElementType };

/** Glass surface used for every dashboard card. */
export function Panel({ as: Tag = 'section', className, ...rest }: PanelProps) {
  return <Tag className={cx(styles.panel, className)} {...rest} />;
}

interface PanelHeaderProps extends HTMLAttributes<HTMLElement> {
  /** Adds a bottom divider. */
  simple?: boolean;
}

export function PanelHeader({ simple, className, ...rest }: PanelHeaderProps) {
  return (
    <header className={cx(styles.header, simple && styles.headerSimple, className)} {...rest} />
  );
}

export function PanelTitle({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.title, className)} {...rest} />;
}

/** Small muted label above a heading. */
export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx(styles.eyebrow, className)} {...rest} />;
}

/** Padded, gridded content area of a panel. Also styles the labels and controls of plain form fields inside it. */
export function PanelBody({ as: Tag = 'div', className, ...rest }: PanelProps) {
  return <Tag className={cx(styles.body, className)} {...rest} />;
}

/** Side-by-side panels that stack when narrow. */
export function TwoColumn({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.twoColumn, className)} {...rest} />;
}

/** One list item: content on the left, actions on the right; a nested `<small>` is a muted second line. */
export function ListRow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.listRow, className)} {...rest} />;
}

/** A wrapping row of buttons. */
export function ActionRow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.actionRow, className)} {...rest} />;
}
