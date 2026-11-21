import { Fragment } from 'react';
import styles from './Shortcut.module.scss';

interface Props {
  /** One entry per physical key, in the order they are pressed. */
  keys: string[];
}

/** Whether the shortcut modifier on this machine is Cmd (Apple) rather than Ctrl. */
export function usesCommandKey(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  // navigator.platform says "MacIntel"; userAgentData.platform says "macOS".
  const lower = platform.toLowerCase();
  return ['mac', 'iphone', 'ipad'].some((name) => lower.includes(name));
}

/** A keyboard shortcut drawn as key caps, e.g. [Ctrl] + [Enter]. */
export function Shortcut({ keys }: Props) {
  return (
    <span className={styles.shortcut}>
      {keys.map((key, index) => (
        <Fragment key={`${key}-${index}`}>
          {index > 0 && <span aria-hidden="true">+</span>}
          <kbd className={styles.key}>{key}</kbd>
        </Fragment>
      ))}
    </span>
  );
}
