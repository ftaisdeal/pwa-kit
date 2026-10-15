// The only place that touches `console`. Debug output is development-only;
// warnings and errors are kept in production so real problems stay visible.
export const log = {
  debug(...args: unknown[]): void {
    if (import.meta.env.DEV) console.log(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
