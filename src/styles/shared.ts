import type React from 'react';
import type { ThemeTokens } from './theme';

export function getCardStyle(theme: ThemeTokens): React.CSSProperties {
  return {
    background: theme.bg.surfaceAlpha,
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '12px',
    border: `1px solid ${theme.border.subtle}`,
  };
}

// Legacy constant for backwards compat during migration
export const cardStyle: React.CSSProperties = {
  background: 'rgba(28, 25, 23, 0.8)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid rgba(255,255,255,0.06)',
};
