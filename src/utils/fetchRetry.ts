/**
 * Fetch with automatic retry and exponential backoff.
 * Used for API calls that may transiently fail (network glitches, 503s).
 */
export async function fetchRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  { retries = 2, baseDelay = 500 }: { retries?: number; baseDelay?: number } = {},
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init);

      // Don't retry client errors (4xx) — only server/network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error (5xx) — retry
      if (attempt < retries) {
        await delay(baseDelay * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries) {
        await delay(baseDelay * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error('Fetch failed after retries');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
