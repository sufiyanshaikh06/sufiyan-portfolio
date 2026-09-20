import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Experience } from '@/lib/types/content';

vi.mock('@/lib/content', () => ({
  getExperiences: vi.fn(),
  getSeoEntryForRoute: vi.fn().mockReturnValue(null),
}));

import * as content from '@/lib/content';
import ExperiencePage from '@/app/experience/page';

const mockExperiences: Experience[] = [
  {
    organization: 'Acme Corp',
    roleTitle: 'Software Engineer Intern',
    type: 'Internship',
    location: 'Remote',
    startDate: '2023-06-01',
    endDate: '2023-08-31',
    descriptionPoints: ['Built REST APIs.'],
    displayOrder: 0,
  },
];

describe('Experience Page', () => {
  it('renders the page h1', () => {
    vi.mocked(content.getExperiences).mockReturnValue([]);
    render(<ExperiencePage />);
    expect(screen.getByRole('heading', { level: 1, name: /experience/i })).toBeInTheDocument();
  });

  it('renders experience entries when present', () => {
    vi.mocked(content.getExperiences).mockReturnValue(mockExperiences);
    render(<ExperiencePage />);
    expect(screen.getByRole('heading', { level: 3, name: /software engineer intern/i })).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders no entry cards when experiences is empty', () => {
    vi.mocked(content.getExperiences).mockReturnValue([]);
    render(<ExperiencePage />);
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('renders no placeholder text when empty', () => {
    vi.mocked(content.getExperiences).mockReturnValue([]);
    render(<ExperiencePage />);
    expect(screen.queryByText(/no .* published/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
