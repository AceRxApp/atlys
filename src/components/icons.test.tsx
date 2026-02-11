import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HomeIcon, DiscoverIcon, EventsIcon, PlanIcon } from './icons';

describe('Navigation Icons', () => {
  it.each([
    ['HomeIcon', HomeIcon],
    ['DiscoverIcon', DiscoverIcon],
    ['EventsIcon', EventsIcon],
    ['PlanIcon', PlanIcon],
  ])('%s renders as SVG', (_name, Icon) => {
    const { container } = render(<Icon active={false} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it.each([
    ['HomeIcon', HomeIcon],
    ['DiscoverIcon', DiscoverIcon],
    ['EventsIcon', EventsIcon],
    ['PlanIcon', PlanIcon],
  ])('%s renders differently when active', (_name, Icon) => {
    const { container: inactive } = render(<Icon active={false} />);
    const { container: active } = render(<Icon active={true} />);
    expect(inactive.innerHTML).not.toBe(active.innerHTML);
  });
});
