import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

// Mock the supabase module
vi.mock('../supabase', () => ({
  authGetSession: vi.fn().mockResolvedValue(null),
  authOnStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  }),
  authSignIn: vi.fn(),
  authSignUp: vi.fn(),
  authSignOut: vi.fn(),
  authResetPassword: vi.fn(),
}));

import {
  authSignIn,
  authSignUp,
  authSignOut,
  authResetPassword,
} from '../supabase';

describe('useAuth', () => {
  const mockShowToast = vi.fn();
  const mockOnSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default values', async () => {
    const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));

    // Wait for initial session check to resolve
    await act(async () => {});

    expect(result.current.user).toBeNull();
    expect(result.current.authScreen).toBe('signin');
    expect(result.current.authEmail).toBe('');
    expect(result.current.authPassword).toBe('');
    expect(result.current.authName).toBe('');
    expect(result.current.authError).toBeNull();
    expect(result.current.authSubmitting).toBe(false);
    expect(result.current.acceptedTerms).toBe(false);
  });

  describe('handleSignIn', () => {
    it('sets error when email is empty', async () => {
      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      await act(async () => {
        result.current.handleSignIn();
      });

      expect(result.current.authError).toBe('Please enter your email and password');
      expect(authSignIn).not.toHaveBeenCalled();
    });

    it('sets error for invalid email format', async () => {
      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthEmail('not-an-email');
        result.current.setAuthPassword('password123');
      });

      await act(async () => {
        result.current.handleSignIn();
      });

      expect(result.current.authError).toBe('Please enter a valid email address');
    });

    it('calls authSignIn with trimmed email', async () => {
      vi.mocked(authSignIn).mockResolvedValueOnce({ data: {}, error: null } as never);

      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthEmail('  test@example.com  ');
        result.current.setAuthPassword('password123');
      });

      await act(async () => {
        result.current.handleSignIn();
      });

      expect(authSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('sets error message from auth service', async () => {
      vi.mocked(authSignIn).mockResolvedValueOnce({
        data: {},
        error: { message: 'Invalid credentials' },
      } as never);

      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthEmail('test@example.com');
        result.current.setAuthPassword('wrong');
      });

      await act(async () => {
        result.current.handleSignIn();
      });

      expect(result.current.authError).toBe('Invalid credentials');
    });

    it('handles network errors gracefully', async () => {
      vi.mocked(authSignIn).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthEmail('test@example.com');
        result.current.setAuthPassword('password123');
      });

      await act(async () => {
        result.current.handleSignIn();
      });

      expect(result.current.authError).toBe('Network error — please check your connection');
    });
  });

  describe('handleSignUp', () => {
    it('requires terms acceptance', async () => {
      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthEmail('test@example.com');
        result.current.setAuthPassword('password123');
      });

      await act(async () => {
        result.current.handleSignUp();
      });

      expect(result.current.authError).toBe('Please accept the Terms of Service and Privacy Policy');
    });

    it('enforces minimum password length', async () => {
      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAcceptedTerms(true);
        result.current.setAuthEmail('test@example.com');
        result.current.setAuthPassword('12345');
      });

      await act(async () => {
        result.current.handleSignUp();
      });

      expect(result.current.authError).toBe('Password must be at least 6 characters');
    });

    it('calls authSignUp with correct params', async () => {
      vi.mocked(authSignUp).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as never);

      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAcceptedTerms(true);
        result.current.setAuthEmail('new@example.com');
        result.current.setAuthPassword('password123');
        result.current.setAuthName('Test User');
      });

      await act(async () => {
        result.current.handleSignUp();
      });

      expect(authSignUp).toHaveBeenCalledWith('new@example.com', 'password123', 'Test User');
      expect(result.current.authScreen).toBe('verify');
    });
  });

  describe('handleResetPassword', () => {
    it('requires email', async () => {
      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      await act(async () => {
        result.current.handleResetPassword();
      });

      expect(result.current.authError).toBe('Please enter your email address');
    });

    it('validates email format', async () => {
      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthEmail('bad-email');
      });

      await act(async () => {
        result.current.handleResetPassword();
      });

      expect(result.current.authError).toBe('Please enter a valid email address');
    });

    it('calls authResetPassword and shows toast on success', async () => {
      vi.mocked(authResetPassword).mockResolvedValueOnce({ error: null } as never);

      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthEmail('test@example.com');
      });

      await act(async () => {
        result.current.handleResetPassword();
      });

      expect(authResetPassword).toHaveBeenCalledWith('test@example.com');
      expect(mockShowToast).toHaveBeenCalledWith('Password reset email sent! Check your inbox.');
    });
  });

  describe('handleSignOut', () => {
    it('calls authSignOut and onSignOut callback', async () => {
      vi.mocked(authSignOut).mockResolvedValueOnce({ error: null } as never);

      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      await act(async () => {
        result.current.handleSignOut();
      });

      expect(authSignOut).toHaveBeenCalled();
      expect(mockOnSignOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('still signs out locally when authSignOut throws', async () => {
      vi.mocked(authSignOut).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      await act(async () => {
        result.current.handleSignOut();
      });

      expect(mockOnSignOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('state setters', () => {
    it('can switch auth screens', async () => {
      const { result } = renderHook(() => useAuth(mockShowToast, mockOnSignOut));
      await act(async () => {});

      act(() => {
        result.current.setAuthScreen('signup');
      });
      expect(result.current.authScreen).toBe('signup');

      act(() => {
        result.current.setAuthScreen('reset');
      });
      expect(result.current.authScreen).toBe('reset');
    });
  });
});
