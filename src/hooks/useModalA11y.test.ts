import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModalA11y } from './useModalA11y';

describe('useModalA11y', () => {
  it('returns a ref object', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useModalA11y(true, onClose));
    expect(result.current).toHaveProperty('current');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderHook(() => useModalA11y(true, onClose));

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal is closed', () => {
    const onClose = vi.fn();
    renderHook(() => useModalA11y(false, onClose));

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose for non-Escape keys', () => {
    const onClose = vi.fn();
    renderHook(() => useModalA11y(true, onClose));

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    document.dispatchEvent(event);

    expect(onClose).not.toHaveBeenCalled();
  });
});
