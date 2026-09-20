import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AchievementSection } from '@/components/content/AchievementSection';
import type { Achievement } from '@/lib/types/content';

const entries: Achievement[] = [
  {
    title: 'Hackathon Winner',
    date: '2023-11-01',
    description: 'First place at the 2023 University Hackathon.',
    achievementAsset: null,
  },
  {
    title: "Dean's List",
    date: null,
    description: null,
    achievementAsset: null,
  },
];

describe('AchievementSection', () => {
  it('renders achievement titles as h3', () => {
    render(<AchievementSection entries={entries} />);
    expect(screen.getByRole('heading', { level: 3, name: /hackathon winner/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /dean's list/i })).toBeInTheDocument();
  });

  it('renders time element with dateTime when date is present', () => {
    render(<AchievementSection entries={entries} />);
    const time = document.querySelector('time');
    expect(time).not.toBeNull();
    expect(time!.getAttribute('dateTime')).toBe('2023-11-01');
    expect(time!.textContent).toBe('Nov 2023');
  });

  it('renders description when present', () => {
    render(<AchievementSection entries={entries} />);
    expect(screen.getByText(/first place at the 2023/i)).toBeInTheDocument();
  });

  it('omits time and description when null', () => {
    render(<AchievementSection entries={[entries[1]!]} />);
    expect(document.querySelectorAll('time').length).toBe(0);
    expect(screen.queryByText(/first place/i)).not.toBeInTheDocument();
  });
});
