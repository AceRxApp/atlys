import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceDots, StarRating, SkeletonCard } from './ui';

describe('PriceDots', () => {
  it('renders nothing for negative levels', () => {
    const { container } = render(<PriceDots level={-1} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders 4 dollar signs', () => {
    const { container } = render(<PriceDots level={2} />);
    const spans = container.querySelectorAll('span span');
    expect(spans).toHaveLength(4);
  });

  it('highlights correct number of dots for level 2', () => {
    const { container } = render(<PriceDots level={2} />);
    const spans = container.querySelectorAll('span span');
    // First 2 should be highlighted, last 2 dimmed (jsdom converts hex to rgb)
    expect(spans[0].style.color).toBe('rgb(245, 158, 11)');
    expect(spans[1].style.color).toBe('rgb(245, 158, 11)');
    expect(spans[2].style.color).toBe('rgb(58, 54, 50)');
    expect(spans[3].style.color).toBe('rgb(58, 54, 50)');
  });

  it('renders zero highlighted for level 0', () => {
    const { container } = render(<PriceDots level={0} />);
    const spans = container.querySelectorAll('span span');
    spans.forEach(span => {
      expect(span.style.color).toBe('rgb(58, 54, 50)');
    });
  });
});

describe('StarRating', () => {
  it('renders rating with one decimal', () => {
    render(<StarRating rating={4.567} count={100} />);
    expect(screen.getByText('4.6')).toBeInTheDocument();
  });

  it('renders count directly when under 1000', () => {
    render(<StarRating rating={4.0} count={500} />);
    expect(screen.getByText('(500)')).toBeInTheDocument();
  });

  it('formats count as k when over 999', () => {
    render(<StarRating rating={4.0} count={1500} />);
    expect(screen.getByText('(1.5k)')).toBeInTheDocument();
  });

  it('renders star symbol', () => {
    render(<StarRating rating={4.0} count={10} />);
    expect(screen.getByText('★')).toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has shimmer animation element', () => {
    const { container } = render(<SkeletonCard />);
    const shimmer = container.querySelector('[style*="shimmer"]');
    expect(shimmer).toBeTruthy();
  });
});
