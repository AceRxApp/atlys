import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update the value before the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } },
    );

    rerender({ value: 'world', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('hello');
  });

  it('updates the value after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } },
    );

    rerender({ value: 'world', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('world');
  });

  it('resets the timer when value changes rapidly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } },
    );

    rerender({ value: 'ab', delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: 'abc', delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });

    // 'ab' should never appear — timer was reset
    expect(result.current).toBe('a');

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('abc');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 200 } },
    );

    rerender({ value: 42, delay: 200 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(42);
  });

  it('works with null values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: null as string | null, delay: 100 } },
    );

    rerender({ value: 'test', delay: 100 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('test');
  });
});
