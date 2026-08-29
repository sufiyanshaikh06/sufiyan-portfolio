import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import { HudButton } from '@/components/ui/HudButton';
import { HudCard } from '@/components/ui/HudCard';

describe('HudButton', () => {
  test('renders button with accessible name', () => {
    render(<HudButton>Explore Works</HudButton>);
    const button = screen.getByRole('button', { name: /explore works/i });
    expect(button).toBeInTheDocument();
  });

  test('applies primary variant classes by default', () => {
    render(<HudButton>Submit</HudButton>);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveClass('bg-neon-cyan');
  });

  test('respects reduced-motion and focus styles', () => {
    render(<HudButton>Reduced Motion</HudButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('motion-reduce:transition-none');
    expect(button).toHaveClass('focus-visible:outline-2');
  });
});

describe('HudCard', () => {
  test('renders card content correctly', () => {
    render(
      <HudCard>
        <h3>Card Title</h3>
      </HudCard>
    );
    const heading = screen.getByRole('heading', { level: 3, name: /card title/i });
    expect(heading).toBeInTheDocument();
  });

  test('respects reduced-motion classes', () => {
    render(<HudCard data-testid="hud-card">Content</HudCard>);
    const card = screen.getByTestId('hud-card');
    expect(card).toHaveClass('motion-reduce:transition-none');
  });
});
