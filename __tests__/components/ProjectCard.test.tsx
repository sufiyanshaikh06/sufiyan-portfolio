import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProjectCard } from '@/components/content/ProjectCard';
import type { ProjectCaseStudy } from '@/lib/types/content';

const baseProject: ProjectCaseStudy = {
  slug: 'test-project',
  title: 'Test Project',
  subtitle: 'A subtitle',
  category: 'Full-Stack',
  tier: 'featured',
  description: 'A project description for testing.',
  problemStatement: null,
  architectureOverview: null,
  keyFeatures: null,
  technologies: ['TypeScript', 'Next.js'],
  featuredAsset: null,
  demoUrl: null,
  githubUrl: null,
  displayOrder: 0,
  sections: [],
};

describe('ProjectCard', () => {
  it('renders title as h2', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByRole('heading', { level: 2, name: /test project/i })).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText(/a project description/i)).toBeInTheDocument();
  });

  it('renders all technologies as list items', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
  });

  it('links to /projects/[slug]', () => {
    render(<ProjectCard project={baseProject} />);
    const link = screen.getByRole('link', { name: /view case study/i });
    expect(link).toHaveAttribute('href', '/projects/test-project');
  });

  it('renders subtitle when present', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('A subtitle')).toBeInTheDocument();
  });

  it('does not render subtitle when null', () => {
    render(<ProjectCard project={{ ...baseProject, subtitle: null }} />);
    expect(screen.queryByText('A subtitle')).not.toBeInTheDocument();
  });

  it('renders category and tier badges', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText(/full-stack/i)).toBeInTheDocument();
    expect(screen.getByText(/featured/i)).toBeInTheDocument();
  });
});
