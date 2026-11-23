import { useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { cx } from '../../cx';
import { usePrefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import styles from './DecipherText.module.scss';

// Adapted from React Bits' `DecryptedText`
// (https://github.com/DavidHDev/react-bits,
// src/content/TextAnimations/DecryptedText/DecryptedText.jsx,
// commit 7a7cf3746f944e14c9ae9b7e2ab899df4ee55c77).
//
// This is NOT a byte-identical vendored copy — it is materially adapted
// (ADR-6: adaptation means ownership). See
// libs/ui/src/vendor/react-bits/ATTRIBUTION.md for the full
// upstream licence text (MIT + Commons Clause License Condition v1.0), the
// non-republication constraint, and the itemised list of the seven
// mandatory local adaptations applied here (dropped `motion/react`,
// `durationMs` API instead of `speed`/`maxIterations`, fixed sr-only leak,
// reduced-motion handling, layout reservation, Arwes' character set,
// simplified single-trigger-on-mount behaviour with full teardown).
//
// The DOM shape (`<Component><span>final text</span><span
// aria-hidden>{visible text}</span></Component>`) is preserved from
// upstream — only the *content* fed to the first span, the trigger
// mechanism, and the CSS used to stack/position the two spans are changed
// (see DecipherText.module.scss for the layout-reservation
// adaptation, #5 in ATTRIBUTION.md).

// Transcribed from Arwes' text package
// (animateTextDecipher/animateTextDecipher.js, read directly out of the
// then-installed node_modules tree, not trusted from the architecture
// document's quotation of it), to preserve the pre-migration visual
// character of the reveal (BR-2).
const CIPHERED_CHARACTERS =
  '    ----____abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Layout (reserved final-text node + absolutely positioned overlay in one grid cell) lives in
// DecipherText.module.scss; see the comments there and ATTRIBUTION.md #3 and #5.

function randomOrder(length: number): number[] {
  const order = Array.from({ length }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

function scramble(text: string, revealedIndexes: Set<number>, characters: string): string {
  return text
    .split('')
    .map((char, index) => {
      if (char === ' ') {
        return ' ';
      }
      if (revealedIndexes.has(index)) {
        return char;
      }
      return characters[Math.floor(Math.random() * characters.length)];
    })
    .join('');
}

/**
 * Decipher-style reveal of `text`, auto-running once on mount (and again
 * whenever `text` changes), bound to a fixed `durationMs` window rather
 * than an iteration count — required so the reveal cannot drift past the
 * 2.1s `introExit` CSS delay or the 2850ms `onDone` timer at the
 * `IntroGreeting` call site (R-6).
 */
type DecipherTextProps = {
  as?: ElementType;
  text: string;
  durationMs?: number;
  intervalMs?: number;
  characters?: string;
  className?: string;
};

export function DecipherText({
  as: Component = 'span',
  text,
  durationMs = 1200,
  intervalMs = 40,
  characters = CIPHERED_CHARACTERS,
  className = '',
}: DecipherTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearInterval(intervalRef.current);

    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the scrambled frame when the animation restarts
      setDisplayText(text);
      return undefined;
    }

    const order = randomOrder(text.length);
    const revealed = new Set<number>();
    const startedAt = performance.now();

    setDisplayText(scramble(text, revealed, characters));

    intervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(1, durationMs <= 0 ? 1 : elapsed / durationMs);
      const revealCount = Math.round(order.length * progress);

      revealed.clear();
      for (let i = 0; i < revealCount; i += 1) {
        revealed.add(order[i]!);
      }

      setDisplayText(scramble(text, revealed, characters));

      if (progress >= 1) {
        window.clearInterval(intervalRef.current);
      }
    }, intervalMs);

    return () => window.clearInterval(intervalRef.current);
  }, [text, durationMs, intervalMs, characters, reducedMotion]);

  return (
    <Component className={cx(styles.wrapper, className)}>
      {/* Screen readers always get the final string, never a partial
          scramble — this is the upstream defect fix (ATTRIBUTION.md #3).
          This node also reserves the layout box (ATTRIBUTION.md #5): it is
          the only in-flow, size-contributing item in the grid stack. */}
      <span className={styles.reserved}>{text}</span>
      <span aria-hidden="true" className={styles.overlay}>
        {displayText}
      </span>
    </Component>
  );
}
