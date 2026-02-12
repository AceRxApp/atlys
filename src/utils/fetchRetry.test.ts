import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRetry } from './fetchRetry';

describe('fetchRetry', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns immediately on a successful response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await fetchRetry('/api/test');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 4xx client errors', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });

    const result = await fetchRetry('/api/test');
    expect(result.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx server errors', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const promise = fetchRetry('/api/test', undefined, { retries: 2, baseDelay: 100 });

    // Advance past the first backoff delay (100ms)
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on network errors', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const promise = fetchRetry('/api/test', undefined, { retries: 2, baseDelay: 100 });

    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries on network errors', async () => {
    vi.useRealTimers(); // Use real timers for this test to avoid unhandled rejection timing issues
    fetchMock
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'));

    await expect(
      fetchRetry('/api/test', undefined, { retries: 2, baseDelay: 10 }),
    ).rejects.toThrow('fail 3');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useFakeTimers(); // Restore for afterEach
  });

  it('uses exponential backoff', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const promise = fetchRetry('/api/test', undefined, { retries: 2, baseDelay: 100 });

    // First retry: 100ms delay
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Second retry: 200ms delay (100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('defaults to 2 retries', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const promise = fetchRetry('/api/test', undefined, { baseDelay: 50 });

    await vi.advanceTimersByTimeAsync(50);   // first retry
    await vi.advanceTimersByTimeAsync(100);  // second retry

    const result = await promise;
    expect(result.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('passes init options through to fetch', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    await fetchRetry('/api/test', init);

    expect(fetchMock).toHaveBeenCalledWith('/api/test', init);
  });
});
