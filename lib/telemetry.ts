/** Disabled client boundary. Privileged providers belong in a future server adapter. */
export const telemetryEnabled = false;
export default class DisabledLogSnag {
  constructor(public readonly configuration: unknown) {}
  async track(_event: unknown) { /* intentionally disabled: no identifiers, logs or network */ }
}
export const Sentry = {
  captureException: (_error: unknown) => undefined,
  setUser: (_user: unknown) => undefined,
  addBreadcrumb: (_breadcrumb: unknown) => undefined,
};
