/**
 * The one place non-fatal client problems are reported, so they can be silenced or shipped to
 * telemetry later. Delegates to `console` at call time, which keeps test spies working.
 */
export const logger = {
  warn: (message: unknown, ...details: unknown[]): void => {
    console.warn(message, ...details);
  },
};
