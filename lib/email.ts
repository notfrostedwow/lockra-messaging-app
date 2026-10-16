/** Preserve the report-email contract that existing chat source imported but never supplied. */
export async function sendReportEmail(_reporterId: string, _reporterName: string,
  _reportedId: string, _reportedName: string, _reason: string): Promise<void> {
  throw new Error('Email delivery is disabled. A future authenticated server-only adapter is required.');
}
