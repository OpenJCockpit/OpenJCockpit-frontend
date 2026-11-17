/** Text for a failure of unknown type: the message of an `Error` (an `ApiError` carries the server's reason), else the value itself. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
