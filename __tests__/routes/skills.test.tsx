import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { SkillCategory } from '@/lib/types/content';

vi.mock('@/lib/content', () => ({
  getSkillCategories: vi.fn(),
  getSeoEntryForRoute: vi.fn().mockReturnValue(null),
}));

import * as content from '@/lib/content';
import SkillsPage from '@/app/skills/page';

const mockCategories: SkillCategory[] = [
  {
    name: 'Frontend',
    displayOrder: 0,
    skills: [
      { name: 'React', proficiencyLevel: 'Advanced', iconIdentifier: null, displayOrder: 0 },
    ],
  },
  {
    name: 'Backend',
    displayOrder: 1,
    skills: [
      { name: 'Node.js', proficiencyLevel: 'Intermediate', iconIdentifier: null, displayOrder: 0 },
    ],
  },
];

describe('Skills Page', () => {
  it('renders the page h1', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue([]);
    render(<SkillsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /skills/i })).toBeInTheDocument();
  });

  it('renders category sections when skills are present', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue(mockCategories);
    render(<SkillsPage />);
    expect(screen.getByRole('heading', { level: 2, name: /frontend/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /backend/i })).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('renders page without errors when categories array is empty', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue([]);
    render(<SkillsPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('renders no placeholder text when categories is empty', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue([]);
    render(<SkillsPage />);
    expect(screen.queryByText(/no .* published/i)).not.toBeInTheDocument();
  });
});
