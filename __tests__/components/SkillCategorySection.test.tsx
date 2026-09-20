import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkillCategorySection } from '@/components/content/SkillCategorySection';
import type { SkillCategory } from '@/lib/types/content';

const category: SkillCategory = {
  name: 'Frontend',
  displayOrder: 0,
  skills: [
    { name: 'React', proficiencyLevel: 'Advanced', iconIdentifier: null, displayOrder: 0 },
    { name: 'TypeScript', proficiencyLevel: 'Intermediate', iconIdentifier: null, displayOrder: 1 },
  ],
};

describe('SkillCategorySection', () => {
  it('renders category name as h2', () => {
    render(<SkillCategorySection category={category} />);
    expect(screen.getByRole('heading', { level: 2, name: /frontend/i })).toBeInTheDocument();
  });

  it('renders all skill names', () => {
    render(<SkillCategorySection category={category} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('renders proficiency levels', () => {
    render(<SkillCategorySection category={category} />);
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });
});
