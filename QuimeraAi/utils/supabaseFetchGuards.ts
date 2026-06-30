export interface SupabaseFetchFailureContext {
  status?: number;
  timedOut?: boolean;
  abortedByUpstream?: boolean;
}

const getErrorName = (error: unknown): string => (
  error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name || '') : ''
);

const getErrorMessage = (error: unknown): string => (
  error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message || '') : ''
);

export function shouldCountSupabaseFetchFailure(
  error: unknown,
  context: SupabaseFetchFailureContext = {}
): boolean {
  if (typeof context.status === 'number') {
    return context.status >= 500;
  }

  if (context.abortedByUpstream) {
    return false;
  }

  if (context.timedOut) {
    return true;
  }

  const name = getErrorName(error);
  const message = getErrorMessage(error);

  return (
    name === 'TimeoutError' ||
    message === 'Failed to fetch' ||
    message.includes('NetworkError')
  );
}

export function isTransientSupabaseAvailabilityError(error: unknown): boolean {
  const name = getErrorName(error);
  return name === 'AbortError' || name === 'TimeoutError' || name === 'SupabaseUnavailableError';
}
