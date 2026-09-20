import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as contentModule from '@/lib/content';
import Home from '@/app/page';
import ProjectCaseStudyPage, { generateStaticParams } from '@/app/projects/[slug]/page';

describe('Static Public Routes and Content Mapping', () => {
  it('returns dynamic project slugs for static params', () => {
    const params = generateStaticParams();
    const slugs = contentModule.getPublishedProjectSlugs();
    expect(params).toEqual(slugs.map((slug) => ({ slug })));
    expect(slugs).toContain('integrum');
  });

  it('resolves published projects by slug and returns null for unknown slugs', () => {
    const integrum = contentModule.getProjectBySlug('integrum');
    expect(integrum).not.toBeNull();
    expect(integrum?.slug).toBe('integrum');
    expect(integrum?.title).toBe('Integrum');
    expect(integrum?.category).toBe('Full-Stack');
    expect(integrum?.tier).toBe('featured');

    expect(contentModule.getProjectBySlug('unknown-slug-xyz')).toBeNull();
  });

  it('resolves verified profile for Sufiyan Shaikh', () => {
    const profile = contentModule.getPublishedProfile();
    expect(profile.fullName).toBe('Sufiyan Shaikh');
    expect(profile.headline).toContain('Computer Science Student');
    expect(profile.githubUrl).toBe('https://github.com/sufiyanshaikh06');
  });

  it('renders homepage with semantic landmarks and verified claims', () => {
    render(<Home />);

    // Semantic landmark checks
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');

    // Profile checks
    expect(screen.getByRole('heading', { level: 1, name: /sufiyan shaikh/i })).toBeInTheDocument();

    // Featured project card
    expect(screen.getByRole('heading', { level: 2, name: /featured project/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /integrum/i })).toBeInTheDocument();

    // CTA link to Integrum
    const ctaLinks = screen.getAllByRole('link', { name: /integrum/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute('href', '/projects/integrum');
  });

  it('renders Integrum case study with sections and back link', async () => {
    const jsx = await ProjectCaseStudyPage({ params: Promise.resolve({ slug: 'integrum' }) });
    render(jsx);

    expect(screen.getByRole('heading', { level: 1, name: /integrum/i })).toBeInTheDocument();
    expect(screen.getByText(/case study \/\/ full-stack/i)).toBeInTheDocument();

    // Structured sections
    expect(screen.getByRole('heading', { level: 3, name: /overview/i })).toBeInTheDocument();

    // Back link
    const backLink = screen.getByRole('link', { name: /return to portfolio overview/i });
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('renders summary-only layout cleanly when project has 0 sections', async () => {
    const spy = vi.spyOn(contentModule, 'getProjectBySlug').mockReturnValueOnce({
      slug: 'mini-utility',
      title: 'Mini Utility',
      subtitle: 'CLI Utility',
      category: 'Systems',
      tier: 'mini',
      description: 'A lightweight systems utility script without extended case study sections.',
      problemStatement: null,
      architectureOverview: null,
      keyFeatures: null,
      technologies: ['Bash', 'Python'],
      featuredAsset: null,
      demoUrl: 'https://example.com/demo',
      githubUrl: 'https://github.com/example/repo',
      displayOrder: 99,
      sections: [],
    });

    const jsx = await ProjectCaseStudyPage({ params: Promise.resolve({ slug: 'mini-utility' }) });
    render(jsx);

    expect(screen.getByRole('heading', { level: 1, name: /mini utility/i })).toBeInTheDocument();
    expect(screen.getByText(/a lightweight systems utility/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /case study sections/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /launch live demo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view repository/i })).toBeInTheDocument();

    spy.mockRestore();
  });
});
