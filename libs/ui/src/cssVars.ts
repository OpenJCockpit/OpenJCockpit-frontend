import type { CSSProperties } from 'react';

type CssVarValue = string | number | undefined;

/**
 * Passes runtime values to a CSS module as custom properties.
 *
 * Spread the result onto an element: `<div {...cssVars({ '--cols': 3 })} />`. It returns a
 * `{ style }` prop object, so call sites need no `style=` attribute (and no lint disable).
 * Undefined values are skipped. Pass `base` to keep a caller-supplied style.
 */
export function cssVars(
  vars: Record<`--${string}`, CssVarValue>,
  base?: CSSProperties,
): { style: CSSProperties } {
  const style: CSSProperties & Record<string, unknown> = { ...base };
  for (const [name, value] of Object.entries(vars)) {
    if (value !== undefined) {
      style[name] = value;
    }
  }
  return { style };
}
