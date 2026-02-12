import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { PriceDots, StarRating, SkeletonCard } from './ui';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('PriceDots', () => {
  it('renders nothing for negative levels', () => {
    const { container } = renderWithTheme(<PriceDots level={-1} />);
    expect(container.textContent).toBe('');
  });

  it('renders 4 dollar signs', () => {
    const { container } = renderWithTheme(<PriceDots level={2} />);
    const spans = container.querySelectorAll('span span');
    expect(spans).toHaveLength(4);
  });

  it('highlights correct number of dots for level 2', () => {
    const { container } = renderWithTheme(<PriceDots level={2} />);
    const spans = container.querySelectorAll('span span');
    // First 2 should be amber, last 2 dimmed
    expect(spans[0].style.color).not.toBe(spans[2].style.color);
    expect(spans[1].style.color).not.toBe(spans[3].style.color);
  });

  it('renders zero highlighted for level 0', () => {
    const { container } = renderWithTheme(<PriceDots level={0} />);
    const spans = container.querySelectorAll('span span');
    const colors = Array.from(spans).map(s => s.style.color);
    // All should be the same (dimmed) color
    expect(new Set(colors).size).toBe(1);
  });
});

describe('StarRating', () => {
  it('renders rating with one decimal', () => {
    renderWithTheme(<StarRating rating={4.567} count={100} />);
    expect(screen.getByText('4.6')).toBeInTheDocument();
  });

  it('renders count directly when under 1000', () => {
    renderWithTheme(<StarRating rating={4.0} count={500} />);
    expect(screen.getByText('(500)')).toBeInTheDocument();
  });

  it('formats count as k when over 999', () => {
    renderWithTheme(<StarRating rating={4.0} count={1500} />);
    expect(screen.getByText('(1.5k)')).toBeInTheDocument();
  });

  it('renders star symbol', () => {
    renderWithTheme(<StarRating rating={4.0} count={10} />);
    expect(screen.getByText('★')).toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithTheme(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has shimmer animation element', () => {
    const { container } = renderWithTheme(<SkeletonCard />);
    const shimmer = container.querySelector('[style*="shimmer"]');
    expect(shimmer).toBeTruthy();
  });
});
